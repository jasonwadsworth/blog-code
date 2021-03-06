# Delayed Event Processing
This code is a simple implementation example based on the blog post [Delayed Event Processing - Part 1](https://dev.to/aws-builders/delayed-event-processing-part-1-40pa)

## Deploying this code
You can deploy this example code to your AWS account by running the following commands (these commands assume you have `npm` and the AWS CLI installed, and that the AWS CLI is configured for the AWS account you wish to deploy to).

```
npm run package --s3-bucket <S3_BUCKET_IN_YOUR_ACCOUNT>
npm run deploy
```

NOTE: both of the above commands can have AWS CLI parameters added to them. As an example, you can run `npm run package --region us-west-2 --profile my-profile-name`

## Seeing it work
Once the deployment in complete you can see it in action by sending some test messages. The following commands will send over some data that looks just similar to the data in the blog post. Keep in mind that you'll need to spread the messages out to really see the effects, but even just sending all these messages right away will show you the process in action.

```
aws sns publish --topic-arn <PUT_YOUR_TOPIC_ARN_HERE> --message "{ \"level\": \"WARNING\", \"message\": \"This is your first warning\", \"receivedAt\": \"2020-11-14T13: 00: 00.00000Z\", \"service\": \"Service A\" }"
aws sns publish --topic-arn <PUT_YOUR_TOPIC_ARN_HERE> --message "{ \"level\": \"ERROR\", \"message\": \"This is an error\", \"receivedAt\": \"2020-11-14T13: 05: 00.00000Z\", \"service\": \"Service A\" }"
aws sns publish --topic-arn <PUT_YOUR_TOPIC_ARN_HERE> --message "{ \"level\": \"ERROR\", \"message\": \"This is an error\", \"receivedAt\": \"2020-11-14T13: 05: 00.00000Z\", \"service\": \"Service B\" }"
aws sns publish --topic-arn <PUT_YOUR_TOPIC_ARN_HERE> --message "{ \"level\": \"WARNING\", \"message\": \"This is your second warning\", \"receivedAt\": \"2020-11-14T13: 05: 00.00000Z\", \"service\": \"Service A\" }"
aws sns publish --topic-arn <PUT_YOUR_TOPIC_ARN_HERE> --message "{ \"level\": \"WARNING\", \"message\": \"This is your first warning\", \"receivedAt\": \"2020-11-14T13: 05: 00.00000Z\", \"service\": \"Service C\"}"
```

After you've run the above commands you should see five records in the DynamoDB table. After ~5 minutes that should go down to just one, and you'll see log entries for the scheduled handler that look something like this:
```
INFO	Processing service Service A. Current batch includes 3 records.
INFO	Processing service Service B. Current batch includes 1 records.
```
