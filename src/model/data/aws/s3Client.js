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
  // ECS/EC2 Role 자동 사용
}

function getEndpoint() {
  if (process.env.AWS_S3_ENDPOINT_URL) {
    logger.debug({ endpoint: process.env.AWS_S3_ENDPOINT_URL }, 'Using custom S3 endpoint');
    return process.env.AWS_S3_ENDPOINT_URL;
  }
}

module.exports = new S3Client({
  region: process.env.AWS_REGION,
  credentials: getCredentials(),
  endpoint: getEndpoint(),
  forcePathStyle: true, // LocalStack/MinIO 호환
});
