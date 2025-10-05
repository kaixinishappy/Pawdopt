// A new Lambda function, e.g., chatsCRUD.js
const { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require("uuid");

const ddb = new DynamoDBClient({ region: "REGION" });
const TABLE_NAME = "chat";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PATCH",
  "Access-Control-Allow-Headers": "*"
};

// Function to update a chat
async function updateChat(chatId, updates) {
  if (!chatId || !updates || Object.keys(updates).length === 0) {
    throw new Error("chatId and updates are required");
  }

  const updateExpressionParts = [];
  const expressionAttributeValues = {};
  const expressionAttributeNames = {};

  Object.keys(updates).forEach((key) => {
    const attrName = `#${key}`;
    const attrValue = `:${key}`;
    expressionAttributeNames[attrName] = key;
    expressionAttributeValues[attrValue] = { S: updates[key] };
    updateExpressionParts.push(`${attrName} = ${attrValue}`);
  });

  const updateExpression = "SET " + updateExpressionParts.join(", ");

  const command = new UpdateItemCommand({
    TableName: TABLE_NAME,
    Key: { chat_id: { S: chatId } },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW"
  });

  const result = await ddb.send(command);
  return result.Attributes;
}

async function updateChatStatus(payload) {
  if (!payload) throw new Error("Payload is required");

  const { adopter_id, dog_id } = JSON.parse(payload.toString());

  if (!adopter_id || !dog_id) {
    throw new Error("adopter_id and dog_id are required in the payload");
  }

  // 1. Find all chats for this dog where adopter_id != payload.adopter_id
  const scanParams = {
    TableName: TABLE_NAME,
    FilterExpression: "dog_id = :dogId AND adopter_id <> :adopterId",
    ExpressionAttributeValues: {
      ":dogId": { S: dog_id },
      ":adopterId": { S: adopter_id }
    },
    ProjectionExpression: "chat_id"
  };

  const scanResult = await ddb.send(new ScanCommand(scanParams));
  const chatIds = (scanResult.Items || []).map(item => item.chat_id.S);

  console.log("Chats to update:", chatIds);

  // 2. Loop through chatIds and update status to 'inactive'
  for (const chatId of chatIds) {
    const updateParams = {
      TableName: TABLE_NAME,
      Key: { chat_id: { S: chatId } },
      UpdateExpression: "SET #status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": { S: "inactive" } },
      ReturnValues: "ALL_NEW"
    };

    const updateResult = await ddb.send(new UpdateItemCommand(updateParams));
    console.log(`Updated chat ${chatId}:`, updateResult.Attributes);
  }

  return { updatedChats: chatIds };
}

exports.handler = async (event) => {
  console.log("Incoming chat event:", JSON.stringify(event, null, 2));

  try{
    if (event.requestContext?.http?.method) {
      const method = event.requestContext?.http?.method;
      const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
      const role = event.requestContext?.authorizer?.jwt?.claims?.["custom:role"];
    
      if (!userId || !role) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: "Unauthorized" }) };
      }
    
      try {
        switch (method) {
          case "POST": {
            const body = JSON.parse(event.body || "{}");
            const { adopterId, dogId, dogCreatedAt } = body;
    
            if (role !== "shelter" || !adopterId || !dogId) {
              return { statusCode: 403, headers, body: JSON.stringify({ error: "Access denied or missing required parameters." }) };
            }
    
            const chatId = uuidv4();
    
            const item = {
              chat_id: { S: chatId },
              adopter_id: { S: adopterId },
              shelter_id: { S: userId },
              dog_id: { S: dogId },
              dog_created_at: { S: dogCreatedAt },
              status: { S: "active" },
              created_at: { S: new Date().toISOString() } // We'll keep this as a regular attribute
            };
    
            await ddb.send(new PutItemCommand({ TableName: TABLE_NAME, Item: item }));
    
            return { statusCode: 201, headers, body: JSON.stringify({ chatId }) };
          }
    
          case "GET": {
            const { chatId } = event.queryStringParameters || {};
      
            // If no chatId provided, list all chats for the user
            if (!chatId) {
              const { ScanCommand } = require("@aws-sdk/client-dynamodb");
              
              const scanParams = {
                TableName: TABLE_NAME,
                FilterExpression: role === "adopter" 
                  ? "adopter_id = :userId" 
                  : "shelter_id = :userId",
                ExpressionAttributeValues: {
                  ":userId": { S: userId }
                }
              };
              
              const result = await ddb.send(new ScanCommand(scanParams));
              
              // Convert DynamoDB format to frontend-friendly format
              const chats = result.Items?.map(item => ({
                chatId: item.chat_id?.S,
                adopterId: item.adopter_id?.S,
                shelterId: item.shelter_id?.S,
                dogId: item.dog_id?.S,
                dogCreatedAt: item.dog_created_at?.S,
                status: item.status?.S,
                createdAt: item.created_at?.S
              })) || [];
              
              return { 
                statusCode: 200, 
                headers, 
                body: JSON.stringify({ chats }) 
              };
            }
    
            const getParams = {
                TableName: TABLE_NAME,
                Key: {
                    chat_id: { S: chatId }
                }
            };
    
            const result = await ddb.send(new GetItemCommand(getParams));
    
            if (!result.Item) {
                return { statusCode: 404, headers, body: JSON.stringify({ error: "Chat not found." }) };
            }
    
            return { statusCode: 200, headers, body: JSON.stringify(result.Item) };
          }
    
          case "OPTIONS": {
            return { statusCode: 200, headers };
          }
    
          default:
            return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
        }
      } catch (err) {
        console.error("Error:", err);
        return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
      }
    }
    else {
      console.log("Detected programmatic invocation");
      if (!event.action || !event.payload) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing action or payload" }) };
      }

      switch (event.action) {
        case "updateChatStatus":
          const result = await updateChatStatus(JSON.stringify(event.payload));
          return { statusCode: 200, body: JSON.stringify(result) };

        default:
          return { statusCode: 400, body: JSON.stringify({ error: "Unknown action" }) };
      }
    }
  } catch (err) {
    console.error("Error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};

// Export the update function so it can be imported in another Lambda
module.exports = {
  handler: exports.handler,
};
