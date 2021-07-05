import { Handler } from './api';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

import { HierarchyRepository } from '../data';
import { CreateHierarchyItem, StatusCodeError, UpdateHierarchyItemName, UpdateHierarchyItemParent } from '../models';
import AWS from 'aws-sdk';
import { a, b, c, d, deleteAll, e, f, g, h, i, seedTestData } from '../data.test';

jest.setTimeout(300000);

const documentClient = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: new AWS.Endpoint(`http://localhost:${process.env.__DynamoDBTestHelper_Port__}`),
});

const repository = new HierarchyRepository(documentClient, process.env.__TABLE_NAME__);

describe('handlers/save-node/api.Handler', () => {
    beforeEach(async () => {
        await deleteAll();
        await seedTestData();
    });

    const handler = new Handler(repository);

    it('should save a new node', async () => {
        const item: CreateHierarchyItem = {
            name: 'new node'
        };

        let event: any = {
            routeKey: 'POST /{id}',
            body: JSON.stringify(item)
        };

        const id = await handler.saveNode(event as unknown as APIGatewayProxyEventV2);

        const fromDb = await repository.getHierarchyItem(id);

        expect(fromDb).toEqual({ ...item, id, ancestorId: id, relativeDepth: 0 });
    });

    it('should update the name of an existing node', async () => {
        const item: UpdateHierarchyItemName = {
            name: 'Updated I'
        }

        let event: any = {
            pathParameters: {
                id: i.id
            },
            routeKey: 'PUT /{id}/update-name',
            body: JSON.stringify(item)
        };

        await handler.saveNode(event as unknown as APIGatewayProxyEventV2);

        const aDescendants = await repository.listAllDescendants(a.id);
        const iFromA = aDescendants.find(d => d.id === i.id);
        expect(iFromA).toEqual({ ...i, name: 'Updated I', ancestorId: 'A', relativeDepth: 4 });

        const dDescendants = await repository.listAllDescendants(d.id);
        const iFromD = dDescendants.find(d => d.id === i.id);
        expect(iFromD).toEqual({ ...i, name: 'Updated I', ancestorId: 'D', relativeDepth: 2 });

        const updatedI = await repository.getHierarchyItem(i.id);
        expect(updatedI).toEqual({ ...i, name: 'Updated I' });
    });

    it('should update all the inherited records when the parent is changed - D to E', async () => {
        const item: UpdateHierarchyItemParent = {
            parentId: 'E'
        }

        let event: any = {
            pathParameters: {
                id: d.id
            },
            routeKey: 'PUT /{id}/move',
            body: JSON.stringify(item)
        };

        await handler.saveNode(event as unknown as APIGatewayProxyEventV2);


        const aDescendants = await repository.listAllDescendants(a.id);

        expect(aDescendants).toEqual([
            { ...a, ancestorId: 'A', relativeDepth: 0 },
            { ...b, ancestorId: 'A', relativeDepth: 1 },
            { ...c, ancestorId: 'A', relativeDepth: 1 },
            { ...e, ancestorId: 'A', relativeDepth: 2 },
            { ...f, ancestorId: 'A', relativeDepth: 2 },
            { ...d, parentId: e.id, ancestorId: 'A', relativeDepth: 3 },
            { ...h, ancestorId: 'A', relativeDepth: 3 },
            { ...g, ancestorId: 'A', relativeDepth: 4 },
            { ...i, ancestorId: 'A', relativeDepth: 5 },
        ]);

        const bDescendants = await repository.listAllDescendants(b.id);

        expect(bDescendants).toEqual([
            { ...b, ancestorId: 'B', relativeDepth: 0 },
            { ...e, ancestorId: 'B', relativeDepth: 1 },
            { ...d, parentId: e.id, ancestorId: 'B', relativeDepth: 2 },
            { ...g, ancestorId: 'B', relativeDepth: 3 },
            { ...i, ancestorId: 'B', relativeDepth: 4 },
        ]);

        const dDescendants = await repository.listAllDescendants(d.id);

        expect(dDescendants).toEqual([
            { ...d, parentId: e.id, ancestorId: 'D', relativeDepth: 0 },
            { ...g, ancestorId: 'D', relativeDepth: 1 },
            { ...i, ancestorId: 'D', relativeDepth: 2 },
        ]);
    });

    it('should throw if it is a PUT and there is no id in the path', async () => {
        const item: UpdateHierarchyItemName = {
            name: 'Updated I'
        }

        let event: any = {
            routeKey: 'PUT /{id}/update-name',
            body: JSON.stringify(item)
        };

        let error: any = null;
        try {
            await handler.saveNode(event as unknown as APIGatewayProxyEventV2);
        }
        catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(StatusCodeError);
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('Missing required id in path.');
    });

    it('should throw if the path isn\'t valid', async () => {
        const item: UpdateHierarchyItemName = {
            name: 'Updated I'
        }

        let event: any = {
            pathParameters: {
                id: i.id
            },
            routeKey: 'PUT /',
            body: JSON.stringify(item)
        };

        let error: any = null;
        try {
            await handler.saveNode(event as unknown as APIGatewayProxyEventV2);
        }
        catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(StatusCodeError);
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('Path not found.');
    });

    it('should throw if there is no body', async () => {
        const item: UpdateHierarchyItemName = {
            name: 'Updated I'
        }

        let event: any = {
            routeKey: 'PUT /{id}/update-name',
        };

        let error: any = null;
        try {
            await handler.saveNode(event as unknown as APIGatewayProxyEventV2);
        }
        catch (e) {
            error = e;
        }

        expect(error).toBeInstanceOf(StatusCodeError);
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Missing request body.');
    });
});
