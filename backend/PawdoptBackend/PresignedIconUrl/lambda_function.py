import boto3
import os
import json
import uuid

s3 = boto3.client('s3')
BUCKET_NAME = 'ICON_BUCKET' # Replace with your Icon Bucket

def lambda_handler(event, context):
    try:
        print("Event received:", json.dumps(event)[:300])

        body = json.loads(event['body'])
        count = int(body.get('count', 1))

        uploader_id = event['requestContext']['authorizer']['jwt']['claims']['sub']

        uploadUrls = []
        keys = []

        for i in range(count):
            unique_filename = f"{uuid.uuid4()}.jpg"
            key = f"{uploader_id}/{unique_filename}"
            presigned_url = s3.generate_presigned_url(
                'put_object',
                Params={'Bucket': BUCKET_NAME, 'Key': key, 'ContentType': 'image/jpeg'},
                ExpiresIn=300  # URL valid for 5 minutes
            )
            uploadUrls.append(presigned_url)
            keys.append(key)

        return {
            "statusCode": 200,
            "body": json.dumps({
                "uploadUrls": uploadUrls,
                "keys": keys
            }),
            "headers": {
                "Content-Type": "application/json"
            }
        }

    except Exception as e:
        print("Error generating presigned URLs:", str(e))
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
