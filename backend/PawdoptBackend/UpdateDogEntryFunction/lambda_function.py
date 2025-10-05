import boto3
import os
import json
from datetime import datetime
from boto3.dynamodb.conditions import Key
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
TABLE_NAME = 'dog'
lambda_client = boto3.client('lambda')


# Add this helper function to convert Decimals
def convert_decimals(obj):
    if isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_decimals(value) for key, value in obj.items()}
    elif isinstance(obj, Decimal):
        # Convert Decimal to int if it's a whole number, otherwise float
        return int(obj) if obj % 1 == 0 else float(obj)
    else:
        return obj

def lambda_handler(event, context):
    try:
        print("Event received:", json.dumps(event)[:500])
        
        # Extract dog_id from path parameters
        dog_id = event['pathParameters']['dogId']
        if not dog_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "dogId is required in path"})
            }
        
        # Parse request body
        body = json.loads(event['body'])
        print("Request body:", json.dumps(body, indent=2))
        
        # Extract user ID from JWT token
        uploader_id = event['requestContext']['authorizer']['jwt']['claims']['sub']
        
        table = dynamodb.Table(TABLE_NAME)
        
        # First, check if the dog exists and belongs to this user
        response = table.query(
            KeyConditionExpression=Key('dog_id').eq(dog_id)
        )
        items = response.get('Items', [])
        
        if not items:
            return {
                "statusCode": 404,
                "body": json.dumps({"error": f"Dog with ID {dog_id} not found"})
            }
        
        existing_dog = items[0]
        
        # Verify ownership
        if existing_dog.get('shelter_id') != uploader_id:
            return {
                "statusCode": 403,
                "body": json.dumps({"error": "You don't have permission to update this dog"})
            }
        
        # Build update expression dynamically based on provided fields
        update_expression_parts = []
        expression_attribute_names = {}
        expression_attribute_values = {}
        
        # Map of frontend field names to DynamoDB field names
        field_mapping = {
            'name': 'name',
            'age': 'age',
            'dob': 'dob',  # Add dob to the mapping
            'breed': 'breed', 
            'gender': 'gender',
            'color': 'color',
            'size': 'size',
            'description': 'description',
            'photoKeys': 'photo_key',
            'dogStatus': 'dog_status',
            'adopterId': 'adopter_id'
        }
        
        # Build the update expression
        for frontend_field, db_field in field_mapping.items():
            if frontend_field in body and body[frontend_field] is not None:
                # Handle reserved keywords (like 'name')
                if db_field in ['name', 'size']:
                    attr_name = f"#{db_field}"
                    expression_attribute_names[attr_name] = db_field
                    update_expression_parts.append(f"{attr_name} = :{db_field}")
                else:
                    update_expression_parts.append(f"{db_field} = :{db_field}")
                
                expression_attribute_values[f":{db_field}"] = body[frontend_field]
        
        # Add updated timestamp
        update_expression_parts.append("updated_at = :updated_at")
        expression_attribute_values[":updated_at"] = datetime.utcnow().isoformat()
        
        if not update_expression_parts:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "No valid fields provided for update"})
            }
        
        # Construct the full update expression
        update_expression = "SET " + ", ".join(update_expression_parts)
        
        print("Update expression:", update_expression)
        print("Expression attribute names:", expression_attribute_names)
        print("Expression attribute values:", expression_attribute_values)
        
        # Perform the update
        update_params = {
            'Key': {
                'dog_id': dog_id, 
                'created_at': existing_dog['created_at']
            },
            'UpdateExpression': update_expression,
            'ExpressionAttributeValues': expression_attribute_values,
            'ReturnValues': 'ALL_NEW'
        }
        
        # Add attribute names if we have any
        if expression_attribute_names:
            update_params['ExpressionAttributeNames'] = expression_attribute_names
        
        update_response = table.update_item(**update_params)
        
        updated_item = update_response['Attributes']
        
        # Convert Decimals before JSON serialization
        updated_item = convert_decimals(updated_item)
        
        # Format response to match API schema
        response_data = {
            "id": updated_item.get('dog_id'),
            "name": updated_item.get('name'),
            "age": updated_item.get('age'),
            "dob": updated_item.get('dob'),  
            "breed": updated_item.get('breed'),
            "gender": updated_item.get('gender'),
            "color": updated_item.get('color'),
            "size": updated_item.get('size'),
            "photoKeys": updated_item.get('photo_key', []),
            "description": updated_item.get('description'),
            "createdAt": updated_item.get('created_at'),
            "updatedAt": updated_item.get('updated_at'),
            "status": updated_item.get('dog_status', 'available'),
            "shelter": {
                "shelterId": updated_item.get('shelter_id'),
                # Add other shelter fields as needed
            }
        }

        if response_data['status'] == 'ADOPTED':
            adopter_id = updated_item.get('adopter_id')
            payload = {
                "action": "updateChatStatus",
                "payload": {
                    "adopter_id": adopter_id,
                    "dog_id": response_data["id"]
                }   
            }
            response = lambda_client.invoke(
            FunctionName="chatCRUD",
            InvocationType="RequestResponse",   # synchronous call
            Payload=json.dumps(payload).encode()
            )
            response_payload = json.loads(response['Payload'].read().decode())
            print("Response from updateChatFunction:", response_payload)


        
        return {
            "statusCode": 200,
            "body": json.dumps(response_data),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "PATCH,OPTIONS"
            }
        }
        
    except json.JSONDecodeError as e:
        print("JSON decode error:", str(e))
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Invalid JSON in request body"})
        }
    except KeyError as e:
        print("Missing required field:", str(e))
        return {
            "statusCode": 400,
            "body": json.dumps({"error": f"Missing required field: {str(e)}"})
        }
    except Exception as e:
        print("Exception:", str(e))
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
            "headers": {
                "Content-Type": "application/json"
            }
        }