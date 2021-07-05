import { Handler } from './api';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

import { HierarchyRepository } from '../data';
import AWS from 'aws-sdk';
import { a, b, c, d, deleteAll, e, f, g, h, i, seedTestData } from '../data.test';

jest.setTimeout(300000);

const documentClient = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: new AWS.Endpoint(`http://localhost:${process.env.__DynamoDBTestHelper_Port__}`),
});

const repository = new HierarchyRepository(documentClient, process.env.__TABLE_NAME__);

describe('handlers/list-nodes/api.Handler', () => {
    beforeEach(async () => {
        await deleteAll();
        await seedTestData();
    });

    const handler = new Handler(repository);

    it('should list all descendants - A', async () => {
        let event: any = {
            pathParameters: {
                id: a.id
            }
        };

        let aDescendants = await handler.listNodes(event as unknown as APIGatewayProxyEventV2);

        expect(aDescendants).toEqual([
            { ...a, ancestorId: 'A', relativeDepth: 0 },
            { ...b, ancestorId: 'A', relativeDepth: 1 },
            { ...c, ancestorId: 'A', relativeDepth: 1 },
            { ...d, ancestorId: 'A', relativeDepth: 2 },
            { ...e, ancestorId: 'A', relativeDepth: 2 },
            { ...f, ancestorId: 'A', relativeDepth: 2 },
            { ...g, ancestorId: 'A', relativeDepth: 3 },
            { ...h, ancestorId: 'A', relativeDepth: 3 },
            { ...i, ancestorId: 'A', relativeDepth: 4 },
        ]);
    });

    it('should list all descendants - A (depth 2 - 3)', async () => {
        let event: any = {
            pathParameters: {
                id: a.id
            },
            queryStringParameters: {
                minRelativeDepth: '2',
                maxRelativeDepth: '3'
            }
        };

        let aDescendants = await handler.listNodes(event as unknown as APIGatewayProxyEventV2);

        expect(aDescendants).toEqual([
            { ...d, ancestorId: 'A', relativeDepth: 2 },
            { ...e, ancestorId: 'A', relativeDepth: 2 },
            { ...f, ancestorId: 'A', relativeDepth: 2 },
            { ...g, ancestorId: 'A', relativeDepth: 3 },
            { ...h, ancestorId: 'A', relativeDepth: 3 },
        ]);
    });

    it('should list all descendants - D', async () => {
        let event: any = {
            pathParameters: {
                id: d.id
            },
        };

        let dDescendants = await handler.listNodes(event as unknown as APIGatewayProxyEventV2);

        expect(dDescendants).toEqual([
            { ...d, ancestorId: 'D', relativeDepth: 0 },
            { ...g, ancestorId: 'D', relativeDepth: 1 },
            { ...i, ancestorId: 'D', relativeDepth: 2 },
        ]);
    });
});
