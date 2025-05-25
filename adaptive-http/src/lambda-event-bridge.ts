import { Handler, EventBridgeEvent } from 'aws-lambda';
import { ElasticLoadBalancingV2Client, DescribeListenersCommand, ModifyListenerCommand } from '@aws-sdk/client-elastic-load-balancing-v2';
import { ECSClient, UpdateServiceCommand } from '@aws-sdk/client-ecs';

type AlarmEventDetail = {
    alarmName: string;
    state: State;
    previousState: State;
    configuration: {
        metrics: {
            id: string;
            metricStat: {
                metric: {
                    namespace: string;
                    name: string;
                    dimensions: {
                        LoadBalancer: string;
                    };
                };
                period: number;
                stat: string;
            };
            returnData: boolean;
        }[];
        description: string;
    };
};

type StateValue = 'OK' | 'ALARM' | 'INSUFFICIENT_DATA';
type State = {
    value: StateValue;
    reason: string;
    reasonData: string;
    timestamp: string;
};

const elbv2Client = new ElasticLoadBalancingV2Client({});
const ecsClient = new ECSClient({});

export const handler: Handler = async (event: EventBridgeEvent<'CloudWatch Alarm State Change', AlarmEventDetail>) => {
    // Log the full EventBridge event
    console.log('Received EventBridge event:', event);

    if (!process.env.LISTENER_ARN) {
        console.error('LISTENER_ARN environment variable is not set');
        return;
    }
    if (!process.env.ECS_SERVICE_NAME) {
        console.error('ECS_SERVICE_NAME environment variable is not set');
        return;
    }
    if (!process.env.ECS_TARGET_GROUP_ARN) {
        console.error('ECS_TARGET_GROUP_ARN environment variable is not set');
        return;
    }
    if (!process.env.LAMBDA_TARGET_GROUP_ARN) {
        console.error('LAMBDA_TARGET_GROUP_ARN environment variable is not set');
        return;
    }

    if (event.detail.state.value === 'ALARM' && event.detail.previousState.value === 'OK') {
        // when there is no traffic we want to switch the listener to the lambda function
        console.log('Alarm state changed to ALARM, meaning there is no traffic. Switching load to Lambda and turning down ECS');
        await modifyListener({
            ecsTargetGroupArn: process.env.ECS_TARGET_GROUP_ARN,
            ecsWeight: 0,
            lambdaTargetGroupArn: process.env.LAMBDA_TARGET_GROUP_ARN,
            lambdaWeight: 100,
            listenerArn: process.env.LISTENER_ARN,
        });

        console.log('Switching ECS service to 0 desired count');
        // stop the ECS service
        await ecsClient.send(
            new UpdateServiceCommand({
                cluster: process.env.ECS_CLUSTER_NAME,
                service: process.env.ECS_SERVICE_NAME,
                desiredCount: 0,
            }),
        );
    }

    // once we start receiving traffic we want to switch the listener back to the ECS cluster
    if (event.detail.state.value === 'OK' && event.detail.previousState.value === 'ALARM') {
        console.log('Alarm state changed to OK, meaning there is traffic. Switching load to ECS and turning on ECS');

        // even though this is set to 0 on Lambda it will still send traffic there as long as ECS is unhealthy (still coming up)
        await modifyListener({
            ecsTargetGroupArn: process.env.ECS_TARGET_GROUP_ARN,
            ecsWeight: 100,
            lambdaTargetGroupArn: process.env.LAMBDA_TARGET_GROUP_ARN,
            lambdaWeight: 0,
            listenerArn: process.env.LISTENER_ARN,
        });

        console.log('Switching ECS service to 1 desired count');
        // stop the ECS service
        await ecsClient.send(
            new UpdateServiceCommand({
                cluster: process.env.ECS_CLUSTER_NAME,
                service: process.env.ECS_SERVICE_NAME,
                desiredCount: 1,
            }),
        );
    }
};

async function modifyListener({
    ecsTargetGroupArn,
    ecsWeight,
    lambdaTargetGroupArn,
    lambdaWeight,
    listenerArn,
}: {
    ecsTargetGroupArn: string;
    ecsWeight: number;
    lambdaTargetGroupArn: string;
    lambdaWeight: number;
    listenerArn: string;
}) {
    const current = await elbv2Client.send(
        new DescribeListenersCommand({
            ListenerArns: [listenerArn],
        }),
    );

    console.log('Current listener:', current);

    if (current.Listeners && current.Listeners.length === 1) {
        await elbv2Client.send(
            new ModifyListenerCommand({
                ...current.Listeners[0],
                ListenerArn: listenerArn,
                DefaultActions: [
                    {
                        ForwardConfig: {
                            TargetGroups: [
                                {
                                    TargetGroupArn: ecsTargetGroupArn,
                                    Weight: ecsWeight,
                                },
                                {
                                    TargetGroupArn: lambdaTargetGroupArn,
                                    Weight: lambdaWeight,
                                },
                            ],
                        },
                        Type: 'forward',
                    },
                ],
            }),
        );
    }
}
