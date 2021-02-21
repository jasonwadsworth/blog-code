import * as AWS from 'aws-sdk';
import { APIGatewayEvent } from 'aws-lambda';
import { Location, DBLocation, BoundingBox } from './models';
import geohash from 'ngeohash';

export const handler = async (event: APIGatewayEvent): Promise<Location[]> => {
    const documentClient = new AWS.DynamoDB.DocumentClient();

    return await query({
        maxLatitude: parseFloat(event.queryStringParameters.maxLatitude),
        maxLongitude: parseFloat(event.queryStringParameters.maxLongitude),
        minLatitude: parseFloat(event.queryStringParameters.minLatitude),
        minLongitude: parseFloat(event.queryStringParameters.minLongitude)
    }, documentClient);
}



export async function query(boundingBox: BoundingBox, documentClient: AWS.DynamoDB.DocumentClient): Promise<Location[]> {
    const boxes = geohash.bboxes(boundingBox.minLatitude, boundingBox.minLongitude, boundingBox.maxLatitude, boundingBox.maxLongitude, 5);

    console.info(JSON.stringify(boxes));
    const locations: Location[] = [];
    for (const box of boxes) {
        const results = await queryAll({
            TableName: 'working-with-geo-data-in-dynamodb',
            IndexName: 'gsi1',
            KeyConditionExpression: '#pk = :pk AND begins_with(#sk, :hash)',
            ExpressionAttributeNames: {
                '#pk': 'gsi1pk',
                '#sk': 'gsi1sk'
            },
            ExpressionAttributeValues: {
                ':pk': 'Geohash',
                ':hash': box
            }
        }, documentClient);

        locations.push(...results.map(r => {
            // remove my data keys, the public doesn't need to see these
            delete r.pk;
            delete r.sk;
            delete r.gsi1pk;
            delete r.gsi1sk;
            return r;
        }))
    }

    return locations;
}

async function queryAll(query: AWS.DynamoDB.DocumentClient.QueryInput, documentClient: AWS.DynamoDB.DocumentClient): Promise<any[]> {
    query.Limit = undefined;
    query.ExclusiveStartKey = undefined;

    let items: any[] = [];
    do {
        const result = await documentClient.query(query).promise();
        if (result.Items) {
            items = items.concat(result.Items as any[]);
        }

        query.ExclusiveStartKey = result.LastEvaluatedKey;
    } while (!!query.ExclusiveStartKey);

    return items;
}
