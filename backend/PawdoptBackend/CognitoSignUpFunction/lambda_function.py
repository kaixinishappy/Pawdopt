import json
import boto3
import os
import traceback

COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID')
COGNITO_CLIENT_ID = os.environ.get('COGNITO_CLIENT_ID')


CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Access-Control-Allow-Credentials': 'true'
}

def lambda_handler(event, context):
    method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'CORS preflight'}),
            'isBase64Encoded': False
        }

    try:
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event.get('body', {})

        email = body.get('email')
        password = body.get('password')
        name = body.get('name', '')
        dob = body.get('dob', '')
        gender = body.get('gender', '')
        address = body.get('address')
        postcode = body.get('postcode')
        phoneNo = body.get('phoneNo')
        role = body.get('role')
        experience = body.get('experience', '')
        shelterName = body.get('shelterName', '')
        latitude = body.get('latitude', '')
        longitude = body.get('longitude', '')

        print(f"Processing signup for email: {email}, role: {role}")

        if not all([email, password, address, postcode, phoneNo, role]):
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Missing required fields'}),
                'isBase64Encoded': False
            }

        client = boto3.client('cognito-idp')

        attributes = [
            {'Name': 'email', 'Value': email},
            {'Name': 'name', 'Value': shelterName if role == 'shelter' and shelterName else name},
            {'Name': 'address', 'Value': address},
            {'Name': 'phone_number', 'Value': phoneNo},
            {'Name': 'custom:postcode', 'Value': postcode},
            {'Name': 'custom:role', 'Value': role},
        ]

        if role == 'adopter':
            if dob.strip():
                attributes.append({'Name': 'birthdate', 'Value': dob})
            if gender.strip():
                attributes.append({'Name': 'gender', 'Value': gender})
            if experience.strip():
                attributes.append({'Name': 'custom:experience', 'Value': experience})
            # Add coordinates if available
            if latitude:
                attributes.append({'Name': 'custom:latitude', 'Value': latitude})
            if longitude:
                attributes.append({'Name': 'custom:longitude', 'Value': longitude})
        elif role == 'shelter':
            if dob.strip():
                attributes.append({'Name': 'birthdate', 'Value': dob})
            if latitude.strip():
                attributes.append({'Name': 'custom:latitude', 'Value': str(latitude)})
            if longitude.strip():
                attributes.append({'Name': 'custom:longitude', 'Value': str(longitude)})

        print(f"Creating user with attributes: {attributes}")

        response = client.sign_up(
            ClientId=COGNITO_CLIENT_ID,
            Username=email,
            Password=password,
            UserAttributes=attributes
        )

        print(f"Sign up response: {response}")

        client.admin_confirm_sign_up(
            UserPoolId=COGNITO_USER_POOL_ID,
            Username=email
        )

        print("User confirmed successfully")

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'Sign up successful!'}),
            'isBase64Encoded': False
        }

    except client.exceptions.UsernameExistsException:
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'User already exists.'}),
            'isBase64Encoded': False
        }

    except client.exceptions.InvalidPasswordException:
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Password does not meet requirements.'}),
            'isBase64Encoded': False
        }

    except client.exceptions.InvalidParameterException:
        return {
            'statusCode': 400,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Invalid signup parameters.'}),
            'isBase64Encoded': False
        }

    except Exception as e:
        print("Exception occurred:")
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)}),
            'isBase64Encoded': False
        }
