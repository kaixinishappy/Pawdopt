import { DynamoDBClient, PutItemCommand, GetItemCommand, ScanCommand, UpdateItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid"; // UUID is not built-in, so add manually if you use layers or bundles

const ddb = new DynamoDBClient({ region: "REGION" });
const TABLE_NAME = "request";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*", // CORS
  "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PATCH,DELETE",
  "Access-Control-Allow-Headers": "*"
};

export const handler = async (event) => {
  console.log("Incoming event:", JSON.stringify(event, null, 2));

  // Handle CORS preflight request
  if (event.requestContext?.http?.method === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  const method = event.requestContext?.http?.method;
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  console.log("Querying for adopter_id:", userId);
  const role = event.requestContext?.authorizer?.jwt?.claims?.["custom:role"];

  try {
    switch (method) {
      case "POST": {
        const body = JSON.parse(event.body || "{}");

        const requestId = uuidv4();
        const createdAt = new Date().toISOString();

        const item = {
          request_id: { S: requestId },
          created_at: { S: createdAt },
          adopter_id: { S: userId },
          dog_id: { S: body.dogId },
          dog_created_at: { S: body.dogCreatedAt },
          shelter_id: { S: body.shelterId },
          status: { S: "pending" }
        };

        await ddb.send(new PutItemCommand({ TableName: TABLE_NAME, Item: item }));

        return { statusCode: 201, headers, body: JSON.stringify({ requestId, createdAt }) };
      }

      case "GET": {
        if (!role || !userId) {
            return { statusCode: 403, headers, body: JSON.stringify({ error: "Unauthorized" }) };
        }

        let filterExpression, expressionValues;

        if (role === "adopter") {
            filterExpression = "adopter_id = :id";
            expressionValues = { ":id": { S: userId } };
        } else if (role === "shelter") {
            filterExpression = "shelter_id = :id";
            expressionValues = { ":id": { S: userId } };
        } else {
            return { statusCode: 403, headers, body: JSON.stringify({ error: "Role not recognized" }) };
        }

        const scanResult = await ddb.send(
            new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: filterExpression,
            ExpressionAttributeValues: expressionValues
            })
        );

        return { statusCode: 200, headers, body: JSON.stringify(scanResult.Items) };
        }

      case "PATCH": {
        const body = JSON.parse(event.body || "{}");

        await ddb.send(
          new UpdateItemCommand({
            TableName: TABLE_NAME,
            Key: {
              request_id: { S: body.requestId },
              created_at: { S: body.createdAt }
            },
            UpdateExpression: "SET #s = :s",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: { ":s": { S: body.status } }
          })
        );

        return { statusCode: 200, headers, body: JSON.stringify({ message: "Status updated" }) };
      }

      case "DELETE": {
        const body = JSON.parse(event.body || "{}");

        await ddb.send(
          new DeleteItemCommand({
            TableName: TABLE_NAME,
            Key: {
              request_id: { S: body.requestId },
              created_at: { S: body.createdAt }
            }
          })
        );

        return { statusCode: 200, headers, body: JSON.stringify({ message: "Request deleted" }) };
      }

      default:
        return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
    }
  } catch (err) {
    console.error("Error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
