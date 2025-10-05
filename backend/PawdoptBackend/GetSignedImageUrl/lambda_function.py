import boto3
import json
import os
from botocore.config import Config

# # Configure the S3 client to use the correct regional endpoint
config = Config(
    region_name='REGION', # Replace with your Region
)
s3 = boto3.client('s3')

def lambda_handler(event, context):
    """
    Generates a pre-signed URL for a single private S3 icon.
    This function expects a POST request with a JSON body.
    """
    try:
        # Check if the request body is present
        if 'body' not in event or not event['body']:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing request body"}),
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            }

        # Parse the JSON body to get the S3 key and bucket
        body = json.loads(event['body'])
        key = body['key']
        bucket_name = body.get('bucket', 'ICON_BUCKET') # Default to your icon bucket

        # Generate the pre-signed URL for a 'get_object' request
        presigned_url = s3.generate_presigned_url(
            ClientMethod='get_object',
            Params={'Bucket': bucket_name, 'Key': key},
            ExpiresIn=3600
        )

        # Return the signed URL in a successful response
        return {
            "statusCode": 200,
            "body": json.dumps({"signedUrl": presigned_url}),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        }
    except Exception as e:
        print(f"Error generating pre-signed URL: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            }
        }