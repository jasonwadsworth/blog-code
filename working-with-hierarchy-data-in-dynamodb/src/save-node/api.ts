import * as AWS from 'aws-sdk';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { HierarchyRepository } from '../data';
import { CreateHierarchyItem, HierarchyItem, StatusCodeError, UpdateHierarchyItemName, UpdateHierarchyItemParent } from '../models';
import { v4 } from 'uuid';

const file = 'handlers/save-client/api.ts';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2<string>> => {
    console.debug('Event', event);

    if (!event) {
        throw new Error('Missing event.');
    }
    if (!process.env.TableName) {
        throw new Error('Missing TableName environment variable.');
    }

    const documentClient = new AWS.DynamoDB.DocumentClient();
    const hierarchyRepository = new HierarchyRepository(documentClient, process.env.TableName);
    const handler = new Handler(hierarchyRepository);
    try {
        return await handler.saveNode(event);
    }
    catch (e) {
        // AWS errors often have statusCode, so we will make sure it's not an AWS error by making sure there is no code
        if (e.statusCode && !e.code) {
            return {
                statusCode: e.statusCode,
                body: JSON.stringify({ message: e.message })
            } as APIGatewayProxyResultV2;
        }

        return {
            statusCode: 500,
            body: JSON.stringify({ message: e.message })
        } as APIGatewayProxyResultV2;
    }
};

export class Handler {
    private readonly hierarchyRepository: HierarchyRepository;

    constructor(hierarchyRepository: HierarchyRepository) {
        this.hierarchyRepository = hierarchyRepository;
    }

    public async saveNode(event: APIGatewayProxyEventV2): Promise<string> {
        if (!event.body) {
            throw new StatusCodeError('Missing request body.', 400);
        }

        let body: string;
        if (event.body && event.isBase64Encoded) {
            body = Buffer.from(event.body, 'base64').toString();
        }
        else {
            body = event.body;
        }

        if (event.routeKey.startsWith('PUT')) {
            const id = event.pathParameters?.id;
            if (!id) {
                throw new StatusCodeError('Missing required id in path.', 404);
            }

            if (event.routeKey.includes('/update-name')) {
                const updateItem = JSON.parse(body) as UpdateHierarchyItemName;

                await this.hierarchyRepository.updateName(id, updateItem.name);

                return id;
            }

            if (event.routeKey.includes('/move')) {
                const updateItem = JSON.parse(body) as UpdateHierarchyItemParent;

                await this.hierarchyRepository.updateParent(id, updateItem.parentId);

                return id;
            }

            throw new StatusCodeError('Path not found.', 404);
        }

        const createItem = JSON.parse(body) as CreateHierarchyItem;

        const id = v4();

        const item: HierarchyItem = {
            ...createItem,
            id,
            relativeDepth: 0,
            ancestorId: id
        }

        await this.hierarchyRepository.saveHierarchyItem(item);

        return id;
    }
}
