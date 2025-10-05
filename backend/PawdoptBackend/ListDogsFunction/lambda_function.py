import boto3
import json
import base64
from boto3.dynamodb.types import TypeDeserializer
from datetime import datetime

dynamo = boto3.client('dynamodb')
s3 = boto3.client('s3')



def respond(err, res=None, status_code = None, next_link = None, count = None):
    headers = {
            'Content-Type': 'application/json',
    }
    if next_link:
        headers['x-next'] = next_link
    body = {"dogs": res}
    if count:
        body["total"] = count
    resp = {
        'statusCode': status_code or ('400' if err else '200'),
        'body': {"message": err} if err else json.dumps(body),
        'headers': headers
    }
    print(resp)
    return resp

deserialiser = TypeDeserializer()

def dynamodb_to_dict(dynamo_item):
    return {k: deserialiser.deserialize(v) for k, v in dynamo_item.items()}

def calculate_age(dob):
    today = datetime.now()
    born = datetime.strptime(dob, '%Y/%m')
    age = today.year - born.year - (today.month < (born.month))
    return age

def sanitise_output(dogarr):
    for item in dogarr:
        if 'photo_key' in item:
            pk = item['photo_key']
            presigned_urls = []
            for key in pk:
                presigned_urls.append(s3.generate_presigned_url(
                    ClientMethod='get_object',
                    Params={'Bucket': 'DOG_BUCKET', 'Key': key}, # Replace with your Dog Bucket
                    ExpiresIn=3600
                ))
            item['photoURLs'] = presigned_urls
            del item['photo_key']
        item['age'] = calculate_age(item['dob'])  # might be wrong pls check
    return dogarr

def lambda_handler(event, context):
    operation = event['requestContext']['http']['method']
    if operation == 'GET':
        # Authorise
        headers = event['headers']
        print(event)
        auth_header = headers['authorization']
        if not auth_header:
            return respond('Not authorised', status_code='401')
        token = auth_header.split(' ')[1]        

        # Page and limit
        params = event.get('queryStringParameters') or {}
        page = params.get('page')  # cursor-based/offset-based, dynamo doesnt support offset-based
        limit = params.get('limit')

        role = event['requestContext']['authorizer']['jwt']['claims']['custom:role']

        try:
            next_tok = headers.get('x-next')
            start_key = None
            if next_tok:
                start_key = json.loads(base64.b64decode(next_tok))

            if role == "shelter":

                scan_kwargs = {
                    'TableName': 'dog',
                    'FilterExpression': 'shelter_id = :shelter_id',
                    'ExpressionAttributeValues': {':shelter_id': {'S': event['requestContext']['authorizer']['jwt']['claims']['sub']}},
                }

                if start_key:
                    scan_kwargs['ExclusiveStartKey'] = start_key

                if limit:
                    scan_kwargs['Limit'] = int(limit)

                print(scan_kwargs)
                response = dynamo.scan(**scan_kwargs)

                items = response['Items']

                xnext = None
                if 'Items' not in response:
                    return respond('Dog not found', status_code='404')
                elif 'LastEvaluatedKey' in response:
                    xnext = base64.b64encode(json.dumps(response['LastEvaluatedKey']).encode()).decode()
                
                dictdb = [dynamodb_to_dict(r) for r in items]

                return respond(None, sanitise_output(dictdb), next_link = xnext)

            # elif role == "adopter":
            #     adopter_id = event['requestContext']['authorizer']['jwt']['claims']['sub']
            #     if page and limit:
            #         page = int(page)
            #         limit = int(limit)

            #         dog_items = dynamo.get_item(
            #             TableName='swipe_dogs',
            #             Key={
            #                 'adopter_id': {'S': adopter_id}
            #             },
            #             ProjectionExpression='dog_ids, dog_created_ats, #c',
            #             ExpressionAttributeNames={'#c': 'count'}
            #         ).get('Item')

            #         if not dog_items:
            #             # Filter dogs and store in swipe_dogs if page = 1, return as a list of dog_ids and compare with orig list...
            #             # For now its all dogs available
            #             response = dynamo.scan(
            #                 TableName='dog',
            #                 ProjectionExpression='dog_id, created_at'
            #             )
            #             dog_ids = [item['dog_id'] for item in response['Items']]
            #             count = len(dog_ids)
            #             dog_created_ats = [item['created_at'] for item in response['Items']]
            #             dog_items = {
            #                 'dog_ids': {'L': dog_ids},
            #                 'dog_created_ats': {'L': dog_created_ats},
            #                 'count': {'N': count}
            #             }

            #             dynamo.put_item(
            #                 TableName='swipe_dogs',
            #                 Item={
            #                     'adopter_id': {'S': adopter_id},
            #                     'dog_ids': {'L': dog_ids},
            #                     'dog_created_ats': {'L': dog_created_ats},
            #                     'count': {'N': str(count)},
            #                     'ttl': {'N': event['requestContext']['authorizer']['jwt']['claims']['exp']}
            #                 }
            #             )
            #         else:
            #             dog_ids = dog_items['dog_ids']['L']
            #             dog_created_ats = dog_items['dog_created_ats']['L']
            #             count = dog_items['count']['N']

            #         dogs = []
            #         for i in range (limit*page, limit*(page+1)):
            #             if i >= int(count):
            #                 break
            #             dog = dynamo.get_item(
            #                 TableName='dog',
            #                 Key={
            #                     'dog_id': dog_ids[i],
            #                     'created_at': dog_created_ats[i]
            #                 }
            #             )
            #             dogitem = dog['Item']
            #             dogs.append(dogitem)
            #         dognew = [dynamodb_to_dict(d) for d in dogs]
            #         sanitised = sanitise_output(dognew)
            #         return respond(None, sanitised, count = count)
                #else:
                    # Adopter wish list

            else:
                return respond('Forbidden user', status_code='403')
    
        except Exception as e:
            return respond(str(e))
    elif operation in ['POST', 'PATCH', 'DELETE']:
        return respond('Wrong lambda function', status_code='500')
    else:
        return respond(f'Unsupported method {operation}', status_code='500')
