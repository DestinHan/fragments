// scripts/ensure-dynamo-table.js
//
// CI에서 DynamoDB Local에 'fragments' 테이블이
// 진짜로 있는지 한 번 더 확인하고, 없으면 생성하는 스크립트.

const {
  DynamoDBClient,
  DescribeTableCommand,
  CreateTableCommand,
} = require("@aws-sdk/client-dynamodb");

const TABLE_NAME = process.env.AWS_DYNAMO_TABLE_NAME || "fragments";
const ENDPOINT = process.env.AWS_DYNAMO_ENDPOINT || "http://localhost:8000";
const REGION = process.env.AWS_REGION || "us-east-1";

async function main() {
  console.log(`[ensure-dynamo-table] Using endpoint=${ENDPOINT}, region=${REGION}`);
  console.log(`[ensure-dynamo-table] Ensuring table '${TABLE_NAME}' exists...`);

  const client = new DynamoDBClient({
    region: REGION,
    endpoint: ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
      sessionToken: process.env.AWS_SESSION_TOKEN || "test",
    },
  });

  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    console.log(`[ensure-dynamo-table] Table '${TABLE_NAME}' already exists.`);
    return;
  } catch (err) {
    if (err.name !== "ResourceNotFoundException") {
      console.error("[ensure-dynamo-table] DescribeTable failed with unexpected error:", err);
      process.exit(1);
    }
    console.log("[ensure-dynamo-table] Table does not exist yet. Creating...");
  }

  // 테이블 생성
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

  // 아주 짧게 폴링하면서 ACTIVE 될 때까지 기다리기
  console.log("[ensure-dynamo-table] Waiting for table to become ACTIVE...");
  for (let i = 0; i < 20; i++) {
    const res = await client.send(
      new DescribeTableCommand({ TableName: TABLE_NAME })
    );
    const status = res?.Table?.TableStatus;
    console.log(`  - status: ${status}`);
    if (status === "ACTIVE") {
      console.log("[ensure-dynamo-table] Table is ACTIVE.");
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.error("[ensure-dynamo-table] Timed out waiting for table to become ACTIVE.");
  process.exit(1);
}

main().catch((err) => {
  console.error("[ensure-dynamo-table] Unexpected error:", err);
  process.exit(1);
});
