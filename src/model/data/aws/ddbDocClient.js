// src/model/data/aws/ddbDocClient.js

'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
// Helper library for working with converting DynamoDB types to/from JS
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const logger = require('../../../logger');

/**
 * If AWS credentials are configured in the environment, use them. Normally when we connect to DynamoDB from a deployment in AWS, we won't bother with this.  But if you're testing locally, you'll need
 * these, or if you're connecting to LocalStack or DynamoDB Local
 * @returns Object | undefined
 */
const getCredentials = () => {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    // See https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/dynamodbclientconfig.html#credentials
    const credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      // Optionally include the AWS Session Token, too (e.g., if you're connecting to AWS from your laptop).
      // Not all situations require this, so we won't check for it above, just use it if it is present.
      sessionToken: process.env.AWS_SESSION_TOKEN,
    };
    logger.debug('Using extra DynamoDB Credentials');
    return credentials;
  }
};

/**
 * If an AWS DynamoDB Endpoint is configured in the environment, use it.
 * - 우선 AWS_DYNAMODB_ENDPOINT_URL
 * - AWS_DYNAMODB_ENDPOINT
 * @returns string | undefined
 */
const getDynamoDBEndpoint = () => {
  const endpoint =
    process.env.AWS_DYNAMODB_ENDPOINT_URL || process.env.AWS_DYNAMODB_ENDPOINT;

  if (endpoint) {
    logger.debug({ endpoint }, 'Using alternate DynamoDB endpoint');
    return endpoint;
  }
};

// region 은 둘 중 아무거나 있으면 사용, 없으면 us-east-1
const REGION =
  process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

// Create and configure an Amazon DynamoDB client object.
const ddbClient = new DynamoDBClient({
  region: REGION,
  endpoint: getDynamoDBEndpoint(),
  credentials: getCredentials(),
});

// Instead of exposing the ddbClient directly, we'll wrap it with a helper
// that will simplify converting data to/from DynamoDB and JavaScript (i.e.
// marshalling and unmarshalling typed attribute data)
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: {
    // Whether to automatically convert empty strings, blobs, and sets to `null`.
    convertEmptyValues: false, // false, by default.
    // Whether to remove undefined values while marshalling.
    removeUndefinedValues: false, // false, by default.
    // Whether to convert typeof object to map attribute.
    convertClassInstanceToMap: true, // we have to set this to `true` for LocalStack
  },
  unmarshallOptions: {
    // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
    wrapNumbers: false, // false, by default.
  },
});

module.exports = ddbDocClient;
