'use strict';

const {
  DynamoDBClient,
  DescribeTableCommand,
  CreateTableCommand,
} = require('@aws-sdk/client-dynamodb');

function getCredentials() {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN,
    };
  }
  return undefined;
}

const REGION =
  process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

const ENDPOINT =
  process.env.AWS_DYNAMODB_ENDPOINT_URL || process.env.AWS_DYNAMODB_ENDPOINT;

const TABLE_NAME = process.env.AWS_DYNAMODB_TABLE_NAME || 'fragments';

const client = new DynamoDBClient({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: getCredentials(),
});

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureTable() {
  console.log(
    'Ensuring DynamoDB table...',
    JSON.stringify({ region: REGION, endpoint: ENDPOINT, table: TABLE_NAME })
  );

  try {
    const out = await client.send(
      new DescribeTableCommand({ TableName: TABLE_NAME })
    );
    console.log(
      `Table '${TABLE_NAME}' already exists, status=${out.Table?.TableStatus}`
    );
    return;
  } catch (err) {
    if (err.name !== 'ResourceNotFoundException') {
      console.error('DescribeTable failed with unexpected error:', err);
      process.exit(1);
    }
    console.log(`Table '${TABLE_NAME}' does not exist. Creating...`);
  }

  await client.send(
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
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    })
  );

  console.log(`CreateTable sent for '${TABLE_NAME}', waiting for ACTIVE...`);

  for (let i = 0; i < 30; i++) {
    await wait(2000);
    try {
      const out = await client.send(
        new DescribeTableCommand({ TableName: TABLE_NAME })
      );
      const status = out.Table?.TableStatus;
      console.log(`Table status: ${status}`);
      if (status === 'ACTIVE') {
        console.log(`Table '${TABLE_NAME}' is ACTIVE.`);
        return;
      }
    } catch (err) {
      if (err.name !== 'ResourceNotFoundException') {
        console.error('Error while waiting for table to become ACTIVE:', err);
        process.exit(1);
      }
      console.log('Table still not found, waiting more...');
    }
  }

  console.error(
    `Timed out waiting for DynamoDB table '${TABLE_NAME}' to become ACTIVE`
  );
  process.exit(1);
}

ensureTable().catch((err) => {
  console.error('ensure-dynamo-table failed:', err);
  process.exit(1);
});
