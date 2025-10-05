import boto3
from math import radians, cos, sin, asin, sqrt
import json
import base64
from boto3.dynamodb.conditions import Key, Attr


# AWS clients
dynamodb = boto3.resource('dynamodb')
cognito = boto3.client('cognito-idp')
s3 = boto3.client('s3', region_name='REGION') # Replace with your Region

DOG_TABLE = "dog"  # DynamoDB dog table name
USER_POOL_ID = "USERPOOLID"  # Cognito User Pool ID
SWIPE_TABLE = "swipe"

def sanitise_output(dog):
    # Change photo keys to photo urls
    if 'photo_key' in dog:
        pk = dog['photo_key']
        presigned_urls = []
        for key in pk:
            presigned_urls.append(s3.generate_presigned_url(
                ClientMethod='get_object',
                Params={'Bucket': 'DOG_BUCKET', 'Key': key}, # Replace with your Dog Bucket
                ExpiresIn=3600
            ))
        dog['photoURLs'] = presigned_urls
        del dog['photo_key']

    dog['id'] = dog['dog_id']
    del dog['dog_id']

    dog['shelterId'] = dog['shelter_id']
    del dog['shelter_id']

    dog['createdAt'] = dog['created_at']
    del dog['created_at']

    dog['age'] = str(dog['age'])

    dog['distance'] = dog['distance_km']
    del dog['distance_km']
    
    return dog

def decode_jwt_payload(token):
    """Simple JWT payload extraction without signature verification"""
    try:
        # Remove 'Bearer ' if present
        if token.startswith('Bearer '):
            token = token[7:]
        
        # Split the token
        parts = token.split('.')
        if len(parts) != 3:
            return None
            
        # Decode the payload (second part)
        payload_b64 = parts[1]
        
        # Add padding if needed
        missing_padding = len(payload_b64) % 4
        if missing_padding:
            payload_b64 += '=' * (4 - missing_padding)
            
        # Decode base64
        payload_bytes = base64.b64decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))
        
        return payload
    except Exception as e:
        print(f"JWT decode error: {str(e)}")
        return None

def extract_user_id(event):
    """Extract user ID from various possible locations in the event"""
    
    print(f"🔍 Event structure: {json.dumps(event, default=str, indent=2)}")
    
    # Method 1: Try to get from API Gateway JWT authorizer claims
    try:
        # For JWT authorizer, claims might be directly in authorizer
        authorizer = event.get("requestContext", {}).get("authorizer", {})
        # Try different claim locations
        if "claims" in authorizer["jwt"]:
            user_id = authorizer["jwt"]["claims"].get("sub")
            if user_id:
                print(f"✅ Found user ID in authorizer claims: {user_id}")
                return user_id
        # JWT authorizer might put claims directly in authorizer
        if "sub" in authorizer:
            user_id = authorizer["sub"]
            print(f"✅ Found user ID directly in authorizer: {user_id}")
            return user_id
            
        print("❌ No claims found in authorizer")
        print(f"Authorizer content: {authorizer}")
        
    except Exception as e:
        print(f"❌ Error accessing authorizer: {str(e)}")
    
    # Method 2: Extract directly from Authorization header (fallback)
    try:
        headers = event.get("headers", {})
        auth_header = headers.get("Authorization") or headers.get("authorization")
        
        if not auth_header:
            print("❌ No Authorization header found")
            print(f"Available headers: {list(headers.keys())}")
            return None
            
        print(f"🔍 Found Authorization header: {auth_header[:50]}...")
        
        # Decode JWT payload
        payload = decode_jwt_payload(auth_header)
        
        if payload:
            user_id = payload.get('sub')
            print(f"✅ Successfully decoded JWT, user ID: {user_id}")
            print(f"Token payload: {json.dumps(payload, indent=2)}")
            return user_id
        else:
            print("❌ Failed to decode JWT token")
            return None
            
    except Exception as e:
        print(f"❌ Error extracting from Authorization header: {str(e)}")
        return None

