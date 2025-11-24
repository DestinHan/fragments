#!/usr/bin/env node

// GitHub Actions 통합 테스트에서 DynamoDB Local 테이블이
// 진짜 있는지 한 번 더 확인하고, 없으면 만들고,
// 반드시 ACTIVE 상태가 될 때까지 기다리는 스크립트

const {
  DynamoDBClient,
  ListTablesCommand,
  CreateTableCommand,
  DescribeTableCommand,
} = require("@aws-sdk/client-dynamodb");

const REGION = process.env.AWS_DEFAULT_REGION || "us-east-1";
const ENDPOINT =
  process.env.AWS_DYNAMODB_ENDPOINT || "http://localhost:8000";
const TABLE_NAME = process.env.AWS_DYNAMODB_TABLE_NAME || "fragments";

const client = new DynamoDBClient({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
    sessionToken: process.env.AWS_SESSION_TOKEN || "test",
  },
});

async function waitForTableActive() {
  console.log(`🔁 Waiting for DynamoDB table '${TABLE_NAME}' to be ACTIVE...`);
  for (let i = 0; i < 15; i += 1) {
    try {
      const res = await client.send(
        new DescribeTableCommand({ TableName: TABLE_NAME })
      );
      const status = res?.Table?.TableStatus;
      console.log(`  - Describe attempt #${i + 1}: status = ${status}`);
      if (status === "ACTIVE" || !status) {
        console.log(`✅ Table '${TABLE_NAME}' is ACTIVE`);
        return;
      }
    } catch (err) {
      console.log(
        `  - Describe attempt #${i + 1} failed (${err.name || err.message})`
      );
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(
    `❌ Table '${TABLE_NAME}' is not ACTIVE after waiting (endpoint=${ENDPOINT})`
  );
}

async function ensureTable() {
  console.log(
    `Ensuring DynamoDB table '${TABLE_NAME}' exists at ${ENDPOINT} (region=${REGION})`
  );

  // 테이블 목록 먼저 확인
  const list = await client.send(new ListTablesCommand({}));
  if (list.TableNames && list.TableNames.includes(TABLE_NAME)) {
    console.log(`✅ Table '${TABLE_NAME}' already exists.`);
    await waitForTableActive();
    return;
  }

  console.log(`Table '${TABLE_NAME}' not found. Creating...`);

  await client.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      AttributeDefinitions: [
        { AttributeName: "ownerId", AttributeType: "S" },
        { AttributeName: "id", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "ownerId", KeyType: "HASH" },
        { AttributeName: "id", KeyType: "RANGE" },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 5,
      },
    })
  );

  await waitForTableActive();
  console.log(`✅ Table '${TABLE_NAME}' created and ready.`);
}

ensureTable()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Failed to ensure DynamoDB table:", err);
    process.exit(1);
  });
