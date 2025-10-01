#!/bin/sh

set -e

echo "Setting AWS environment variables for LocalStack / DynamoDB Local"
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_SESSION_TOKEN=test
export AWS_DEFAULT_REGION=us-east-1

echo 'Waiting for LocalStack S3...'
until (curl --silent http://localhost:4566/_localstack/health | grep "\"s3\": \"\(running\|available\)\"" >/dev/null); do
  sleep 3
done
echo 'LocalStack S3 Ready'

echo "Creating LocalStack S3 bucket: fragments"
aws --endpoint-url=http://localhost:4566 s3api create-bucket --bucket fragments || true

echo "Creating DynamoDB-Local table: fragments"
aws --endpoint-url=http://localhost:8000 dynamodb create-table \
  --table-name fragments \
  --attribute-definitions AttributeName=ownerId,AttributeType=S AttributeName=id,AttributeType=S \
  --key-schema AttributeName=ownerId,KeyType=HASH AttributeName=id,KeyType=RANGE \
  --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5 \
  >/dev/null 2>&1 || true

aws --endpoint-url=http://localhost:8000 dynamodb wait table-exists --table-name fragments
echo "All local AWS resources are ready."
