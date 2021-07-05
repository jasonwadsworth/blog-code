import * as AWS from 'aws-sdk';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { HierarchyRepository } from '../data';
import { HierarchyItem, StatusCodeError } from '../models';

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2<HierarchyItem[]>> => {
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
        return await handler.listNodes(event);
    }
    catch (e) {
        // AWS errors often have statusCode, so we will make sure it's not an AWS error by making sure there is no code
        if (e.statusCode && !e.code) {
            return {
                statusCode: e.statusCode,
                body: JSON.stringify({ message: e.message })
            }
        }

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

    public async listNodes(event: APIGatewayProxyEventV2): Promise<HierarchyItem[]> {
        const id = event.pathParameters?.id;
        if (!id) {
            throw new StatusCodeError('Missing required id path parameter.', 404);
        }

        const minRelativeDepth = event.queryStringParameters?.minRelativeDepth ? parseInt(event.queryStringParameters?.minRelativeDepth) : 0;
        const maxRelativeDepth = event.queryStringParameters?.maxRelativeDepth ? parseInt(event.queryStringParameters?.maxRelativeDepth) : Number.MAX_SAFE_INTEGER;

        const page = await this.hierarchyRepository.listAllDescendants(id, minRelativeDepth, maxRelativeDepth);

        return page;
    }
}
