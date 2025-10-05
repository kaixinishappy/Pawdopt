// CommonJS version for Node.js 22.x using AWS SDK v2
const AWS = require('aws-sdk');

exports.handler = async (event) => {
    console.log('=== COMPLETE EVENT DEBUG ===');
    console.log(JSON.stringify(event, null, 2));
    console.log('=== END DEBUG ===');
    
    // Handle both API Gateway v1.0 (REST API) and v2.0 (HTTP API) formats
    const httpMethod = event.httpMethod || event.requestContext?.http?.method || 'POST';
    console.log('Detected HTTP Method:', httpMethod);
    
    // Handle CORS preflight FIRST - before any body parsing or validation
    if (httpMethod === 'OPTIONS') {
        console.log('Handling OPTIONS preflight request');
        
        // For HTTP API v2.0, headers might need to be handled differently
        const corsResponse = {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({ message: 'CORS preflight successful' })
        };
        
        console.log('CORS Response:', JSON.stringify(corsResponse, null, 2));
        return corsResponse;
    }
    
    try {
        // Parse the request body - handle multiple formats
        let body = {};
        
        console.log('Raw event body:', event.body);
        console.log('Event body type:', typeof event.body);
        console.log('Event body is null:', event.body === null);
        console.log('Event body is empty string:', event.body === '');
        console.log('Event isBase64Encoded:', event.isBase64Encoded);
        
        if (event.body) {
            try {
                // Handle base64 encoded body
                if (event.isBase64Encoded) {
                    const decodedBody = Buffer.from(event.body, 'base64').toString('utf-8');
                    console.log('Decoded base64 body:', decodedBody);
                    body = JSON.parse(decodedBody);
                } else if (typeof event.body === 'string') {
                    body = JSON.parse(event.body);
                } else {
                    body = event.body;
                }
                console.log('Parsed body successfully:', body);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.error('Failed to parse body:', event.body);
                return {
                    statusCode: 400,
                    headers: corsHeaders(),
                    body: JSON.stringify({ 
                        error: 'Invalid JSON in request body',
                        receivedBody: event.body,
                        bodyType: typeof event.body,
                        parseError: parseError.message
                    })
                };
            }
        } else {
            // Check if body data is elsewhere in the event
            console.log('Checking for body data in other event properties...');
            
            // Sometimes the body is directly in the event object
            if (event.email && event.password) {
                console.log('Found email/password directly in event');
                body = { email: event.email, password: event.password };
            } else {
                console.log('No body found anywhere in event');
                console.log('Event keys:', Object.keys(event));
                console.log('Event values preview:', JSON.stringify(event, null, 2).substring(0, 1000));
                
                return {
                    statusCode: 400,
                    headers: corsHeaders(),
                    body: JSON.stringify({ 
                        error: 'Request body is required',
                        debug: {
                            eventKeys: Object.keys(event),
                            httpMethod: event.httpMethod,
                            headers: event.headers,
                            bodyReceived: event.body,
                            bodyType: typeof event.body,
                            hasEmail: !!event.email,
                            hasPassword: !!event.password
                        }
                    })
                };
            }
        }

        const { email, password } = body;

        if (!email || !password) {
            return {
                statusCode: 400,
                headers: corsHeaders(),
                body: JSON.stringify({ 
                    error: 'Email and password are required',
                    received: { email: !!email, password: !!password }
                })
            };
        }

        // Initialize Cognito using AWS SDK v2 (more reliable in Lambda)
        const cognito = new AWS.CognitoIdentityServiceProvider({
            region: 'REGION' // Replace with your Region
        });

        // Cognito authentication parameters
        const params = {
            AuthFlow: 'ADMIN_NO_SRP_AUTH',
            UserPoolId: 'USERPOOLID', // Replace with your User Pool Id
            ClientId: 'CLIENTID', // Replace with your Client Id
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password
            }
        };

        console.log('Attempting Cognito auth for:', email);
        
        const authResult = await cognito.adminInitiateAuth(params).promise();

        if (!authResult.AuthenticationResult) {
            throw new Error('No authentication result returned');
        }

        console.log('Authentication successful');

        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: JSON.stringify({
                idToken: authResult.AuthenticationResult.IdToken,
                accessToken: authResult.AuthenticationResult.AccessToken,
                refreshToken: authResult.AuthenticationResult.RefreshToken
            })
        };

    } catch (error) {
        console.error('Lambda error:', error);
        
        let errorMessage = 'Login failed';
        let statusCode = 500;

        if (error.code === 'UserNotFoundException' || error.code === 'NotAuthorizedException') {
            errorMessage = 'Invalid username or password';
            statusCode = 401;
        } else if (error.code === 'UserNotConfirmedException') {
            errorMessage = 'User account not confirmed';
            statusCode = 400;
        }

        return {
            statusCode: statusCode,
            headers: corsHeaders(),
            body: JSON.stringify({ 
                error: errorMessage,
                details: error.message
            })
        };
    }
};

function corsHeaders() {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,Accept,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        "Access-Control-Max-Age": "86400"
    };
    
    console.log('Generated CORS headers:', JSON.stringify(headers, null, 2));
    return headers;
}
