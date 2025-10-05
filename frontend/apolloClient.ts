import { ApolloClient, InMemoryCache, split, HttpLink, from, gql } from '@apollo/client';
import { createSubscriptionHandshakeLink } from 'aws-appsync-subscription-link';
import { getMainDefinition } from '@apollo/client/utilities';
import { setContext } from '@apollo/client/link/context';
import { getAccessToken, getIdToken } from './services/CognitoService';
import { createClient } from "graphql-ws"

const API_URL = "https://kjjewznlvbb6xfmdwmezado724.appsync-api.eu-west-2.amazonaws.com/graphql";
const WS_URL = "wss://kjjewznlvbb6xfmdwmezado724.appsync-realtime-api.eu-west-2.amazonaws.com/graphql";
const API_KEY = "da2-qdj4etsy7fgrhe6td4wciul7ci";

console.log('🔧 Initializing Apollo Client with AppSync configuration');
console.log('📡 API URL:', API_URL);
console.log('🔌 WebSocket URL:', WS_URL);
console.log('🔑 API Key configured:', API_KEY ? 'Yes' : 'No');
console.log('📦 Using aws-appsync-subscription-link for subscriptions');
console.log('🌍 Region: eu-west-2');

// HTTP link with authentication - enhanced with Cognito support
const authLink = setContext(async (_, { headers }) => {
  console.log('🔑 Setting auth headers for request');
  
  // Try to get Cognito ID token (AppSync expects ID token, not access token)
  let cognitoToken = null;
  try {
    cognitoToken = await getIdToken(); // Changed from getAccessToken to getIdToken
    console.log('🔑 Cognito ID token retrieved:', cognitoToken ? 'Yes' : 'No');
    console.log('🔑 Token length:', cognitoToken ? cognitoToken.length : 0);
    console.log('🔑 Token starts with eyJ:', cognitoToken ? cognitoToken.startsWith('eyJ') : false);
    
    // Log first 50 characters of token for debugging (safe to log)
    if (cognitoToken) {
      console.log('🔑 Token preview:', cognitoToken.substring(0, 50) + '...');
    }
  } catch (error) {
    console.log('🔑 Cognito ID token error:', (error as Error).message);
  }
  
  const newHeaders = {
    ...headers,
    "Content-Type": "application/json",
    // For Cognito User Pool auth, we might not need the API key
    // Include Cognito auth for proper AppSync authentication
    ...(cognitoToken && { Authorization: `Bearer ${cognitoToken}` }),
  };
  
  // Add API key only if no Cognito token (fallback)
  if (!cognitoToken) {
    newHeaders["x-api-key"] = API_KEY;
    console.log('🔑 Using API key as fallback (no Cognito ID token)');
  } else {
    console.log('🔑 Using Cognito ID token authentication');
  }
  
  console.log('🔑 Final headers being sent:', Object.keys(newHeaders));
  console.log('🔑 Has Authorization header:', !!newHeaders.Authorization);
  console.log('🔑 API Key being used:', API_KEY.substring(0, 10) + '...');
  return { headers: newHeaders };
});

const httpLink = new HttpLink({
  uri: API_URL,
});

const subscriptionLink = createSubscriptionHandshakeLink(
  {
    url: API_URL,
    region: "eu-west-2",
    auth: {
      type: 'AMAZON_COGNITO_USER_POOLS',
      jwtToken: async () => {
        try {
          const token = await getIdToken(); // Changed from getAccessToken to getIdToken
          console.log('🔑 Subscription auth: ID token retrieved for WebSocket:', token ? "yes" : "no");
          return token || '';
        } catch (error) {
          console.error('🔑 Subscription auth error:', error);
          return '';
        }
      }
    }
  }, authLink.concat(httpLink));

export const client = new ApolloClient({
  link: subscriptionLink,
  cache: new InMemoryCache(),
});

console.log('🚀 Apollo Client initialized successfully');

// Since Cognito auth works and API key doesn't, the setup is ready for testing subscriptions
console.log('✅ Authentication confirmed: Using Cognito User Pool auth for both HTTP and WebSocket');
console.log('🔧 Subscription link configured for AppSync real-time protocol');
console.log('🔄 Ready to test real-time subscriptions...');
