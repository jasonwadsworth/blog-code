import AWS from 'aws-sdk';
import { addLocation } from './add-location';
import { createTable, TABLE_NAME, deleteTable } from './test-helper';
import { DynamoDBTestHelper } from 'dynamodb-local-test-helper';
import { Location } from './models';

const dynamoDBTestHelper: DynamoDBTestHelper = new DynamoDBTestHelper();
let dynamoDbClient: AWS.DynamoDB;
let documentClient: AWS.DynamoDB.DocumentClient;

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

describe('handleMessages', () => {
    it('should put a record in the table', async () => {
        const location: Location = {
            id: "joes-ks-leawood",
            name: "Joe's KC BBQ",
            streetAddress: "11723 Roe Ave",
            locality: "Leawood",
            region: "KS",
            postalCode: "66211",
            country: "USA",
            latitude: 38.9153287,
            longitude: -94.6393130,
        };

        await addLocation(location, documentClient);

        const allData = await documentClient.scan({
            TableName: TABLE_NAME
        }).promise();

        // there should be one record
        expect(allData.Items!.length).toBe(1);

        expect(allData.Items![0]).toMatchObject(location);
    });
});
