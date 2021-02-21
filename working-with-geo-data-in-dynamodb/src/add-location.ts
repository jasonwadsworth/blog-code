import * as AWS from 'aws-sdk';
import { Location, DBLocation } from './models';
import geohash from 'ngeohash';
import { APIGatewayEvent } from 'aws-lambda';


export const handler = async (event: APIGatewayEvent) => {
    const documentClient = new AWS.DynamoDB.DocumentClient();

    await addLocation(JSON.parse(event.body), documentClient);
}

export async function addLocation(location: Location, documentClient: AWS.DynamoDB.DocumentClient) {
    const hash = geohash.encode(location.latitude, location.longitude);

    const dbLocation: DBLocation = {
        ...location,
        pk: location.id,
        sk: 'Loc',
        gsi1pk: 'Geohash',
        gsi1sk: hash
    };
    await documentClient.put({
        TableName: 'working-with-geo-data-in-dynamodb',
        Item: dbLocation
    }).promise();
}
