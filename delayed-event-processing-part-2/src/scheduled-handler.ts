import * as AWS from 'aws-sdk';
import chunk from 'chunk';
import moment from 'moment';
import { DBLogRunStatus, DBLogMessage, DBItem } from './models';

export const handler = async () => {
    const documentClient = new AWS.DynamoDB.DocumentClient();
    const handler = new ScheduledHandler(documentClient);

    await handler.handleScheduled();
}

export class ScheduledHandler {
    private documentClient: AWS.DynamoDB.DocumentClient;

    constructor(documentClient: AWS.DynamoDB.DocumentClient) {
        this.documentClient = documentClient;
    }

    public async handleScheduled(): Promise<void> {
        const dueMessages = await this.getDueMessages();
        const unique: { service: string, logMessages: DBLogMessage[] }[] = [];
        for (const dueMessage of dueMessages) {
            if (unique.findIndex(u => u.service === dueMessage.parameterValue) === -1) {
                const matching = await this.getMatchingRecords(dueMessage.parameterValue);
                unique.push({
                    service: dueMessage.parameterValue,
                    logMessages: matching
                })
            }
        }

        await Promise.all(unique.map(async (u) => {
            console.info(`Processing service ${u.service}. Current batch includes ${u.logMessages.length} records.`);

            await this.updateRunStatus(u.service);
            return this.deleteMatches(u.logMessages);
        }));

    }

    private async updateRunStatus(parameterValue: string): Promise<void> {

        const runStatus: DBLogRunStatus = {
            pk: 'RunStatus',
            sk: parameterValue,
            parameterValue,
            lastRun: moment().toISOString()
        };

        await this.documentClient.put({
            TableName: 'delayed-event-processing-part-2',
            Item: runStatus,
        }).promise();
    }

    private async deleteMatches(logMessages: DBLogMessage[]) {
        const deleteBatch = logMessages.map(message => ({
            DeleteRequest: {
                Key: {
                    pk: message.pk,
                    sk: message.sk
                }
            }
        }));

        await this.batchWrite(deleteBatch);
    }

    private async batchWrite(batchItem: AWS.DynamoDB.DocumentClient.WriteRequest[]): Promise<void> {
        //Dynamo BatchWrite only supports 25 items at a time
        const batchChunks = chunk(batchItem, 25);

        for (const batchChunk of batchChunks) {
            const requestItems = {
                'delayed-event-processing-part-2': batchChunk
            };

            await this.batchWriteRecursive(requestItems);
        }
    }

    private async batchWriteRecursive(requestItems: AWS.DynamoDB.DocumentClient.BatchWriteItemRequestMap): Promise<void> {
        const result = await this.documentClient.batchWrite({
            RequestItems: requestItems
        }).promise()

        if (result.UnprocessedItems && result.UnprocessedItems['delayed-event-processing-part-2']?.length) {
            await this.batchWriteRecursive(result.UnprocessedItems);
        }
    }

    private async getMatchingRecords(service: string): Promise<DBLogMessage[]> {
        const response = await this.queryAll({
            TableName: 'delayed-event-processing-part-2',
            KeyConditionExpression: '#pk = :pk',
            ExpressionAttributeNames: {
                '#pk': 'pk'
            },
            ExpressionAttributeValues: {
                ':pk': service
            },
        });

        return response as DBLogMessage[];
    }

    private async getDueMessages(): Promise<DBLogMessage[]> {
        const response = await this.queryAll({
            TableName: 'delayed-event-processing-part-2',
            IndexName: 'gsi1',
            KeyConditionExpression: '#pk = :pk AND #sk <= :sk',
            ExpressionAttributeNames: {
                '#pk': 'gsi1_pk',
                '#sk': 'gsi1_sk'
            },
            ExpressionAttributeValues: {
                ':pk': 'DueAt',
                ':sk': moment().toISOString()
            },
        });

        return response as DBLogMessage[];
    }

    private async queryAll(query: AWS.DynamoDB.DocumentClient.QueryInput): Promise<any[]> {
        query.Limit = undefined;
        query.ExclusiveStartKey = undefined;

        let items: any[] = [];
        do {
            const result = await this.documentClient.query(query).promise();
            if (result.Items) {
                items = items.concat(result.Items as any[]);
            }

            query.ExclusiveStartKey = result.LastEvaluatedKey;
        } while (!!query.ExclusiveStartKey);

        return items;
    }
}
