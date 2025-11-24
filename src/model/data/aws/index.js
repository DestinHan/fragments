// src/model/data/aws/index.js
'use strict';

const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

const {
  DynamoDBClient,
  ListTablesCommand,
  CreateTableCommand,
  DescribeTableCommand,
} = require('@aws-sdk/client-dynamodb');

const logger = require('../../../logger');
const s3 = require('./s3Client');

// ✅ DynamoDB Document Client + Commands
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

// DynamoDB 로우 클라이언트 (테이블 존재 여부 확인용)
const DDB_REGION = process.env.AWS_DEFAULT_REGION || 'us-east-1';
const DDB_ENDPOINT =
  process.env.AWS_DYNAMODB_ENDPOINT || 'http://localhost:8000';

const ddbClientRaw = new DynamoDBClient({
  region: DDB_REGION,
  endpoint: DDB_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    sessionToken: process.env.AWS_SESSION_TOKEN || 'test',
  },
});

logger.debug(
  { BUCKET, TABLE_NAME },
  'AWS data layer configured (S3 bucket / DynamoDB table)'
);

// =======================================================
//  DynamoDB 테이블 보장 (없으면 생성) - lazy ensure
// =======================================================

let tableEnsured = false;

/**
 * DynamoDB 에 TABLE_NAME 이 존재하는지 확인하고,
 * 없으면 바로 생성한다. 여러 번 호출해도 한 번만 동작하도록
 * tableEnsured 플래그로 막아둠.
 */
async function ensureDynamoTable() {
  if (tableEnsured) return;

  if (!TABLE_NAME) {
    const e = new Error('AWS_DYNAMODB_TABLE_NAME is not set');
    logger.error({ e }, 'DynamoDB table name missing');
    throw e;
  }

  try {
    logger.debug(
      { TABLE_NAME, DDB_ENDPOINT, DDB_REGION },
      'Ensuring DynamoDB table exists'
    );

    const list = await ddbClientRaw.send(new ListTablesCommand({}));
    if (list.TableNames && list.TableNames.includes(TABLE_NAME)) {
      logger.debug({ TABLE_NAME }, 'DynamoDB table already exists');
      tableEnsured = true;
      return;
    }

    logger.warn({ TABLE_NAME }, 'DynamoDB table missing, creating…');

    await ddbClientRaw.send(
      new CreateTableCommand({
        TableName: TABLE_NAME,
        AttributeDefinitions: [
          { AttributeName: 'ownerId', AttributeType: 'S' },
          { AttributeName: 'id', AttributeType: 'S' },
        ],
        KeySchema: [
          { AttributeName: 'ownerId', KeyType: 'HASH' },
          { AttributeName: 'id', KeyType: 'RANGE' },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 10,
          WriteCapacityUnits: 5,
        },
      })
    );

    // 로컬 DynamoDB 는 거의 바로 ACTIVE 되지만, 안전하게 한 번 더 확인
    await ddbClientRaw.send(
      new DescribeTableCommand({ TableName: TABLE_NAME })
    );

    logger.info({ TABLE_NAME }, 'DynamoDB table created and ready');
    tableEnsured = true;
  } catch (err) {
    logger.error(
      { err, TABLE_NAME, DDB_ENDPOINT },
      'Failed to ensure DynamoDB table'
    );
    throw err;
  }
}

// =======================
// 메타데이터 (DynamoDB)
// =======================

// fragmentMeta: { ownerId, id, created, updated, type, size }
async function writeFragment(fragmentMeta) {
  await ensureDynamoTable();

  const params = {
    TableName: TABLE_NAME,
    Item: fragmentMeta,
  };

  const command = new PutCommand(params);

  try {
    await ddbDocClient.send(command);
    // 기존 MemoryDB 버전처럼, 저장한 meta 그대로 리턴
    return fragmentMeta;
  } catch (err) {
    logger.error(
      { err, params, fragmentMeta },
      'error writing fragment metadata to DynamoDB'
    );
    throw err;
  }
}

// Reads a fragment from DynamoDB. Returns a Promise<fragment|undefined>
async function readFragment(ownerId, id) {
  await ensureDynamoTable();

  const params = {
    TableName: TABLE_NAME,
    Key: { ownerId, id },
  };

  const command = new GetCommand(params);

  try {
    const data = await ddbDocClient.send(command);
    // 없으면 data.Item 이 undefined
    return data?.Item;
  } catch (err) {
    logger.warn({ err, params }, 'error reading fragment from DynamoDB');
    throw err;
  }
}

// Get a list of fragments, either ids-only, or full Objects, for the given user.
async function listFragments(ownerId, expand = false) {
  await ensureDynamoTable();

  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'ownerId = :ownerId',
    ExpressionAttributeValues: {
      ':ownerId': ownerId,
    },
  };

  // expand=false 이면 id만 가져오기
  if (!expand) {
    params.ProjectionExpression = 'id';
  }

  const command = new QueryCommand(params);

  try {
    const data = await ddbDocClient.send(command);
    const items = data?.Items || [];

    if (!expand) {
      // [ { id: '...' }, { id: '...' } ] → [ '...', '...' ]
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

// =======================
// 데이터 (S3)
// =======================

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
    // 없거나 권한 문제일 수 있음: 상위에서 404를 내므로 undefined 반환
    logger.warn({ err, bucket: BUCKET, key: Key }, 'S3 GetObject failed');
    return undefined;
  }
}

async function deleteFragment(ownerId, id) {
  await ensureDynamoTable();

  // 1) 먼저 메타데이터 존재 여부 확인 (라우터에서 404 처리용)
  const meta = await readFragment(ownerId, id);
  if (!meta) {
    const e = new Error('not found');
    e.code = 'NotFound';
    throw e;
  }

  // 2) S3 데이터 삭제
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
    // 객체 없을 가능성 → 경고만 찍고 계속 진행
    logger.warn(
      { err, bucket: BUCKET, key: Key },
      'S3 DeleteObject failed (ignored)'
    );
  }

  // 3) DynamoDB 메타데이터 삭제
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
  // DynamoDB
  ensureDynamoTable,
  writeFragment,
  readFragment,
  listFragments,
  deleteFragment,
  // S3
  writeFragmentData,
  readFragmentData,
};
