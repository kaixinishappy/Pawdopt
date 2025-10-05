// index.js for UpdateUserAttributesFunction Lambda

const AWS = require('aws-sdk');

exports.handler = async (event) => {
    console.log('Received event for update:', JSON.stringify(event, null, 2));

    const cognito = new AWS.CognitoIdentityServiceProvider({
        region: 'REGION' // Make sure this matches your Cognito region
    });

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (e) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request body.' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    }

    // In a real scenario, you'd extract the username/sub from the JWT token
    // passed in the Authorization header to ensure the user can only update their own attributes.
    // For this example, we'll assume 'email' is the username and it's passed in the body.
    // This is less secure for production, but simpler for initial setup.
    const { email, ...attributesToUpdate } = body; 
    const username = email; 

    if (!username) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'User identifier (email/username) is missing.' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    }

    // Convert the attributes object into the format Cognito expects
    const userAttributes = Object.keys(attributesToUpdate).map(key => ({
        Name: key,
        Value: attributesToUpdate[key],
    }));

    const params = {
        UserPoolId: 'USERPOOLID', // Your User Pool ID
        Username: username, // The user's username
        UserAttributes: userAttributes,
    };

    try {
        await cognito.adminUpdateUserAttributes(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'User attributes updated successfully.' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    } catch (err) {
        console.error('Error updating user attributes:', err);
        let errorMessage = 'Failed to update profile due to an unknown error.';
        if (err.code === 'UserNotFoundException') {
            errorMessage = 'User not found.';
        } else if (err.code === 'NotAuthorizedException') {
            errorMessage = 'Not authorized to perform this action.';
        } else if (err.code === 'InvalidParameterException') {
            errorMessage = `Invalid input: ${err.message}`;
        } else if (err.code === 'UserLambdaValidationException') {
            errorMessage = `Validation error: ${err.message}`;
        }

        return {
            statusCode: 400,
            body: JSON.stringify({ error: errorMessage }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    }
};