import json

def lambda_handler(event, context):
    # Create chat
    table = 'chat'
    response = dynamodb.query(
        TableName=table,
        IndexName='adopter_shelter_index',
        KeyConditionExpression='adopter_id = :adopter_id AND shelter_id = :shelter_id',
        ExpressionAttributeValues={
            ':adopter_id': {'S': adopter_id},
            ':shelter_id': {'S': shelter_id}
        }
    )

    items = response['Items']
    if items and len(items) == 1:
        items = items[0]
        dog_ids = items['dog_ids']['L']
        dog_ids.append({'S': dog_id})
        dog_created_ats = items['dog_created_ats']['L']
        dog_created_ats.append({'S': dog_created_at})
        chat_id = items['chat_id']['S']
        new = dynamodb.update_item(
            TableName=table,
            Key={
                'chat_id': {'S': chat_id}
            },
            UpdateExpression="set dog_ids=:dogs, dog_created_ats=:dcas",
            ExpressionAttributeValues={
                ':dogs': {'L': dog_ids},
                ':dcas': {'L': dog_created_ats}
            },
            ReturnValues="ALL_NEW"
        )
    else:
        chat_id = str(uuid.uuid4())
        dynamodb.put_item(
            TableName=table,
            Item={
                'chat_id': {'S': chat_id},
                'adopter_id': {'S': adopter_id},
                'shelter_id': {'S': shelter_id},
                'dog_ids': {'L': [{'S': dog_id}]},
                'dog_created_ats': {'L': [{'S': dog_created_at}]},            
            }
        )
        new = dynamodb.get_item(
            TableName=table,
            Key={
                'chat_id': {'S': chat_id}
            }
        )['Item']


    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
    }
