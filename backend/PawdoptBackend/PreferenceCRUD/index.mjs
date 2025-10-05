// Import the necessary modules from the AWS SDK v3
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

// Create a DynamoDB client and wrap it in the DocumentClient for easier data handling
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Define the name of your DynamoDB table
const TABLE_NAME = "preferences"; // Updated to match your table name

/**
 * Main Lambda function handler for managing adopter preferences.
 * This function performs CRUD operations (Create, Read, Update, Delete) based on the HTTP method.
 * @param {object} event The event object from API Gateway.
 * @returns {object} The response object with a status code and body.
 */
export const handler = async (event) => {
    // Log the event to CloudWatch for debugging purposes
    console.log("Received event:", JSON.stringify(event, null, 2));

    try {
        // Extract the user ID (sub) from the JWT claims provided by the API Gateway authorizer.
        // This is a crucial security step to ensure the user can only access their own data.
        const adopter_id = event.requestContext.authorizer.jwt.claims.sub;
        if (!adopter_id) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: "Unauthorized: Adopter ID not found in token." }),
            };
        }

        // Handle the request based on the HTTP method
        switch (event.requestContext.http.method) {
            case "GET":
                // Handle GET request to read a user's preferences
                console.log(`Fetching preferences for adopter_id: ${adopter_id}`);
                const getParams = {
                    TableName: TABLE_NAME,
                    Key: { adopter_id },
                };
                const getResult = await docClient.send(new GetCommand(getParams));

                // If the item exists, return it; otherwise, return an empty object with a 200 OK status.
                // This is a better practice than returning a 404 for a user who hasn't set preferences yet.
                const preferences = getResult.Item || {};
                return {
                    statusCode: 200,
                    body: JSON.stringify(preferences),
                };

            case "POST":
            case "PUT":
                // Handle POST/PUT requests to create or update preferences
                console.log(`Updating preferences for adopter_id: ${adopter_id}`);
                let body;
                try {
                    // Attempt to parse the request body as JSON
                    body = JSON.parse(event.body);
                } catch (parseError) {
                    // Return a 400 Bad Request if the body is not valid JSON
                    console.error("Failed to parse request body:", parseError);
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ message: "Invalid JSON in request body." }),
                    };
                }

                // Prepare the item to be saved in DynamoDB.
                // The AdopterPreferences table stores the preferences for a given adopter_id.
                const putParams = {
                    TableName: TABLE_NAME,
                    Item: {
                        adopter_id: adopter_id,
                        ...body, // Spread the preference data from the request body
                    },
                };
                await docClient.send(new PutCommand(putParams));

                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Preferences saved successfully." }),
                };

            case "DELETE":
                // Handle DELETE request to remove preferences
                console.log(`Deleting preferences for adopter_id: ${adopter_id}`);
                const deleteParams = {
                    TableName: TABLE_NAME,
                    Key: { adopter_id },
                };
                await docClient.send(new DeleteCommand(deleteParams));

                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: "Preferences deleted successfully." }),
                };

            default:
                // Handle any other HTTP method with a 405 Method Not Allowed response
                return {
                    statusCode: 405,
                    body: JSON.stringify({ message: "Method Not Allowed" }),
                };
        }
    } catch (error) {
        // Log the error and return a generic 500 status code to the client
        console.error("DynamoDB operation failed:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error", error: error.message }),
        };
    }
};
