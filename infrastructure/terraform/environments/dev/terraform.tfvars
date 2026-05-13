region         = "us-east-1"
environment    = "dev"
project        = "auditflow"
claude_api_key = "sk-mock"

# Lambda
lambda_memory_size = 512
lambda_timeout     = 60

# DynamoDB - Use on-demand for dev (no provisioned capacity)
dynamodb_table_name  = "auditflow-dev-memory"
dynamodb_read_capacity  = 0   # On-demand
dynamodb_write_capacity = 0   # On-demand

# API Gateway
cors_allow_origins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173"
]

# Logging
log_retention_days = 7   # Keep dev logs for 7 days
log_level         = "DEBUG"

# Tags
additional_tags = {
  Owner       = "Eddie"
  CostCenter  = "Personal"
  Backup      = "false"
  Environment = "Development"
}
