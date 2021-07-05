# Working With Hierarchy Data In DynamoDB

This code is an example based on the blog post [Working With Hierarchy Data In DynamoDB](https://jason.wadsworth.dev/working-with-hierarchy-data-in-dynamodb).

_**WARNING**_: The API Gateway deployed with this example is NOT secured. Please remember to delete the stack when you are done.

## Deploying this code

Assuming you have `npm` installed, as well as have AWS credentials configured, you can deploy this example code to your AWS account by running the following commands.

```
npm ci
npx cdk deploy
```

NOTE: the `cdk deploy` command can include additional arguments, like `--region` and `--profile`

## Seeing it work

Once the deployment is complete, you can see it in action by seeding it with some data. I've included a script that will load up some sample data, or you can make calls to the API yourself.

To seed it with the script you can run the command `npx ts-node seed.ts <API Gateway Invoke URL>` where `<API Gateway Invoke URL>` is the URL of the deployed API.

To post your own data you can call the endpoint by performing a `POST` request to `<API Gateway Invoke URL>/nodes`, supplying a body with a `name` and optional `parentId`

```JSON
POST https://example.com/nodes/
{
    "name": "My test node",
    "parentId": "d0b5b117-4eb0-4ffa-86cb-f88ed5676221"
}
```

To query the data you perform a `GET` request to `<API Gateway Invoke URL>/nodes/{id}/list`, where `{id}` is the ID of the node you want to query, and optionally supply the `minRelativeDepth` and/or `maxRelativeDepth` as query parameters.

```text
GET https://example.com/nodes/6aca3c6a-c74d-4568-b93d-f2a5af05db78/list?minRelativeDepth=1&maxRelativeDepth=2
```

To move a node perform a `PUT` request to `<API Gateway Invoke URL>/nodes/{id}/move` and pass in a body that includes the new `parentId`.

```JSON
POST https://example.com/nodes/b77d18b3-345d-4a03-8e38-298f1383123a/move
{
    "parentId": "d0b5b117-4eb0-4ffa-86cb-f88ed5676221"
}
```

When you're done just run the `cdk destroy` command (be sure to pass in the same arguments as you did when creating the stack).

```shell
npx cdk destroy
```
