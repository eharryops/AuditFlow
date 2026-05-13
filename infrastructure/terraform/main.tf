terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }

  # backend "s3" {
  #   # Configure with: terraform init -backend-config="bucket=..."
  #   key            = "auditflow/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "AuditFlow"
      ManagedBy   = "Terraform"
      CreatedBy   = "Eddie"
    }
  }
}

# Local values for common configuration
locals {
  api_name = "auditflow-api"
  prefix   = "${var.project}-${var.environment}"
}

# =====================
# IAM Module
# =====================

module "iam" {
  source = "./modules/iam"

  api_name = local.api_name
  prefix   = local.prefix

  # Lambda execution role permissions
  lambda_policies = {
    dynamodb = module.dynamodb.table_arn
    logs     = "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
  }
}

# =====================
# DynamoDB Memory Store
# =====================

module "dynamodb" {
  source = "./modules/dynamodb"

  table_name           = var.dynamodb_table_name
  environment          = var.environment
  read_capacity        = var.dynamodb_read_capacity
  write_capacity       = var.dynamodb_write_capacity
  enable_ttl           = true
  ttl_attribute_name   = "expiration_time"
  point_in_time_recovery = true

  tags = {
    Name = "${local.prefix}-memory-store"
  }
}

# =====================
# Lambda (API Backend)
# =====================

module "lambda" {
  source = "./modules/lambda"

  function_name       = "${local.prefix}-auditor"
  runtime             = "nodejs20.x"
  handler             = "index.handler"
  timeout             = 60
  memory_size         = 512
  ephemeral_storage   = 10240  # 10GB for temp computation

  # Code location (will be built and packaged)
  source_dir = "${path.root}/../../backend"
  zip_output_path = "${path.root}/.terraform/lambda-build.zip"

  # Environment variables
  environment_variables = {
    CLAUDE_API_KEY      = var.claude_api_key
    DYNAMODB_TABLE_NAME = module.dynamodb.table_name
    ENVIRONMENT         = var.environment
    LOG_LEVEL           = var.log_level
  }

  # IAM role
  execution_role_arn = module.iam.lambda_execution_role_arn

  # VPC (optional, for DynamoDB access without NAT)
  vpc_config = {
    subnet_ids            = []
    security_group_ids    = []
  }

  tags = {
    Name = "${local.prefix}-auditor"
  }
}

# =====================
# HTTP API Gateway
# =====================

module "http_api" {
  source = "./modules/http-api"

  api_name            = local.api_name
  api_description     = "AuditFlow Terraform Auditor API"
  stage_name          = var.environment
  lambda_function_arn = module.lambda.function_arn
  lambda_function_name = module.lambda.function_name

  cors_allow_origins = concat(var.cors_allow_origins, ["https://infra-auditflow.netlify.app"])
  log_retention_days = 7

  tags = {
    Name = "${local.prefix}-api"
  }
}


# =====================
# CloudWatch Alarms
# =====================

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${local.prefix}-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alert when Lambda errors exceed threshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = module.lambda.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  alarm_name          = "${local.prefix}-lambda-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert on Lambda throttles"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = module.lambda.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "dynamodb_throttles" {
  alarm_name          = "${local.prefix}-dynamodb-throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "UserErrors"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Alert on DynamoDB throttles"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = module.dynamodb.table_name
  }
}

# =====================
# Data Sources
# =====================

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# =====================
# Outputs
# =====================

output "api_endpoint" {
  value = module.http_api.api_endpoint
  description = "HTTP API endpoint URL"
}

output "lambda_function_name" {
  value = module.lambda.function_name
  description = "Lambda function name"
}

output "dynamodb_table_name" {
  value = module.dynamodb.table_name
  description = "DynamoDB table name"
}
