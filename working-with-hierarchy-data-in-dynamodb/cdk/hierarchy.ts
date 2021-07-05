#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ClientStack } from './hierarchy-stack';

const app = new cdk.App();
new ClientStack(app, 'WorkingWithHierarchyDataInDynamoDB', {
    description: "Working with hierarchy data in DynamoDB",
    stackName: "WorkingWithHierarchyDataInDynamoDB",
});
