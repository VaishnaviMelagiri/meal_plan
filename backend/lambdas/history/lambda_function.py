import json, os, boto3
from decimal import Decimal
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
MEAL_PLANS_TABLE = os.environ.get('MEAL_PLANS_TABLE', 'NutriGenieMealPlans')


def _default(o):
    # DynamoDB returns numbers as Decimal — make them JSON-serializable
    if isinstance(o, Decimal):
        return int(o) if o == o.to_integral_value() else float(o)
    raise TypeError(f'Object of type {type(o).__name__} is not JSON serializable')


def _response(status, body):
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(body, default=_default)
    }


def lambda_handler(event, context):
    try:
        kit_id = (event.get('pathParameters') or {}).get('kit_id', '')
        if not kit_id:
            return _response(400, {'error': 'kit_id required'})
        table = dynamodb.Table(MEAL_PLANS_TABLE)
        result = table.query(
            KeyConditionExpression=Key('kit_id').eq(kit_id),
            ScanIndexForward=False,
            Limit=5
        )
        plans = result.get('Items', [])
        return _response(200, {'kit_id': kit_id, 'plans': plans})
    except Exception as e:
        return _response(500, {'error': str(e)})
