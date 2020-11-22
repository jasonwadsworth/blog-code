import AWS from 'aws-sdk';
import { nanoid } from 'nanoid'
import { handleMessages } from './sns-handler';
import { SNSEvent } from 'aws-lambda/trigger/sns';
import { DynamoDBTestHelper, createTable, TABLE_NAME, deleteTable } from './test-helper';
import logMessages from '../test-data/logMessages.json';

let dynamoDBTestHelper: DynamoDBTestHelper = new DynamoDBTestHelper();
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
    it('should put records in the table', async () => {
        const snsEvent: SNSEvent = {
            Records: logMessages.map(logMessage => (
                {
                    EventSource: '',
                    EventSubscriptionArn: '',
                    EventVersion: '',
                    Sns: {
                        Message: JSON.stringify(logMessage),
                        MessageAttributes: {},
                        MessageId: nanoid(),
                        Signature: nanoid(),
                        SignatureVersion: '12345',
                        SigningCertUrl: 'https://aws.blahblah',
                        Subject: 'Subjective',
                        Timestamp: new Date().toISOString(),
                        TopicArn: '',
                        Type: '',
                        UnsubscribeUrl: ''
                    }
                }))
        };

        await handleMessages(snsEvent, documentClient);

        const allData = await documentClient.scan({
            TableName: TABLE_NAME
        }).promise();

        expect(allData.Items!.length).toBe(5);
        allData.Items!.map(i => console.info(JSON.stringify(i)));
    });
});
