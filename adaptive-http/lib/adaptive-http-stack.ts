import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { ApplicationProtocol, ApplicationTargetGroup, ListenerAction, TargetType } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { VpcConstruct } from './vpc';
import { AlbConstruct } from './alb';
import { EcsConstruct } from './ecs';
import { ExpressLambdaConstruct } from './express-lambda';
import { EventBridgeLambdaConstruct } from './event-bridge-lambda';
import { HostedZone, RecordSet, RecordTarget, RecordType } from 'aws-cdk-lib/aws-route53';
import { LambdaTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';

export class AdaptiveHttpStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const zone = new HostedZone(this, 'HostedZone', {
            zoneName: 'adaptive.boxturtlebytes.com',
            comment: 'Hosted zone for adaptive.boxturtlebytes.com',
        });

        const { vpc } = new VpcConstruct(this, 'VpcConstruct');
        const { loadBalancer, securityGroup: loadBalancerSecurityGroup } = new AlbConstruct(this, 'AlbConstruct', { vpc });
        const { cluster, fargateService } = new EcsConstruct(this, 'EcsConstruct', { vpc, loadBalancerSecurityGroup });
        const { expressLambda } = new ExpressLambdaConstruct(this, 'ExpressLambdaConstruct');

        // Create a self-signed certificate for the ALB
        const certificate = new Certificate(this, 'Certificate', {
            domainName: 'internal.adaptive.boxturtlebytes.com',
            validation: CertificateValidation.fromDns(zone),
        });

        new RecordSet(this, 'ALBRecordSet', {
            recordType: RecordType.CNAME,
            recordName: 'internal.adaptive.boxturtlebytes.com',
            target: RecordTarget.fromValues(loadBalancer.loadBalancerDnsName),
            zone,
        });

        // Create a target group for the Fargate service
        const ecsTargetGroup = new ApplicationTargetGroup(this, 'TargetGroup', {
            targetGroupName: 'ECSTargetGroup',
            vpc,
            port: 3000,
            protocol: ApplicationProtocol.HTTP,
            targetType: TargetType.IP,
            healthCheck: {
                path: '/health?from=alb',
                interval: Duration.seconds(30),
                timeout: Duration.seconds(5),
            },
        });

        // Register the Fargate service as targets
        ecsTargetGroup.addTarget(fargateService);

        // Create a Lambda target group for the ALB
        const lambdaTargetGroup = new ApplicationTargetGroup(this, 'LambdaTargetGroup', {
            targetType: TargetType.LAMBDA,
            targets: [new LambdaTarget(expressLambda)],
        });

        // Create HTTPS listener for the ALB
        const httpsListener = loadBalancer.addListener('HttpsListener', {
            port: 443,
            certificates: [certificate],
            open: true,
            defaultAction: ListenerAction.forward([ecsTargetGroup, lambdaTargetGroup]),
        });

        new EventBridgeLambdaConstruct(this, 'EventBridgeLambdaConstruct', {
            cluster,
            ecsTargetGroup,
            fargateService,
            httpsListener,
            lambdaTargetGroup,
            loadBalancer,
        });
    }
}
