import * as AWS from 'aws-sdk';
import { nanoid } from 'nanoid'
import { SNSEvent } from 'aws-lambda';
import { query } from 'jsonpath';
import moment from 'moment';
import { Criteria, DBLogRunStatus, DBLogMessage, LogMessage } from './models';

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
                const now = moment().toISOString();

                const result = await documentClient.get({
                    Key: {
                        pk: 'RunStatus',
                        sk: parameterValue,
                    },
                    TableName: 'delayed-event-processing-part-2',
                }).promise();

                const logRunStatus: DBLogRunStatus = result.Item ? result.Item as DBLogRunStatus : undefined;

                let dueAt: string;
                if (logRunStatus) {
                    // if we have a status set the time to the last run time + the delay time
                    dueAt = moment(logRunStatus.lastRun).add(criterion.delayInMinutes, 'minutes').toISOString();
                    if (dueAt < now) {
                        // if that value is in the past set it to now (NOTE: this isn't really required, but it makes the data easier to understand)
                        dueAt = now;
                    }
                } else {
                    // if we don't have a run status record then set it to now
                    dueAt = now;
                }

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
                    TableName: 'delayed-event-processing-part-2',
                    Item: data
                }).promise();
            }
        }
    }));
}
