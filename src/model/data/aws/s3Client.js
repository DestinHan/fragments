// src/model/data/aws/s3Client.js
'use strict';

const { S3Client } = require('@aws-sdk/client-s3');
const logger = require('../../../logger');

/**
 * AWS Credentials 설정
 *  - LocalStack(CI), 로컬 개발환경 모두 지원
 *  - AWS 자격 증명 없으면 ECS/EC2 IAM Role 자동 사용
 */
function getCredentials() {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    logger.debug('Using explicit AWS credentials from env');
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    };
  }

  // IAM Role 자동 사용
  return undefined;
}

/**
 * S3 endpoint 설정 (LocalStack)
 *  - AWS_S3_ENDPOINT_URL 또는 AWS_S3_ENDPOINT 중 하나 사용
 */
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

  /**
   * 🔥 핵심 옵션: LocalStack에서는 반드시 true
   * 서브도메인 방식 (fragments.localhost:4566) 비활성화하고
   * path-style 방식 (localhost:4566/fragments/key) 사용하도록 강제
   */
  forcePathStyle: true,
});
