import { Handler } from './api';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

import { HierarchyRepository } from '../data';
import AWS from 'aws-sdk';
import { deleteAll, h, seedTestData } from '../data.test';
import { StatusCodeError } from '../models';

jest.setTimeout(300000);

const documentClient = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: new AWS.Endpoint(`http://localhost:${process.env.__DynamoDBTestHelper_Port__}`),
});

const repository = new HierarchyRepository(documentClient, process.env.__TABLE_NAME__);

describe('handlers/delete-node/api.Handler', () => {
    beforeEach(async () => {
        await deleteAll();
        await seedTestData();
    });

    const handler = new Handler(repository);

    it('should delete the item', async () => {
        let event: any = {
            pathParameters: {
                id: h.id
            },
        };

        await handler.deleteNode(event as unknown as APIGatewayProxyEventV2);

        let retrieved = await repository.getHierarchyItem(h.id);

        expect(retrieved).toBeUndefined();
    });

    it('should throw if id is not in the path', async () => {
        let event: any = {};

        let error: any = null;
        try {
            await handler.deleteNode(event as unknown as APIGatewayProxyEventV2);
        }
        catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(StatusCodeError);
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('Missing required id path parameter.');
    });

    it('should silently do nothing if the node doesn\'t exist', async () => {
        let event: any = {
            pathParameters: {
                id: 'b9374857-3fcf-4cfa-b184-1ee875cae434'
            },
        };

        await handler.deleteNode(event as unknown as APIGatewayProxyEventV2);
    });
});
