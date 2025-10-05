import boto3
import os
import json
import uuid
from datetime import datetime
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
TABLE_NAME = 'dog'

def lambda_handler(event, context):
    try:
        print("Event received:", json.dumps(event)[:500])

        body = json.loads(event['body'])

        dog_id = body.get('dog_id', str(uuid.uuid4()))
        name = body.get('name')
        age = body.get('age')
        dob = body.get('dob')
        breed = body.get('breed')
        gender = body.get('gender')
        color = body.get('color')
        size = body.get('size')
        description = body.get('description')
        dog_status = body.get('dog_status', 'available')
        photo_keys = body.get('photo_keys', [])

        uploader_id = event['requestContext']['authorizer']['jwt']['claims']['sub']
        now = datetime.utcnow().isoformat()

        table = dynamodb.Table(TABLE_NAME)

        # Check if entry exists
        response = table.query(
            KeyConditionExpression=Key('dog_id').eq(dog_id)
        )
        items = response.get('Items', [])

        if items:
            created_at = items[0]['created_at']
            existing_photos = items[0].get('photo_key', [])
            if isinstance(existing_photos, str):
                existing_photos = [existing_photos]

            table.update_item(
                Key={'dog_id': dog_id, 'created_at': created_at},
                UpdateExpression="SET photo_key = :photos",
                ExpressionAttributeValues={':photos': existing_photos + photo_keys}
            )
            message = f"Updated dog with {len(photo_keys)} new image(s)."
        else:
            table.put_item(Item={
                'dog_id': dog_id,
                'created_at': now,
                'name': name,
                'age': age,
                'dob': dob,
                'breed': breed,
                'gender': gender,
                'color': color,
                'size': size,
                'description': description,
                'dog_status': dog_status,
                'photo_key': photo_keys,
                'shelter_id': uploader_id
            })
            message = f"Created dog with {len(photo_keys)} image(s)."

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": message,
                "dog_id": dog_id,
                "photo_keys": photo_keys
            }),
            "headers": {
                "Content-Type": "application/json"
            }
        }

    except Exception as e:
        print("Exception:", str(e))
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
