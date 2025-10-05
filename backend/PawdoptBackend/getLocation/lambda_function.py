import boto3
import json
import base64
from decimal import Decimal
from boto3.dynamodb.conditions import Key, Attr

# AWS clients
dynamodb = boto3.resource('dynamodb')
cognito = boto3.client('cognito-idp')
s3 = boto3.client('s3', region_name='REGION') # Replace with your Region

DOG_TABLE = "dog"
USER_POOL_ID = "USERPOOLID" # Replace with your User Pool Id

class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder for Decimal objects"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            # Convert decimal to float
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def decode_jwt_payload(token):
    """Simple JWT payload extraction without signature verification"""
    try:
        if token.startswith('Bearer '):
            token = token[7:]
        
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        payload_b64 = parts[1]
        
        missing_padding = len(payload_b64) % 4
        if missing_padding:
            payload_b64 += '=' * (4 - missing_padding)
            
        payload_bytes = base64.b64decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        return payload
    except Exception as e:
        print(f"JWT decode error: {str(e)}")
        return None

def extract_user_id(event):
    """Extract user ID from various possible locations in the event"""
    try:
        authorizer = event.get("requestContext", {}).get("authorizer", {})
        if "claims" in authorizer["jwt"]:
            user_id = authorizer["jwt"]["claims"].get("sub")
            if user_id:
                return user_id
        if "sub" in authorizer:
            user_id = authorizer["sub"]
            if user_id:
                return user_id
    except Exception as e:
        print(f"Error accessing authorizer: {str(e)}")
    
    try:
        headers = event.get("headers", {})
        auth_header = headers.get("Authorization") or headers.get("authorization")
        if not auth_header:
            return None
        payload = decode_jwt_payload(auth_header)
        if payload:
            user_id = payload.get('sub')
            return user_id
        else:
            return None
    except Exception as e:
        print(f"Error extracting from Authorization header: {str(e)}")
        return None

def lambda_handler(event, context):
    print("📍 getDogLocation Lambda function started")
    
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "3600"
    }
    
    try:
        if event.get("httpMethod") == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": cors_headers,
                "body": json.dumps({"message": "CORS preflight successful"})
            }
        
        adopter_id = extract_user_id(event)
        if not adopter_id:
            return {
                "statusCode": 401,
                "headers": cors_headers,
                "body": json.dumps({"error": "Unauthorized - Unable to extract user ID"})
            }

        dog_id = event.get("queryStringParameters", {}).get("dogId")
        dog_created_at = event.get("queryStringParameters", {}).get("dogCreatedAt")

        if not dog_id or not dog_created_at:
            return {
                "statusCode": 400,
                "headers": cors_headers,
                "body": json.dumps({"error": "Missing dogId or dogCreatedAt in query string parameters"})
            }
        
        print(f"DEBUG: Attempting to get dog details for dogId: {dog_id} and dogCreatedAt: {dog_created_at}")

        adopter_details = {}
        try:
            adopter = cognito.admin_get_user(UserPoolId=USER_POOL_ID, Username=adopter_id)
            attrs = {a["Name"]: a["Value"] for a in adopter["UserAttributes"]}
            adopter_details = {
                "latitude": float(attrs.get("custom:latitude", 51.5074)),
                "longitude": float(attrs.get("custom:longitude", -0.1278)),
                "type": "adopter"
            }
        except Exception as e:
            print(f"⚠️ Could not get adopter details from Cognito: {str(e)}")
            adopter_details = {
                "latitude": 51.5074,
                "longitude": -0.1278,
                "type": "adopter"
            }

        dog_details = {}
        shelter_id = None
        try:
            dog_table = dynamodb.Table(DOG_TABLE)
            response = dog_table.get_item(
                Key={
                    "dog_id": dog_id,
                    "created_at": dog_created_at
                }
            )
            
            dog_details = response.get("Item")
            if dog_details:
                shelter_id = dog_details.get("shelter_id")
        except Exception as e:
            print(f"❌ Error accessing DynamoDB for dog {dog_id}: {str(e)}")
            # The Decimal serialization issue can be caught here, so we return a generic 500
            return {
                "statusCode": 500,
                "headers": cors_headers,
                "body": json.dumps({"error": "Internal server error", "message": "Failed to get dog details."})
            }
            
        if not dog_details:
            print(f"❌ Dog details for dogId {dog_id} were not found in the table.")
            return {
                "statusCode": 404,
                "headers": cors_headers,
                "body": json.dumps({"error": "Dog not found", "dogId": dog_id})
            }

        shelter_details = {}
        try:
            if shelter_id:
                shelter = cognito.admin_get_user(UserPoolId=USER_POOL_ID, Username=shelter_id)
                attrs = {a["Name"]: a["Value"] for a in shelter["UserAttributes"]}
                shelter_details = {
                    "latitude": float(attrs.get("custom:latitude", 51.5074)),
                    "longitude": float(attrs.get("custom:longitude", -0.1278)),
                    "type": "shelter"
                }
        except Exception as e:
            print(f"⚠️ Could not get shelter details for {shelter_id} from Cognito: {str(e)}")
            shelter_details = {
                "latitude": 51.5074,
                "longitude": -0.1278,
                "type": "shelter"
            }
        
        # 5️⃣ CORRECTED: Use the custom DecimalEncoder for serialization
        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({
                "adopter": adopter_details,
                "dog": {
                    "dog_id": dog_details.get("dog_id"),
                    "name": dog_details.get("name"),
                    "latitude": shelter_details.get("latitude"),
                    "longitude": shelter_details.get("longitude")
                },
                "shelter": shelter_details
            }, cls=DecimalEncoder) # Pass the custom encoder here
        }
        
    except Exception as e:
        print(f"❌ Unexpected error in lambda function: {str(e)}")
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({
                "error": "Internal server error", 
                "message": str(e)
            })
        }
