import boto3
import json

print('Loading function')
dynamo = boto3.resource('dynamodb')
s3 = boto3.client('s3')
table = dynamo.Table('dog')
swipe_table = dynamo.Table('swipe')
request_table = dynamo.Table('request')
chat_table = dynamo.Table('chat')

def respond(err=None):
    return {
        'statusCode': '400' if err else '204',
        'body': str(err) if err else None,
    }

def delete_related_items(table, dog_id, key_names):
    """
    Delete all items from a table that reference a dog_id using a GSI.
    
    table: DynamoDB Table resource
    index_name: GSI name where dog_id is the partition key
    dog_id: ID of the dog to match
    key_names: list of PK/SK attribute names required to delete from the base table
    """
    resp = table.query(
        IndexName="dog_id-index",
        KeyConditionExpression=Key("dog_id").eq(dog_id)
    )
    items = resp.get("Items", [])
    with table.batch_writer() as batch:
        for item in items:
            key_dict = {k: item[k] for k in key_names}
            batch.delete_item(Key=key_dict)

def lambda_handler(event, context):
    operation = event['requestContext']['http']['method']
    if operation == 'DELETE':
        # Authorise
        headers = event['headers']
        auth_header = headers['authorization']
        if not auth_header:
            return respond('Not authorised', status_code='401')
        token = auth_header.split(' ')[1]        

        # Get dog id and createdAt
        dog_id = event['pathParameters']['dogId']
        created_at = event['headers']['x-created-at']

        role = event['requestContext']['authorizer']['jwt']['claims']['custom:role']

        if role == "shelter":
            item = table.get_item(Key={'dog_id': dog_id, 'created_at': created_at})['Item']
            if not item:
                return respond('Dog not found', status_code='404')
            elif item['shelter_id'] != event['requestContext']['authorizer']['jwt']['claims']['sub']:
                return respond('Forbidden user', status_code='403')
            keys = item['photo_key']
            for key in keys:
                s3.delete_object(Bucket='DOG_BUCKET', Key=key) # Replace with your bucket
            table.delete_item(Key={'dog_id': dog_id, 'created_at': created_at})
            delete_related_items(chat_table, dog_id, ["chat_id"])
            delete_related_items(request_table, dog_id, ["request_id", "created_at"])
            delete_related_items(swipe_table, dog_id, ["adopter_id", "swiped_at"])

            return respond()

        else:
            return respond('Forbidden user', status_code='403')
            
    elif operation == 'POST' or operation == 'GET' or operation == 'PATCH':
        return respond(ValueError('Wrong operation'.format(operation)))
    else:
        return respond(ValueError('Unsupported method "{}"'.format(operation)))
