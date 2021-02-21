# Working With Geo Data In DynamoDB

This code is an example based on the blog post [Working With Geo Data In DynamoDB](https://dev.to/aws-builders/working-with-geo-data-in-dynamodb-jj9)

_**WARNING**_: The API Gateway deployed with this example is NOT secured. Please remember to delete the stack when you are done.

## Deploying this code

You can deploy this example code to your AWS account by running the following commands (these commands assume you have `npm` and the AWS CLI installed, and that the AWS CLI is configured for the AWS account you wish to deploy to).

```
npm run package -- --s3-bucket <S3_BUCKET_IN_YOUR_ACCOUNT>
npm run deploy
```

NOTE: both of the above commands can have AWS CLI parameters added to them. As an example, you can run `npm run package -- --region us-west-2 --profile my-profile-name`

## Seeing it work

Once the deployment in complete you can see it in action by adding some locations and then querying. I've included an HTTP API in the deployment, so you can use `curl` to try it out. The following commands will send over some data that looks just similar to the data in the blog post.

First, get the API Gateway Endpoint from the API and set it here (you can find this in the CloudFormation output or on the API Gateway page):
```
API_GATEWAY_ENDPOINT={API gateway endpoint}
```

Then create some locations:
```
curl -X POST -H "Content-Type: application/json" --data '{ "id": "joes-ks-leawood", "name": "Joe's KC BBQ", "streetAddress": "11723 Roe Ave", "locality": "Leawood", "region": "KS", "postalCode": "66211", "country": "USA", "latitude": 38.9153287, "longitude": -94.6393130 }' "${API_GATEWAY_ENDPOINT}/locations"
```
```
curl -X POST -H "Content-Type: application/json" --data '{ "id": "burnt-end", "name": "Burnt End BBQ", "streetAddress": "11831 Metcalf Ave", "locality": "Overland Park", "region": "KS", "postalCode": "66210", "country": "USA", "latitude": 38.9136949, "longitude": -94.6669146 }' "${API_GATEWAY_ENDPOINT}/locations"
```
```
curl -X POST -H "Content-Type: application/json" --data '{ "id": "q39-south", "name": "Q39 South", "streetAddress": "11051 Antioch Rd", "locality": "Overland Park", "region": "KS", "postalCode": "66210", "country": "USA", "latitude": 38.9288068, "longitude": -94.6857324 }' "${API_GATEWAY_ENDPOINT}/locations"
```
```
curl -X POST -H "Content-Type: application/json" --data '{ "id": "brobecks", "name": "Brobeck's BBQ", "streetAddress": "4616 Indian Creek Pkwy", "locality": "Overland Park", "region": "KS", "postalCode": "66207", "country": "USA", "latitude": 38.9358898, "longitude": -94.6382943 }' "${API_GATEWAY_ENDPOINT}/locations"
```
```
curl -X POST -H "Content-Type: application/json" --data '{ "id": "the-rub", "name": "The Rub BBQ", "streetAddress": "10512 Ridgeview Rd", "locality": "Olathe", "region": "KS", "postalCode": "66061", "country": "USA", "latitude": 38.9379772, "longitude": -94.7981779 }' "${API_GATEWAY_ENDPOINT}/locations"

```

After you've run the above commands you can call the query endpoint:
```
curl -X GET "${API_GATEWAY_ENDPOINT}/query?minLatitude=38.9105&minLongitude=-94.7308&maxLatitude=38.9706&maxLongitude=-94.6194"
```

Try it with some of your own data too.
