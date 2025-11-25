// scripts/ensure-dynamo-table.js
'use strict';

const {
  DynamoDBClient,
  DescribeTableCommand,
} = require('@aws-sdk/client-dynamodb');

const TABLE_NAME = process.env.AWS_DYNAMODB_TABLE_NAME || 'fragments';
const ENDPOINT = process.env.AWS_DYNAMODB_ENDPOINT || 'http://localhost:8000';
const REGION = process.env.AWS_DEFAULT_REGION || 'us-east-1';

async function waitForActive() {
  const client = new DynamoDBClient({
    region: REGION,
    endpoint: ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      sessionToken: process.env.AWS_SESSION_TOKEN,
    },
  });

  console.log(
    `Checking DynamoDB table '${TABLE_NAME}' at ${ENDPOINT} (region=${REGION})`
  );

  const maxAttempts = 20;
  const delayMs = 1000;

  for (let i = 1; i <= maxAttempts; i += 1) {
    try {
      const out = await client.send(
        new DescribeTableCommand({ TableName: TABLE_NAME })
      );
      const status = out?.Table?.TableStatus;
      console.log(`Attempt ${i}: status = ${status}`);

      if (status === 'ACTIVE') {
        console.log(`Table '${TABLE_NAME}' is ACTIVE ✅`);
        return;
      }
    } catch (err) {
      // 테이블이 없으면 여기로 옴
      console.log(
        `Attempt ${i}: describe-table failed (${err.name || err.message})`
      );
    }

    if (i < maxAttempts) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  throw new Error(
    `DynamoDB table '${TABLE_NAME}' is not ACTIVE or does not exist after ${maxAttempts} attempts`
  );
}

waitForActive()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('ensure-dynamo-table failed:', err);
    process.exit(1);
  });
