import { CfnOutput } from 'aws-cdk-lib';
import { Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ApplicationLoadBalancer, IpAddressType } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

export class AlbConstruct extends Construct {
    public readonly loadBalancer: ApplicationLoadBalancer;
    public readonly securityGroup: SecurityGroup;

    constructor(scope: Construct, id: string, props: { vpc: Vpc }) {
        super(scope, id);

        const { vpc } = props;

        // Create a security group for the load balancer
        this.securityGroup = new SecurityGroup(this, 'LBSecurityGroup', {
            vpc,
            description: 'Security group for the application load balancer',
            allowAllOutbound: true,
            securityGroupName: 'Adaptive HTTP ALB',
        });

        // Create an Application Load Balancer
        this.loadBalancer = new ApplicationLoadBalancer(this, 'ALB', {
            vpc,
            internetFacing: true,
            securityGroup: this.securityGroup,
            loadBalancerName: 'AdaptiveHttp',
        });

        // Output the ALB DNS name
        new CfnOutput(this, 'LoadBalancerDNS', {
            value: this.loadBalancer.loadBalancerDnsName,
            description: 'DNS name of the Application Load Balancer',
        });
    }
}
