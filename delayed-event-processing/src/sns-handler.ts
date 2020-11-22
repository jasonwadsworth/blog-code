import * as AWS from 'aws-sdk';
import { nanoid } from 'nanoid'
import { SNSEvent } from 'aws-lambda';
import { query } from 'jsonpath';
import moment from 'moment';
import { Criteria, DBLogMessage, LogMessage } from './models';

const criteria: Criteria[] = [
    {
        matchPath: '$.level',
        matchValue: 'ERROR',
        parameterPath: '$.service',
        delayInMinutes: 5
    },
    {
        matchPath: '$.level',
        matchValue: 'WARNING',
        parameterPath: '$.service',
        delayInMinutes: 15
    }
];


export const handler = async (event: SNSEvent) => {
    const documentClient = new AWS.DynamoDB.DocumentClient();
    await handleMessages(event, documentClient);
}

export async function handleMessages(event: SNSEvent, documentClient: AWS.DynamoDB.DocumentClient) {
    await Promise.all(event.Records.map(record => {
        const message = JSON.parse(record.Sns.Message) as LogMessage;
        if (message) {
            return storeTriggeredAction(message, documentClient);
        }
    }));
}

async function storeTriggeredAction(message: LogMessage, documentClient: AWS.DynamoDB.DocumentClient) {
    await Promise.all(criteria.map(async (criterion) => {
        const matchValues = query(message, criterion.matchPath);
        if (matchValues.length === 1 && matchValues[0] === criterion.matchValue) {
            // store value
            const parameterValues = query(message, criterion.parameterPath);
            if (parameterValues.length === 1) {
                const parameterValue = parameterValues[0];
                const dueAt = moment().add(criterion.delayInMinutes, 'minutes').toISOString();
                const data: DBLogMessage = {
                    ...message,
                    pk: parameterValue,
                    sk: nanoid(),
                    gsi1_pk: 'DueAt',
                    gsi1_sk: dueAt,
                    parameterValue,
                    dueAt
                };

                await documentClient.put({
                    TableName: 'delayed-event-processing',
                    Item: data
                }).promise();
            }
        }
    }));
}
