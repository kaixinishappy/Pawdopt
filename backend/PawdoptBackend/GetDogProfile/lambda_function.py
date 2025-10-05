import boto3
import json
import base64
from boto3.dynamodb.types import TypeDeserializer
from datetime import datetime
USER_POOL_ID = "USERPOOLID"  # Cognito User Pool ID


dynamo = boto3.client('dynamodb')
cognito = boto3.client('cognito-idp')
s3 = boto3.client('s3')



def respond(err, res=None, status_code = None, next_link = None, count = None):
    headers = {
            'Content-Type': 'application/json',
    }
    body = res
    resp = {
        'statusCode': status_code or ('400' if err else '200'),
        'body': {"message": err} if err else json.dumps(body),
        'headers': headers
    }
    print('resp: ', resp)
    return resp

deserialiser = TypeDeserializer()

def dynamodb_to_dict(dynamo_item):
    return {k: deserialiser.deserialize(v) for k, v in dynamo_item.items()}

def calculate_age(dob):
    today = datetime.now()
    born = datetime.strptime(dob, '%Y/%m')
    age = today.year - born.year - (today.month < (born.month))
    return age

def sanitise_output(dog):
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
    dog['age'] = calculate_age(dog['dob'])
    return dog

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

        dog_id = event['pathParameters']['dogId']
        created_at = event['headers']['x-created-at']

        role = event['requestContext']['authorizer']['jwt']['claims']['custom:role']

        try:
            if role == "adopter" or role == "shelter":
                item = dynamo.get_item(TableName='dog', Key={'dog_id': {'S': dog_id}, 'created_at': {'S': created_at}})['Item']
                
                if not item:
                    return respond('Not found', status_code='404')

                dictdb = dynamodb_to_dict(item)
                print('dictdb before cognito: ', dictdb)

                # Add shelter info
                user = cognito.admin_get_user(UserPoolId=USER_POOL_ID, Username=dictdb['shelter_id'])
                attrs = {a["Name"]: a["Value"] for a in user["UserAttributes"]}
                
                dictdb['shelter_name'] = attrs.get("name")
                dictdb['shelter_email'] = attrs.get("email")
                dictdb['shelter_contact'] = attrs.get("phone_number")
                dictdb['shelter_address'] = attrs.get("address")
                dictdb['shelter_postcode'] = attrs.get("custom:postcode")

                print('dictdb after cognito: ', dictdb)

                return respond(None, sanitise_output(dictdb))

            else:
                return respond('Forbidden user', status_code='403')
    
        except Exception as e:
            return respond(str(e))

    elif operation in ['POST', 'PATCH', 'DELETE', 'OPTION']:
        return respond('Wrong lambda function', status_code='500')
    else:
        return respond(f'Unsupported method {operation}', status_code='500')
