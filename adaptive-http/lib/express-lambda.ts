import { Duration } from 'aws-cdk-lib';
import { PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { join } from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LoggingFormat, Runtime } from 'aws-cdk-lib/aws-lambda';

export class ExpressLambdaConstruct extends Construct {
    public readonly expressLambda: NodejsFunction;
    constructor(scope: Construct, id: string) {
        super(scope, id);

        // Create Lambda function
        this.expressLambda = new NodejsFunction(this, 'ExpressLambda', {
            runtime: Runtime.NODEJS_22_X,
            functionName: 'AdaptiveHttpExpressLambda',
            entry: join(__dirname, '..', 'src/lambda.ts'),
            timeout: Duration.seconds(30),
            memorySize: 512,
            bundling: { minify: true, sourceMap: true },
            environment: {
                NODE_OPTIONS: '--enable-source-maps',
                NODE_ENV: 'production',
            },
            loggingFormat: LoggingFormat.JSON,
        });

        // Grant permissions for ALB to invoke the Lambda function
        const lambdaPermission = new PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            resources: [this.expressLambda.functionArn],
        });

        const lambdaRole = new Role(this, 'LambdaInvokeRole', {
            assumedBy: new ServicePrincipal('elasticloadbalancing.amazonaws.com'),
        });

        lambdaRole.addToPolicy(lambdaPermission);
    }
}
