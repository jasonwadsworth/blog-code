import { Docker } from 'node-docker-api';
import { Container } from 'node-docker-api/lib/container';
import AWS from 'aws-sdk';
import getPort from 'get-port';
import { nanoid } from 'nanoid'

export class DynamoDBTestHelper {
    private docker = new Docker({ socketPath: '/var/run/docker.sock' });
    private port: number;
    private container: Container;
    public dynamoDbClient: AWS.DynamoDB;
    public documentClient: AWS.DynamoDB.DocumentClient;
    private tableName: string;

    public async init(): Promise<void> {
        await this.docker.image.create({}, {
            fromImage: 'amazon/dynamodb-local',
            tag: 'latest'
        })
            .then((stream) => this.promisifyStream(stream))
            .then(() => this.docker.image.get('amazon/dynamodb-local').status())
            .then((image) => image.history())
            .then((events) => console.debug(events))
            .catch((error) => console.debug(error));

        this.port = await getPort();

        this.container = await this.docker.container.create({
            Image: 'amazon/dynamodb-local',
            name: `dynamodb-local-${nanoid()}`,
            HostConfig: {
                PortBindings: {
                    "8000/tcp": [ // port inside of docker container
                        { "HostPort": `${this.port}` } // port on host machine
                    ]
                }
            }
        });

        await this.container.start();

        this.dynamoDbClient = new AWS.DynamoDB({
            region: 'localhost',
            endpoint: new AWS.Endpoint(`http://localhost:${this.port}`),
        });

        this.documentClient = new AWS.DynamoDB.DocumentClient({
            region: 'localhost',
            endpoint: new AWS.Endpoint(`http://localhost:${this.port}`),
        });
    }

    public async finish(): Promise<void> {
        if (this.container) {
            await this.container.stop();
            await this.container.delete();
        }
    }

    private promisifyStream = (stream: any) => new Promise((resolve, reject) => {
        stream.on('data', (d: any) => console.debug(d.toString()))
        stream.on('end', resolve)
        stream.on('error', reject)
    })

}

export const TABLE_NAME = 'delayed-event-processing';

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
