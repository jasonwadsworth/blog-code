# Adaptive HTTP Service

An adaptive HTTP service built with AWS CDK that deploys an Express application in a Fargate container, as well as in Lambda, behind an application load balancer. The architecture includes a CloudWatch Alarm that triggers a function to update the ALB target group weights as well as the ECS service task count.

## Architecture

```
    Clients
       |
       v
    Application Load Balancer
       |
       +--> ECS Target Group (Express App in Fargate)
       |
       +--> Lambda Target Group (Express App via Lambda)
```

### Steps to Deploy

1. Install dependencies:
```
   npm install
```

2. Build the project:
```
   npm run build
```

3. Deploy the CDK stack:
```
   npx cdk deploy
```
