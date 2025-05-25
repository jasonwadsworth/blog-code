import { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import serverlessExpress from '@codegenie/serverless-express';
import app from './app/index';

export const handler = async (event: APIGatewayProxyEventV2, context: Context) => {
    console.log('Event:', event);

    const handle = serverlessExpress({ app });
    // @ts-expect-error
    return handle(event, context);
};
