import AWS from 'aws-sdk';
import { nanoid } from 'nanoid'
import { handleMessages } from './sns-handler';
import { SNSEvent } from 'aws-lambda/trigger/sns';
import { createTable, TABLE_NAME, deleteTable } from './test-helper';
import logMessages from '../test-data/logMessages.json';
import { DynamoDBTestHelper } from 'dynamodb-local-test-helper';
import { DBLogRunStatus } from './models';
import moment from 'moment';

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

        expect(allData.Items!.length).toBe(8);

        // there should be three of these records, one for each unique service
        expect(allData.Items!.filter(i => i.sk === '#RunStatus').length).toBe(3);

        // the dueAt should be in the past already
        expect(allData.Items!.filter(i => i.sk === '#RunStatus' && i.dueAt < new Date().toISOString()).length).toBe(3);
    });

    it('should not update the run status if the new now is sooner than last run + delay', async () => {
        const oneMinuteAgo = moment().subtract(1, 'minute').toISOString();
        // add a record that show the last run time as 1 minute ago
        await documentClient.put({
            TableName: 'delayed-event-processing-part-2',
            Item: {
                pk: 'Service A',
                sk: '#RunStatus',
                parameterValue: 'Service A',
                lastRun: oneMinuteAgo
            },
        }).promise();

        const snsEvent: SNSEvent = {
            Records: [
                {
                    EventSource: '',
                    EventSubscriptionArn: '',
                    EventVersion: '',
                    Sns: {
                        Message: JSON.stringify({
                            "level": "WARNING",
                            "message": "This is your first warning",
                            "receivedAt": "2020-11-14T13: 00: 00.00000Z",
                            "service": "Service A"
                        }),
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
                }
            ]
        };

        await handleMessages(snsEvent, documentClient);

        const allData = await documentClient.scan({
            TableName: TABLE_NAME
        }).promise();

        expect(allData.Items!.length).toBe(2);

        // there should be three of these records, one for each unique service
        expect(allData.Items!.filter(i => i.sk === '#RunStatus').length).toBe(1);

        const runStatus = allData.Items!.filter(i => i.sk === '#RunStatus')[0];

        // the run status shouldn't have a dueAt because we didn't update it
        expect(runStatus.dueAt).toBeUndefined();
    });
});
