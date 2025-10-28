{
  "family": "fragments",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::471112953885:role/LabRole",
  "taskRoleArn": "arn:aws:iam::471112953885:role/LabRole",
  "containerDefinitions": [
    {
      "name": "fragments",
      "image": "471112953885.dkr.ecr.us-east-1.amazonaws.com/fragments:latest",
      "essential": true,
      "portMappings": [{ "containerPort": 8080, "protocol": "tcp" }],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "LOG_LEVEL", "value": "info" },
        { "name": "PORT", "value": "8080" },
        { "name": "AWS_REGION", "value": "us-east-1" },
        { "name": "AWS_S3_BUCKET_NAME", "value": "fragments-seunghoonhan" },
        { "name": "AUTH_STRATEGY", "value": "http" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-region": "us-east-1",
          "awslogs-group": "/ecs/fragments",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget -qO- http://localhost:8080/v1/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 15
      }
    }
  ]
}
