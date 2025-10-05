// A new Lambda function, e.g., adoptersCRUD.js
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require ("@aws-sdk/s3-request-presigner");

const {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
});

const cognito = new CognitoIdentityProviderClient({ region: "REGION" }); // REPLACE with your region
const USER_POOL_ID = "USERPOOLID"; // REPLACE with your Cognito User Pool ID

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
  "Access-Control-Allow-Headers": "*"
};

exports.handler = async (event) => {
  const role = event.requestContext?.authorizer?.jwt?.claims?.["custom:role"];
  console.log("events", event)


  // Expect a list of adopter IDs in the request body
  const body = JSON.parse(event.body || "{}");
  const adopterIds = body.adopterIds;

  if (!adopterIds || !Array.isArray(adopterIds) || adopterIds.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Adopter IDs must be provided." }),
    };
  }

  try {
    const adopterProfiles = [];
    for (const adopterId of adopterIds) {
      const command = new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: adopterId, // Cognito uses the 'sub' as the username for AdminGetUserCommand
      });
      const response = await cognito.send(command);

      // Process the response to extract useful attributes
      const attributes = response.UserAttributes.reduce((acc, attr) => {
        acc[attr.Name] = attr.Value;
        return acc;
      }, {});

      // Photokey to url
      const photoKey = attributes['custom:iconURL']
      console.log("photokey: ", photoKey);

      let downloadUrl = null;

      if (photoKey) {
        const getUrlCommand = new GetObjectCommand({
        Bucket: 'ICON_BUCKET',
        Key: photoKey,
      });
      downloadUrl = await getSignedUrl(s3, getUrlCommand, { expiresIn: 3600 });
      console.log("Download URL:", downloadUrl);
      };

      // Map the Cognito attributes to your AdopterProfile interface
      adopterProfiles.push({
        adopterId: adopterId,
        adopterName: attributes.name,
        email: attributes.email,
        contact: attributes.phone_number,
        address: attributes.address,
        postcode: attributes['custom:postcode'],
        experience: attributes['custom:experience'],
        iconUrl: downloadUrl || 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg',
      });
    }

    console.log("adopterProfiles: ", adopterProfiles);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(adopterProfiles),
    };
  } catch (err) {
    console.error("Error fetching adopter profiles:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to fetch adopter profiles." }),
    };
  }
};