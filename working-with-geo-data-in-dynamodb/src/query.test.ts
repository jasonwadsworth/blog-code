import AWS from 'aws-sdk';
import { addLocation } from './add-location';
import { query } from './query';
import locations from '../test-data/locations.json';
import { createTable, deleteTable } from './test-helper';
import { DynamoDBTestHelper } from 'dynamodb-local-test-helper';

let dynamoDbClient: AWS.DynamoDB;
let documentClient: AWS.DynamoDB.DocumentClient;
let dynamoDBTestHelper: DynamoDBTestHelper = new DynamoDBTestHelper();

beforeAll(async () => {
    await dynamoDBTestHelper.init();

    dynamoDbClient = dynamoDBTestHelper.dynamoDbClient;

    documentClient = dynamoDBTestHelper.documentClient;
});

beforeEach(async () => {
    await createTable(dynamoDbClient);
});

afterEach(async () => {
    await deleteTable(dynamoDbClient);
});

afterAll(async () => {
    await dynamoDBTestHelper.finish();
});

describe('query', () => {
    it('should return matches', async () => {
        jest.setTimeout(30000);
        for (const location of locations) {
            await addLocation(location, documentClient);
        }

        const results = await query({ minLatitude: 38.8998, minLongitude: -94.7328, maxLatitude: 39.9762, maxLongitude: -94.6183 }, documentClient);

        expect(results.length).toBe(locations.length - 1);
        expect(results.findIndex(r => r.id === 'the-rub')).toBe(-1);
    });
});
