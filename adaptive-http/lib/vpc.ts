import { Stack, StackProps } from 'aws-cdk-lib';
import { SecurityGroup, SubnetType, Vpc, InterfaceVpcEndpoint, GatewayVpcEndpointAwsService } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class VpcConstruct extends Construct {
    public readonly vpc: Vpc;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        const stack = Stack.of(this);

        // Create a VPC with only public and isolated subnets
        this.vpc = new Vpc(this, 'Vpc', {
            vpcName: 'AdaptiveHttpVpc',
            natGateways: 0,
            subnetConfiguration: [
                {
                    name: 'public',
                    subnetType: SubnetType.PUBLIC,
                },
                {
                    name: 'isolated',
                    subnetType: SubnetType.PRIVATE_ISOLATED,
                },
            ],
        });

        // S3 Gateway endpoint (required for ECR)
        this.vpc.addGatewayEndpoint('S3Endpoint', { service: GatewayVpcEndpointAwsService.S3 });

        // Create a security group for VPC endpoints
        const endpointSecurityGroup = new SecurityGroup(this, 'EndpointSecurityGroup', {
            vpc: this.vpc,
            description: 'Security group for VPC endpoints',
            allowAllOutbound: true,
            securityGroupName: 'Adaptive HTTP VPC Endpoint Security Group',
        });

        // ECR API endpoint
        new InterfaceVpcEndpoint(this, 'EcrApiEndpoint', {
            vpc: this.vpc,
            service: { name: `com.amazonaws.${stack.region}.ecr.api`, port: 443 },
            subnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
            securityGroups: [endpointSecurityGroup],
            privateDnsEnabled: true,
        });

        // ECR Docker endpoint
        new InterfaceVpcEndpoint(this, 'EcrDockerEndpoint', {
            vpc: this.vpc,
            service: { name: `com.amazonaws.${stack.region}.ecr.dkr`, port: 443 },
            subnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
            securityGroups: [endpointSecurityGroup],
            privateDnsEnabled: true,
        });

        // CloudWatch Logs endpoint
        new InterfaceVpcEndpoint(this, 'CloudWatchLogsEndpoint', {
            vpc: this.vpc,
            service: { name: `com.amazonaws.${stack.region}.logs`, port: 443 },
            subnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
            securityGroups: [endpointSecurityGroup],
            privateDnsEnabled: true,
        });
    }
}