def haversine(lon1, lat1, lon2, lat2):
    """Calculate the great circle distance in km between two points."""
    try:
        lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * asin(sqrt(a))
        r = 6371  # Earth radius in km
        return c * r
    except Exception as e:
        print(f"Haversine calculation error: {str(e)}")
        return 0

def lambda_handler(event, context):
    print("🐕 NearestDogs Lambda function started")
    
    # CORS headers for all responses
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "3600"
    }
    
    try:
        # Handle preflight OPTIONS request
        if event.get("httpMethod") == "OPTIONS":
            print("📋 Handling OPTIONS request")
            return {
                "statusCode": 200,
                "headers": cors_headers,
                "body": json.dumps({"message": "CORS preflight successful"})
            }
        
        # 1️⃣ Extract adopter ID using multiple methods
        adopter_id = extract_user_id(event)
        
        if not adopter_id:
            print("❌ Failed to extract user ID from any source")
            return {
                "statusCode": 401,
                "headers": cors_headers,
                "body": json.dumps({
                    "error": "Unauthorized - Unable to extract user ID",
                    "debug": {
                        "event_keys": list(event.keys()),
                        "request_context_keys": list(event.get("requestContext", {}).keys()),
                        "headers": list(event.get("headers", {}).keys())
                    }
                })
            }

        print(f"✅ Using adopter ID: {adopter_id}")

        # 2️⃣ Get adopter's lat/lon from Cognito (with fallback for permissions issues)
        adopter_lat, adopter_lon = 51.5074, -0.1278  # Default to London coordinates
        try:
            user = cognito.admin_get_user(UserPoolId=USER_POOL_ID, Username=adopter_id)
            attrs = {a["Name"]: a["Value"] for a in user["UserAttributes"]}
            
            adopter_lat = float(attrs.get("custom:latitude", 51.5074))
            adopter_lon = float(attrs.get("custom:longitude", -0.1278))
            
            print(f"📍 Adopter location from Cognito: lat={adopter_lat}, lon={adopter_lon}")
        except Exception as e:
            print(f"⚠️ Using default location due to Cognito error: {str(e)}")
            print(f"📍 Using default London coordinates: lat={adopter_lat}, lon={adopter_lon}")

        # 3️⃣ Get all dogs from DynamoDB
        try:
            dog_table = dynamodb.Table(DOG_TABLE)
            response = dog_table.scan()
            dogs_data = response.get("Items", [])
            
            print(f"🐕 DynamoDB scan response: {response}")
            print(f"🐕 Found {len(dogs_data)} dogs in database")
            
            if not dogs_data:
                print("📋 No dogs found in database - returning empty array")
                return {
                    "statusCode": 200,
                    "headers": cors_headers,
                    "body": json.dumps({"dogs": []})
                }

            # Log each dog for debugging
            for i, dog in enumerate(dogs_data):
                print(f"🐕 Dog {i+1}: {dog}")
                
        except Exception as e:
            print(f"❌ Error accessing DynamoDB: {str(e)}")
            print(f"❌ DynamoDB error type: {type(e).__name__}")
            import traceback
            print(f"❌ DynamoDB traceback: {traceback.format_exc()}")
            
            # Only use mock data if there's a real DynamoDB error
            print("🧪 Using mock data due to DynamoDB error")
            dogs_data = [
                {
                    "id": "test-dog-1",
                    "name": "Test Dog 1",
                    "breed": "Labrador",
                    "age": 3,
                    "gender": "Male",
                    "description": "A friendly test dog",
                    "shelter_id": "test-shelter-1",
                    "photoUrl": "https://placehold.co/600x400/FFD194/FFF?text=Test+Dog+1"
                },
                {
                    "id": "test-dog-2", 
                    "name": "Test Dog 2",
                    "breed": "Golden Retriever",
                    "age": 2,
                    "gender": "Female",
                    "description": "Another friendly test dog",
                    "shelter_id": "test-shelter-2",
                    "photoUrl": "https://placehold.co/600x400/FFACAC/FFF?text=Test+Dog+2"
                }
            ]

        # 4️⃣ Group dogs by shelter_id
        dogs_by_shelter = {}
        for dog in dogs_data:
            shelter_id = dog.get("shelter_id")
            if shelter_id:
                dogs_by_shelter.setdefault(shelter_id, []).append(dog)

        print(f"🏠 Found dogs from {len(dogs_by_shelter)} shelters")

        # 5️⃣ Get shelter lat/lon from Cognito (with fallbacks for permissions issues)
        shelter_locations = {}
        for shelter_id in dogs_by_shelter.keys():
            try:
                shelter_user = cognito.admin_get_user(UserPoolId=USER_POOL_ID, Username=shelter_id)
                s_attrs = {a["Name"]: a["Value"] for a in shelter_user["UserAttributes"]}
                shelter_lat = float(s_attrs.get("custom:latitude", 51.5074))
                shelter_lon = float(s_attrs.get("custom:longitude", -0.1278))
                shelter_locations[shelter_id] = (shelter_lat, shelter_lon)
                print(f"📍 Shelter {shelter_id} from Cognito: lat={shelter_lat}, lon={shelter_lon}")
            except Exception as e:
                print(f"⚠️ Using default coordinates for shelter {shelter_id} due to error: {str(e)}")
                # Use varied default coordinates around London for testing
                if shelter_id == "test-shelter-1":
                    shelter_locations[shelter_id] = (51.5074, -0.1278)  # London center
                elif shelter_id == "test-shelter-2":
                    shelter_locations[shelter_id] = (51.5155, -0.0922)  # London east
                else:
                    shelter_locations[shelter_id] = (51.4994, -0.1270)  # London south
                
                shelter_lat, shelter_lon = shelter_locations[shelter_id]
                print(f"📍 Using default coordinates for {shelter_id}: lat={shelter_lat}, lon={shelter_lon}")

        # 6️⃣ Attach distances to dogs and ensure required fields
        dogs_with_distance = []
        for shelter_id, dogs in dogs_by_shelter.items():
            shelter_lat, shelter_lon = shelter_locations[shelter_id]
            distance_km = haversine(adopter_lon, adopter_lat, shelter_lon, shelter_lat)
            for dog in dogs:
                dog["distance_km"] = round(distance_km, 2)
                
                print('dog before: ', dog)
                dog = sanitise_output(dog)

                # # Ensure required fields exist for React Native app
                # if not dog.get("photoUrl"):
                #     # Generate placeholder URL if no photoUrl in database
                #     dog_name = dog.get("name", "Dog").replace(" ", "+")
                #     dog["photoUrl"] = f"https://placehold.co/600x400/FFD194/FFF?text={dog_name}"
                print('dog after: ', dog)

                swipe_table = dynamodb.Table(SWIPE_TABLE)
                r = swipe_table.query(
                    KeyConditionExpression=Key('adopter_id').eq(adopter_id),
                    FilterExpression=Attr('dog_id').eq(dog['id']) &
                                    Attr('direction').eq('right')
                )['Items']
                status = dog.get("dog_status")
                if not r and status == 'AVAILABLE':
                    dogs_with_distance.append(dog)

        # 7️⃣ Sort by distance
        dogs_with_distance.sort(key=lambda d: d.get("distance_km", 0))
        
        print(f"✅ Returning {len(dogs_with_distance)} dogs sorted by distance")
        print(dogs_with_distance)

        return {
            "statusCode": 200,
            "headers": cors_headers,
            "body": json.dumps({"dogs": dogs_with_distance})
        }
        
    except Exception as e:
        print(f"❌ Unexpected error in lambda function: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        
        return {
            "statusCode": 500,
            "headers": cors_headers,
            "body": json.dumps({
                "error": "Internal server error", 
                "message": str(e),
                "type": type(e).__name__
            })
        }
