#!/usr/bin/env node

// GitHub Actions 통합 테스트에서 DynamoDB Local 테이블이
// 진짜 있는지 한 번 더 확인하고, 없으면 만들어주는 스크립트

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

async function ensureTable() {
  console.log(
    `Ensuring DynamoDB table '${TABLE_NAME}' exists at ${ENDPOINT} (region=${REGION})`
  );

  // 테이블 목록 먼저 확인
  const list = await client.send(new ListTablesCommand({}));
  if (list.TableNames && list.TableNames.includes(TABLE_NAME)) {
    console.log(`✅ Table '${TABLE_NAME}' already exists.`);
    // describe 한 번 더 해서 진짜 접근 되는지 확인
    await client.send(
      new DescribeTableCommand({ TableName: TABLE_NAME })
    );
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

  console.log("Waiting for table to be active...");
  // DynamoDB Local에서는 보통 바로 됨, 하지만 안전하게 describe로 한 번 더
  await client.send(
    new DescribeTableCommand({ TableName: TABLE_NAME })
  );

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
