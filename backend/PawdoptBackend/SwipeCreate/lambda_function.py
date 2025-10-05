import boto3
import json
from datetime import datetime
import uuid

dynamodb = boto3.client('dynamodb')


def respond(err, res=None, statusCode='400'):
    return {
        'statusCode': statusCode if err else '200',
        'body': err if err else json.dumps(res),
        'headers': {
            'Content-Type': 'application/json',
        },
    }

def create_chat_request(adopter_id, shelter_id, dog_id, dog_created_at, created_at, message = ""):
    # Create Request
    table = 'request'
    print('id', dog_id)
    request_id = str(uuid.uuid4())
    insert_item = {
            'request_id': {'S': request_id},
            'created_at': {'S': created_at},
            'adopter_id': {'S': adopter_id},
            'dog_id': {'S': dog_id},
            'dog_created_at': {'S': dog_created_at},
            'shelter_id': {'S': shelter_id},
            'status': {'S': 'pending'},
        }
    if message:
        insert_item['message'] = {'S': message}
    dynamodb.put_item(
        TableName=table,
        Item=insert_item
    )
    new = dynamodb.get_item(
        TableName=table,
        Key={
            'request_id': {'S': request_id},
            'created_at': {'S': created_at}
        }
    ).get('Item')

    print(new)

    return new

def lambda_handler(event, context):
    operation = event['requestContext']['http']['method']
    if operation == 'POST':
        try:
            body = json.loads(event['body'])

            adopter_id = event['requestContext']['authorizer']['jwt']['claims']['sub']
            print('adopterid', adopter_id)
            dog_id = body.get('dogId')
            dog_created_at = body.get('dogCreatedAt')
            shelter_id = body.get('shelterId')
            direction = body.get('direction')

            now = datetime.utcnow().isoformat()

            dogExist = dynamodb.get_item(
                TableName='dog',
                Key={
                    'dog_id': {'S': dog_id},           
                    'created_at': {'S': dog_created_at}
                }
            )

            if event['requestContext']['authorizer']['jwt']['claims']['custom:role'] == 'shelter':
                return respond('Forbidden user', None, 403)

            if dogExist['Item']:
                dynamodb.put_item(
                    TableName='swipe',
                    Item={
                    'adopter_id': {'S': adopter_id},
                    'swiped_at': {'S': now},
                    'dog_id': {'S': dog_id},
                    'dog_created_at': {'S': dog_created_at},
                    'shelter_id': {'S': shelter_id},
                    'direction': {'S': direction}
                    },
                    ConditionExpression='attribute_not_exists(adopter_id) AND attribute_not_exists(swiped_at)'
                )

                res = {
                    "statusCode": 200,
                    "body": json.dumps(dynamodb.get_item(
                        TableName='swipe',
                        Key={
                        'adopter_id': {'S': adopter_id},
                        'swiped_at': {'S': now}
                    })),
                    "headers": {
                        "Content-Type": "application/json"
                    }
                }

                if direction == 'right':
                    # Create chat
                    new_chat = create_chat_request(adopter_id, shelter_id, dog_id, dog_created_at, now)
                    if not new_chat:
                        return respond('Failed to create chat or request', None, 500)

                return respond(None, res)

            else:
                return ("Swipe already exists")

        except Exception as e:
            return respond(str(e), None, 500)

    else:
        return respond('Unsupported method "{}"'.format(operation))
