region      = "us-east-1"
environment = "prod"
project     = "auditflow"

# Lambda - Higher memory for parallel agent execution
lambda_memory_size = 1024
lambda_timeout     = 120

# DynamoDB - Provisioned with auto-scaling
dynamodb_table_name     = "auditflow-prod-memory"
dynamodb_read_capacity  = 10    # Base capacity, will auto-scale to 40
dynamodb_write_capacity = 10    # Base capacity, will auto-scale to 40

# API Gateway - Allow production frontend only
cors_allow_origins = [
  "https://auditflow.eddieeharry.com",
  "https://www.auditflow.eddieeharry.com"
]

# Logging
log_retention_days = 30   # Keep prod logs for 30 days
log_level         = "INFO"

# Tags
additional_tags = {
  Owner       = "Eddie"
  CostCenter  = "Production"
  Backup      = "true"
  Environment = "Production"
  Compliance  = "PCI-DSS"
}
