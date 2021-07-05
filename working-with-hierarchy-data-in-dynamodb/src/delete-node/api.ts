import * as AWS from 'aws-sdk';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { HierarchyRepository } from '../data';
import { StatusCodeError } from '../models';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
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
        await handler.deleteNode(event);
        return {
            statusCode: 200
        };
    }
    catch (e) {
        // AWS errors often have statusCode, so we will make sure it's not an AWS error by making sure there is no code
        if (e.statusCode && !e.code) {
            return {
                statusCode: e.statusCode,
                body: JSON.stringify({ message: e.message })
            }
        }

        console.error(e.message, e);
        return {
            statusCode: 500
        }
    }
};

export class Handler {
    private readonly hierarchyRepository: HierarchyRepository;

    constructor(hierarchyRepository: HierarchyRepository) {
        this.hierarchyRepository = hierarchyRepository;
    }

    public async deleteNode(event: APIGatewayProxyEventV2): Promise<void> {
        const id = event.pathParameters?.id;
        if (!id) {
            throw new StatusCodeError('Missing required id path parameter.', 404);
        }

        await this.hierarchyRepository.deleteHierarchyItem(id);
    }
}
