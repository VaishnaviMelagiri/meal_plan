import json
import boto3
import os
import uuid
import datetime

dynamodb = boto3.resource('dynamodb')
table_name = os.environ.get('RECIPES_TABLE', 'NutriGenieCustomRecipes')
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        if not body:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'Missing request body'})
            }

        recipe_name = body.get('name')
        if not recipe_name:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({'error': 'Recipe name is required'})
            }

        # Create the recipe record
        recipe_id = "RECIPE#" + str(uuid.uuid4())
        item = {
            'recipe_id': recipe_id,
            'name': recipe_name,
            'ingredients': body.get('ingredients', []),
            'total_calories': body.get('total_calories', 0),
            'protein_g': body.get('protein_g', 0),
            'carbs_g': body.get('carbs_g', 0),
            'fat_g': body.get('fat_g', 0),
            'fiber_g': body.get('fiber_g', 0),
            'benefits': body.get('benefits', '✏️ Custom Recipe'),
            'created_at': datetime.datetime.utcnow().isoformat(),
            'created_by': body.get('created_by', 'Nutritionist')
        }

        # Put into DynamoDB
        table.put_item(Item=item)

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'message': 'Recipe saved successfully',
                'recipe_id': recipe_id,
                'data': item
            })
        }
    except Exception as e:
        print(f"Error saving recipe: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({'error': str(e)})
        }
