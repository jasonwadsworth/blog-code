import { Duration } from 'aws-cdk-lib';
import { Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerImage, ContainerInsights, DeploymentControllerType, FargateService, FargateTaskDefinition, LogDrivers } from 'aws-cdk-lib/aws-ecs';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { Construct } from 'constructs';
import { join } from 'path';

export class EcsConstruct extends Construct {
    public readonly fargateService: FargateService;
    public readonly cluster: Cluster;

    constructor(scope: Construct, id: string, props: { vpc: Vpc; loadBalancerSecurityGroup: SecurityGroup }) {
        super(scope, id);

        const { vpc, loadBalancerSecurityGroup } = props;

        // Create an ECS cluster
        this.cluster = new Cluster(this, 'Cluster', {
            vpc,
            containerInsightsV2: ContainerInsights.ENABLED,
            clusterName: 'AdaptiveHttpCluster',
        });

        // Build Docker image from local Dockerfile
        const dockerImage = new DockerImageAsset(this, 'DockerImage', {
            directory: join(__dirname, '..'),
            file: 'Dockerfile',
            displayName: 'AdaptiveHttpImage',
        });

        // Create a Fargate task definition
        const taskDefinition = new FargateTaskDefinition(this, 'TaskDefinition', {
            memoryLimitMiB: 512,
            cpu: 256,
            family: 'AdaptiveHttpTaskDefinition',
        });

        // Add CloudWatch Logs permissions to the task execution role
        taskDefinition.executionRole?.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess'));

        // Add container to the task definition
        const container = taskDefinition.addContainer('Container', {
            containerName: 'AdaptiveHttpContainer',
            image: ContainerImage.fromDockerImageAsset(dockerImage),
            logging: LogDrivers.awsLogs({
                streamPrefix: 'express-app',
                logRetention: RetentionDays.ONE_WEEK,
            }),
            environment: {
                NODE_ENV: 'production',
                PORT: '3000',
            },
            healthCheck: {
                command: ['CMD-SHELL', 'wget --no-verbose --tries=1 --spider http://localhost:3000/health?from=container || exit 1'],
                interval: Duration.seconds(10),
                timeout: Duration.seconds(2),
                retries: 3,
                startPeriod: Duration.seconds(30),
            },
        });

        // Add port mapping to the container
        container.addPortMappings({
            containerPort: 3000,
        });

        // Create a security group for the Fargate service
        const serviceSecurityGroup = new SecurityGroup(this, 'ServiceSecurityGroup', {
            vpc,
            description: 'Security group for the Fargate service',
            allowAllOutbound: true,
            securityGroupName: 'Adaptive Http Service Security Group',
        });

        // Allow traffic from the load balancer to the Fargate service on port 3000
        serviceSecurityGroup.addIngressRule(loadBalancerSecurityGroup, Port.tcp(3000), 'Allow traffic from ALB to Fargate service');

        // Create a Fargate service
        this.fargateService = new FargateService(this, 'FargateService', {
            serviceName: 'AdaptiveHttpService',
            cluster: this.cluster,
            taskDefinition,
            desiredCount: 1,
            assignPublicIp: false,
            minHealthyPercent: 50,
            maxHealthyPercent: 200,
            securityGroups: [serviceSecurityGroup],
            deploymentController: {
                type: DeploymentControllerType.ECS,
            },
        });

        // // Set up auto scaling
        // const scaling = this.fargateService.autoScaleTaskCount({
        //     minCapacity: 0,
        //     maxCapacity: 10,
        // });

        // // Scale based on CPU utilization
        // scaling.scaleOnCpuUtilization('CpuScaling', {
        //     targetUtilizationPercent: 70,
        //     scaleInCooldown: Duration.seconds(60),
        //     scaleOutCooldown: Duration.seconds(60),
        //     policyName: 'CpuScalingPolicy',
        // });
    }
}
