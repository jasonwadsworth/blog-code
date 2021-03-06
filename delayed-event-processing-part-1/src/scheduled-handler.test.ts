import AWS from 'aws-sdk';
import { nanoid } from 'nanoid'
import { handleMessages } from './sns-handler';
import { SNSEvent, SNSEventRecord, SNSMessage } from 'aws-lambda/trigger/sns';
import { ScheduledHandler } from './scheduled-handler';
import MockDate from 'mockdate';
import moment from 'moment';
import { createTable, deleteTable, TABLE_NAME } from './test-helper';
import logMessages from '../test-data/logMessages.json';
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

describe('handleMessages', () => {
    it('should process everything except the Service C record', async () => {
        const snsEvent: SNSEvent = {
            Records: logMessages.map(logMessage => (
                {
                    Sns: {
                        Message: JSON.stringify(logMessage),
                        MessageId: nanoid(),
                    } as SNSMessage
                }) as SNSEventRecord)
        };

        // set the date to five minutes ago to get the data in there at the time needed for the test
        MockDate.set(moment().subtract(5, 'minutes').toDate());

        await handleMessages(snsEvent, documentClient);

        MockDate.reset();

        const handler = new ScheduledHandler(documentClient);
        await handler.handleScheduled();

        const allData = await documentClient.scan({
            TableName: TABLE_NAME,
            ConsistentRead: true
        }).promise();

        expect(allData.Items!.length).toBe(1);
        expect(allData.Items![0].service).toBe('Service C');
    });
});
