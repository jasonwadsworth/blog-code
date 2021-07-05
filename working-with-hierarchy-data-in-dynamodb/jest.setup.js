const { DynamoDBTestHelper } = require('dynamodb-local-test-helper');


module.exports = async () => {
  const dynamoDBTestHelper = new DynamoDBTestHelper();
  global.__DynamoDBTestHelper__ = dynamoDBTestHelper;
  await dynamoDBTestHelper.init();
  process.env.__TABLE_NAME__ = 'working-with-hierarchy-data-in-dynamodb';
  await createTable(dynamoDBTestHelper.dynamoDbClient, process.env.__TABLE_NAME__);
  process.env.__DynamoDBTestHelper_Port__ = dynamoDBTestHelper.port;
}

async function createTable(dynamoDbClient, tableName) {
  await dynamoDbClient.createTable({
    AttributeDefinitions: [
      {
        AttributeName: 'id',
        AttributeType: 'S'
      },
      {
        AttributeName: 'relativeDepth',
        AttributeType: 'N'
      },
      {
        AttributeName: 'ancestorId',
        AttributeType: 'S'
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [
      {
        AttributeName: 'id',
        KeyType: 'HASH'
      },
      {
        AttributeName: 'relativeDepth',
        KeyType: 'RANGE'
      },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'gsi1',
        KeySchema: [
          {
            AttributeName: 'ancestorId',
            KeyType: 'HASH'
          },
          {
            AttributeName: 'relativeDepth',
            KeyType: 'RANGE'
          },
        ],
        Projection: {
          ProjectionType: 'ALL'
        }
      }
    ],
    TableName: tableName
  }, undefined).promise();

  await dynamoDbClient.waitFor('tableExists', {
    TableName: tableName
  }).promise();
}
