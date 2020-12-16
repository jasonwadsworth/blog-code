import AWS from 'aws-sdk';

export const TABLE_NAME = 'delayed-event-processing-part-2';

export async function createTable(dynamoDbClient: AWS.DynamoDB): Promise<void> {
    await dynamoDbClient.createTable({
        AttributeDefinitions: [
            {
                AttributeName: 'pk',
                AttributeType: 'S'
            },
            {
                AttributeName: 'sk',
                AttributeType: 'S'
            },
            {
                AttributeName: 'gsi1_pk',
                AttributeType: 'S'
            },
            {
                AttributeName: 'gsi1_sk',
                AttributeType: 'S'
            }
        ],
        BillingMode: 'PAY_PER_REQUEST',
        GlobalSecondaryIndexes: [
            {
                IndexName: 'gsi1',
                KeySchema: [
                    {
                        AttributeName: 'gsi1_pk',
                        KeyType: 'HASH'
                    },
                    {
                        AttributeName: 'gsi1_sk',
                        KeyType: 'RANGE'
                    }
                ],
                Projection: {
                    ProjectionType: 'ALL'
                }
            }
        ],
        KeySchema: [
            {
                AttributeName: 'pk',
                KeyType: 'HASH'
            },
            {
                AttributeName: 'sk',
                KeyType: 'RANGE'
            }
        ]
        ,
        TableName: TABLE_NAME
    }, null).promise();

    await dynamoDbClient.waitFor('tableExists', {
        TableName: TABLE_NAME
    }).promise();

}

export async function deleteTable(dynamoDbClient: AWS.DynamoDB): Promise<void> {
    await dynamoDbClient.deleteTable({
        TableName: TABLE_NAME
    }).promise();
}
