// index.js for RefreshSessionFunction Lambda

const AWS = require('aws-sdk');

exports.handler = async (event) => {
    console.log('Received event for session refresh:', JSON.stringify(event, null, 2));

    const cognito = new AWS.CognitoIdentityServiceProvider({
        region: 'REGION' // Your Cognito region
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

    const { refreshToken } = body;

    if (!refreshToken) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Refresh token is missing.' }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    }

    const params = {
        AuthFlow: 'REFRESH_TOKEN_AUTH', // Use the REFRESH_TOKEN_AUTH flow
        UserPoolId: 'USERPOOLID',
        ClientId: 'CLIENTID',
        AuthParameters: {
            REFRESH_TOKEN: refreshToken,
        },
    };

    try {
        const authResult = await cognito.adminInitiateAuth(params).promise();

        if (!authResult.AuthenticationResult) {
            throw new Error("Session refresh failed: No authentication result.");
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                idToken: authResult.AuthenticationResult.IdToken,
                accessToken: authResult.AuthenticationResult.AccessToken,
                // Refresh token is usually not returned here, as it's typically long-lived.
                // If Cognito returns a new one and you want to update it, add it here.
                // refreshToken: authResult.AuthenticationResult.RefreshToken, 
            }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };

    } catch (err) {
        console.error('Cognito session refresh error:', err);
        let errorMessage = 'Session refresh failed due to an unknown error.';
        if (err.code === 'NotAuthorizedException') {
            errorMessage = 'Refresh token is invalid or expired. Please log in again.';
        } else if (err.code === 'UserNotFoundException') {
            errorMessage = 'User not found.';
        }

        return {
            statusCode: 401, // Use 401 for unauthorized/invalid token
            body: JSON.stringify({ error: errorMessage }),
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        };
    }
};
