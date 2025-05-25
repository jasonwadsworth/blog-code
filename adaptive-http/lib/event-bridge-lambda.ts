import { Duration } from 'aws-cdk-lib';
import { Cluster, FargateService } from 'aws-cdk-lib/aws-ecs';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { ApplicationListener, ApplicationLoadBalancer, ApplicationTargetGroup } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { join } from 'path';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LoggingFormat, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Alarm, ComparisonOperator, Metric, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';

type Props = {
    cluster: Cluster;
    ecsTargetGroup: ApplicationTargetGroup;
    fargateService: FargateService;
    httpsListener: ApplicationListener;
    lambdaTargetGroup: ApplicationTargetGroup;
    loadBalancer: ApplicationLoadBalancer;
};
export class EventBridgeLambdaConstruct extends Construct {
    constructor(scope: Construct, id: string, props: Props) {
        super(scope, id);

        const { cluster, ecsTargetGroup, fargateService, httpsListener, lambdaTargetGroup, loadBalancer } = props;

        // Create Lambda function for EventBridge load balancer events
        const eventBridgeLambda = new NodejsFunction(this, 'EventBridgeLambda', {
            runtime: Runtime.NODEJS_22_X,
            functionName: 'AdaptiveHttpEventBridgeLambda',
            entry: join(__dirname, '..', 'src/lambda-event-bridge.ts'),
            timeout: Duration.seconds(30),
            memorySize: 256,
            bundling: { minify: true, sourceMap: true },
            environment: {
                NODE_OPTIONS: '--enable-source-maps',
                ECS_CLUSTER_NAME: cluster.clusterName,
                ECS_SERVICE_NAME: fargateService.serviceName,
                LISTENER_ARN: httpsListener.listenerArn,
                ECS_TARGET_GROUP_ARN: ecsTargetGroup.targetGroupArn,
                LAMBDA_TARGET_GROUP_ARN: lambdaTargetGroup.targetGroupArn,
            },
            loggingFormat: LoggingFormat.JSON,
            initialPolicy: [
                new PolicyStatement({
                    actions: ['elasticloadbalancing:DescribeListeners', 'elasticloadbalancing:ModifyListener'],
                    // TODO: Scope this down to specific ARNs
                    resources: ['*'],
                }),
                new PolicyStatement({
                    actions: ['ecs:UpdateService', 'autoscaling:SuspendProcesses', 'autoscaling:ResumeProcesses', 'ecs:DescribeServices'],
                    // TODO: Scope this down to specific ARNs
                    resources: ['*'],
                }),
            ],
        });

        // Grant permissions for EventBridge to invoke the Lambda function
        eventBridgeLambda.addPermission('AllowEventBridgeInvoke', {
            principal: new ServicePrincipal('events.amazonaws.com'),
        });

        // Grant permissions for ELBv2 describe actions
        eventBridgeLambda.addToRolePolicy(
            new PolicyStatement({
                actions: ['elasticloadbalancing:DescribeTargetGroups', 'elasticloadbalancing:DescribeTargetHealth'],
                resources: ['*'], // You can scope this down to specific ARNs if desired
            }),
        );

        // Create EventBridge rule for CloudWatch metric updates (specific to the ALB high traffic alarm)
        const cloudWatchMetricRule = new Rule(this, 'CloudWatchMetricUpdateRule', {
            eventPattern: {
                source: ['aws.cloudwatch'],
                detailType: ['CloudWatch Alarm State Change'],
                detail: {
                    alarmName: ['AlbLowTrafficAlarm'],
                },
            },
            targets: [new LambdaFunction(eventBridgeLambda)],
        });

        // Create a CloudWatch metric for ALB request count
        const albRequestCountMetric = new Metric({
            namespace: 'AWS/ApplicationELB',
            metricName: 'HTTPCode_Target_2XX_Count',
            dimensionsMap: {
                LoadBalancer: loadBalancer.loadBalancerFullName,
            },
            statistic: 'Sum',
            period: Duration.minutes(5),
        });

        // Create a CloudWatch alarm for low traffic to the ALB
        const albLowTrafficAlarm = new Alarm(this, 'AlbLowTrafficAlarm', {
            metric: albRequestCountMetric,
            threshold: 1, // adjust threshold as needed
            evaluationPeriods: 2,
            comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
            treatMissingData: TreatMissingData.BREACHING,
            alarmDescription: 'Alarm when ALB request count is below 1 in 5 minute',
            alarmName: 'AlbLowTrafficAlarm',
        });
    }
}
