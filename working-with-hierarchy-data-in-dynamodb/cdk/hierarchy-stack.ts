import { Stack, Construct, StackProps, Fn, Duration, RemovalPolicy } from '@aws-cdk/core';
import { AttributeType, BillingMode, ProjectionType, Table } from '@aws-cdk/aws-dynamodb';
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from '@aws-cdk/aws-logs';

export class ClientStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const table = new Table(this, 'Table', {
            partitionKey: {
                name: 'id',
                type: AttributeType.STRING
            },
            sortKey: {
                name: 'relativeDepth',
                type: AttributeType.NUMBER
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.DESTROY
        });

        table.addGlobalSecondaryIndex({
            indexName: 'gsi1',
            partitionKey: {
                name: 'ancestorId',
                type: AttributeType.STRING
            },
            sortKey: {
                name: 'relativeDepth',
                type: AttributeType.NUMBER
            },
            projectionType: ProjectionType.ALL
        });

        const httpApi = new HttpApi(this, 'HttpApi', {});

        const deleteNodeApi = new NodejsFunction(
            this,
            'DeleteNodeApi',
            {
                entry: './src/delete-node/api.ts',
                timeout: Duration.seconds(15),
                environment: {
                    TableName: table.tableName,
                },
            }
        );

        table.grantReadWriteData(deleteNodeApi);

        new LogGroup(this, 'DeleteNodeApiLogGroup', {
            logGroupName: `/aws/lambda/${deleteNodeApi.functionName}`,
            retention: RetentionDays.TWO_WEEKS,
            removalPolicy: RemovalPolicy.DESTROY
        });

        httpApi.addRoutes({
            integration: new LambdaProxyIntegration({ handler: deleteNodeApi, }),
            path: '/nodes/{id}',
            methods: [HttpMethod.DELETE]
        });

        const getNodeApi = new NodejsFunction(
            this,
            'GetNodeApi',
            {
                entry: './src/get-node/api.ts',
                timeout: Duration.seconds(15),
                environment: {
                    TableName: table.tableName,
                },
            }
        );

        table.grantReadData(getNodeApi);

        new LogGroup(this, 'GetNodeApiLogGroup', {
            logGroupName: `/aws/lambda/${getNodeApi.functionName}`,
            retention: RetentionDays.TWO_WEEKS,
            removalPolicy: RemovalPolicy.DESTROY
        });

        httpApi.addRoutes({
            integration: new LambdaProxyIntegration({ handler: getNodeApi, }),
            path: '/nodes/{id}',
            methods: [HttpMethod.GET]
        });

        const saveNodeApi = new NodejsFunction(
            this,
            'SaveNodeApi',
            {
                entry: './src/save-node/api.ts',
                timeout: Duration.seconds(15),
                environment: {
                    TableName: table.tableName,
                },
            }
        );

        table.grantReadWriteData(saveNodeApi);

        new LogGroup(this, 'SaveNodeApiLogGroup', {
            logGroupName: `/aws/lambda/${saveNodeApi.functionName}`,
            retention: RetentionDays.TWO_WEEKS,
            removalPolicy: RemovalPolicy.DESTROY
        });

        httpApi.addRoutes({
            integration: new LambdaProxyIntegration({ handler: saveNodeApi, }),
            path: '/nodes',
            methods: [HttpMethod.POST]
        });

        httpApi.addRoutes({
            integration: new LambdaProxyIntegration({ handler: saveNodeApi, }),
            path: '/nodes/{id}/update-name',
            methods: [HttpMethod.PUT]
        });

        httpApi.addRoutes({
            integration: new LambdaProxyIntegration({ handler: saveNodeApi, }),
            path: '/nodes/{id}/move',
            methods: [HttpMethod.PUT]
        });

        const listNodesApi = new NodejsFunction(
            this,
            'ListNodesApi',
            {
                entry: './src/list-nodes/api.ts',
                timeout: Duration.seconds(15),
                environment: {
                    TableName: table.tableName,
                },
            }
        );

        table.grantReadData(listNodesApi);

        new LogGroup(this, 'ListNodesApiLogGroup', {
            logGroupName: `/aws/lambda/${listNodesApi.functionName}`,
            retention: RetentionDays.TWO_WEEKS,
            removalPolicy: RemovalPolicy.DESTROY
        });

        httpApi.addRoutes({
            integration: new LambdaProxyIntegration({ handler: listNodesApi, }),
            path: '/nodes/{id}/list',
            methods: [HttpMethod.GET]
        });
    }
}
