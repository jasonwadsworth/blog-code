import { Handler } from './api';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

import { HierarchyRepository } from '../data';
import { StatusCodeError } from '../models';
import AWS from 'aws-sdk';
import { b, deleteAll, seedTestData } from '../data.test';

jest.setTimeout(300000);

const documentClient = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: new AWS.Endpoint(`http://localhost:${process.env.__DynamoDBTestHelper_Port__}`),
});

const repository = new HierarchyRepository(documentClient, process.env.__TABLE_NAME__);

describe('handlers/get-node/api.Handler', () => {
    beforeEach(async () => {
        await deleteAll();
        await seedTestData();
    });

    const handler = new Handler(repository);

    it('should return the node', async () => {
        let event: any = {
            pathParameters: {
                id: b.id
            },
        };

        let retrieved = await handler.getNode(event as unknown as APIGatewayProxyEventV2);

        expect(retrieved).toEqual(b);
    });

    it('should throw if id is not in the path', async () => {
        let event: any = {};

        let error: any = null;
        try {
            await handler.getNode(event as unknown as APIGatewayProxyEventV2);
        }
        catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(StatusCodeError);
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('Missing required id path parameter.');
    });

    it('should throw if the node doesn\'t exist', async () => {
        let event: any = {
            pathParameters: {
                id: 'b9374857-3fcf-4cfa-b184-1ee875cae434'
            },
        };


        let error: any = null;
        try {
            await handler.getNode(event as unknown as APIGatewayProxyEventV2);
        }
        catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(StatusCodeError);
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('Unable to locate node.');
    });
});
