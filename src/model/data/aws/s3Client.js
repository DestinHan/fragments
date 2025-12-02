'use strict';

const { S3Client } = require('@aws-sdk/client-s3');
const logger = require('../../../logger');

function getCredentials() {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    logger.debug('Using explicit AWS credentials from env');
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    };
  }

  return undefined;
}

function getEndpoint() {
  const url =
    process.env.AWS_S3_ENDPOINT_URL || process.env.AWS_S3_ENDPOINT;

  if (url) {
    logger.debug({ endpoint: url }, 'Using custom S3 endpoint');
    return url;
  }
  return undefined;
}

const REGION =
  process.env.AWS_REGION ||
  process.env.AWS_DEFAULT_REGION ||
  'us-east-1';

module.exports = new S3Client({
  region: REGION,
  credentials: getCredentials(),
  endpoint: getEndpoint(),
  forcePathStyle: true,
});
