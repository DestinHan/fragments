set -euo pipefail

echo "=== Local AWS setup (S3 + DynamoDB) ==="

AWS_REGION="${AWS_DEFAULT_REGION:-us-east-1}"

S3_ENDPOINT="${AWS_S3_ENDPOINT:-http://localhost:4566}"
S3_BUCKET="${AWS_S3_BUCKET_NAME:-fragments}"

echo "S3 endpoint : ${S3_ENDPOINT}"
echo "S3 bucket   : ${S3_BUCKET}"

if aws --endpoint-url "${S3_ENDPOINT}" --region "${AWS_REGION}" \
  s3api head-bucket --bucket "${S3_BUCKET}" 2>/dev/null; then
  echo "S3 bucket '${S3_BUCKET}' already exists"
else
  echo "Creating S3 bucket '${S3_BUCKET}'..."

  if [ "${AWS_REGION}" = "us-east-1" ]; then
    aws --endpoint-url "${S3_ENDPOINT}" --region "${AWS_REGION}" \
      s3api create-bucket --bucket "${S3_BUCKET}"
  else
    aws --endpoint-url "${S3_ENDPOINT}" --region "${AWS_REGION}" \
      s3api create-bucket \
        --bucket "${S3_BUCKET}" \
        --create-bucket-configuration LocationConstraint="${AWS_REGION}"
  fi

  echo "S3 bucket '${S3_BUCKET}' created"
fi

DDB_ENDPOINT="${AWS_DYNAMODB_ENDPOINT:-http://localhost:8000}"
DDB_TABLE="${AWS_DYNAMODB_TABLE_NAME:-fragments}"

echo "DynamoDB endpoint : ${DDB_ENDPOINT}"
echo "DynamoDB table    : ${DDB_TABLE}"

# 테이블 없으면 생성
if aws --endpoint-url "${DDB_ENDPOINT}" --region "${AWS_REGION}" \
  dynamodb describe-table --table-name "${DDB_TABLE}" >/dev/null 2>&1; then
  echo "DynamoDB table '${DDB_TABLE}' already exists"
else
  echo "Creating DynamoDB table '${DDB_TABLE}'..."
  aws --endpoint-url "${DDB_ENDPOINT}" --region "${AWS_REGION}" \
    dynamodb create-table \
      --table-name "${DDB_TABLE}" \
      --attribute-definitions \
        AttributeName=ownerId,AttributeType=S \
        AttributeName=id,AttributeType=S \
      --key-schema \
        AttributeName=ownerId,KeyType=HASH \
        AttributeName=id,KeyType=RANGE \
      --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5

  echo "Waiting for table '${DDB_TABLE}' to become ACTIVE..."
  aws --endpoint-url "${DDB_ENDPOINT}" --region "${AWS_REGION}" \
    dynamodb wait table-exists --table-name "${DDB_TABLE}"
fi

echo "Current DynamoDB tables:"
aws --endpoint-url "${DDB_ENDPOINT}" --region "${AWS_REGION}" \
  dynamodb list-tables || true

echo "=== Local AWS setup complete ==="
