
'use strict';

const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

const logger = require('../../../logger');
const s3 = require('./s3Client');

const ddbDocClient = require('./ddbDocClient');
const {
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');

// env 없을 때도 안전하게 기본값 사용
const BUCKET = process.env.AWS_S3_BUCKET_NAME || 'fragments';
const TABLE_NAME = process.env.AWS_DYNAMODB_TABLE_NAME || 'fragments';

logger.debug(
  { BUCKET, TABLE_NAME },
  'AWS data layer configured (S3 bucket / DynamoDB table)'
);

async function writeFragment(fragmentMeta) {
  if (!TABLE_NAME) {
    const e = new Error('AWS_DYNAMODB_TABLE_NAME is not set');
    logger.error({ e }, 'DynamoDB table name missing');
    throw e;
  }

  const params = {
    TableName: TABLE_NAME,
    Item: fragmentMeta,
  };

  const command = new PutCommand(params);

  try {
    await ddbDocClient.send(command);
    // 저장한 meta 그대로 리턴
    return fragmentMeta;
  } catch (err) {
    logger.error(
      { err, params, fragmentMeta },
      'error writing fragment metadata to DynamoDB'
    );
    throw err;
  }
}

async function readFragment(ownerId, id) {
  const params = {
    TableName: TABLE_NAME,
    Key: { ownerId, id },
  };

  const command = new GetCommand(params);

  try {
    const data = await ddbDocClient.send(command);
    return data?.Item;
  } catch (err) {
    logger.warn({ err, params }, 'error reading fragment from DynamoDB');
    throw err;
  }
}

async function listFragments(ownerId, expand = false) {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'ownerId = :ownerId',
    ExpressionAttributeValues: {
      ':ownerId': ownerId,
    },
  };

  if (!expand) {
    params.ProjectionExpression = 'id';
  }

  const command = new QueryCommand(params);

  try {
    const data = await ddbDocClient.send(command);
    const items = data?.Items || [];

    if (!expand) {
      return items.map((item) => item.id);
    }

    return items;
  } catch (err) {
    logger.error(
      { err, params },
      'error getting all fragments for user from DynamoDB'
    );
    throw err;
  }
}

const keyOf = (ownerId, id) => `${ownerId}/${id}`;

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

async function writeFragmentData(ownerId, id, buffer) {
  const Key = keyOf(ownerId, id);

  if (!BUCKET) {
    const e = new Error('AWS_S3_BUCKET_NAME is not set');
    logger.error({ e }, 'S3 bucket name missing');
    throw e;
  }

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key,
        Body: buffer,
      })
    );
  } catch (err) {
    logger.error({ err, bucket: BUCKET, key: Key }, 'S3 PutObject failed');
    throw new Error('unable to upload fragment data');
  }
}

async function readFragmentData(ownerId, id) {
  const Key = keyOf(ownerId, id);

  if (!BUCKET) {
    const e = new Error('AWS_S3_BUCKET_NAME is not set');
    logger.error({ e }, 'S3 bucket name missing (read)');
    throw e;
  }

  try {
    const out = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key,
      })
    );
    return await streamToBuffer(out.Body);
  } catch (err) {
    logger.warn({ err, bucket: BUCKET, key: Key }, 'S3 GetObject failed');
    return undefined;
  }
}

async function deleteFragment(ownerId, id) {
  const meta = await readFragment(ownerId, id);
  if (!meta) {
    const e = new Error('not found');
    e.code = 'NotFound';
    throw e;
  }

  const Key = keyOf(ownerId, id);

  if (!BUCKET) {
    const e = new Error('AWS_S3_BUCKET_NAME is not set');
    logger.error({ e }, 'S3 bucket name missing (delete)');
    throw e;
  }

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key,
      })
    );
  } catch (err) {
    logger.warn(
      { err, bucket: BUCKET, key: Key },
      'S3 DeleteObject failed (ignored)'
    );
  }

  const params = {
    TableName: TABLE_NAME,
    Key: { ownerId, id },
  };
  const command = new DeleteCommand(params);

  try {
    await ddbDocClient.send(command);
  } catch (err) {
    logger.error(
      { err, params },
      'error deleting fragment metadata from DynamoDB'
    );
    throw err;
  }
}

module.exports = {
  writeFragment,
  readFragment,
  listFragments,
  writeFragmentData,
  readFragmentData,
  deleteFragment,
};
