# =====================
# Lambda Execution Role
# =====================

resource "aws_iam_role" "lambda_execution" {
  name_prefix = "${var.prefix}-lambda-"
  description = "Execution role for AuditFlow Lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

# =====================
# Lambda Execution Policy - DynamoDB
# =====================

resource "aws_iam_role_policy" "lambda_dynamodb" {
  name_prefix = "${var.prefix}-dynamodb-"
  role        = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = var.lambda_policies.dynamodb
      }
    ]
  })
}

# =====================
# Lambda Execution Policy - Logs
# =====================

resource "aws_iam_role_policy" "lambda_logs" {
  name_prefix = "${var.prefix}-logs-"
  role        = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = var.lambda_policies.logs
      }
    ]
  })
}

# =====================
# Lambda Execution Policy - X-Ray
# =====================

resource "aws_iam_role_policy" "lambda_xray" {
  name_prefix = "${var.prefix}-xray-"
  role        = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords"
        ]
        Resource = "*"
      }
    ]
  })
}

# =====================
# API Gateway Execution Role
# =====================

resource "aws_iam_role" "api_execution" {
  name_prefix = "${var.prefix}-api-"
  description = "Execution role for API Gateway"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

# =====================
# API Gateway - CloudWatch Logs Policy
# =====================

resource "aws_iam_role_policy" "api_logs" {
  name_prefix = "${var.prefix}-api-logs-"
  role        = aws_iam_role.api_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogDeliveryService",
          "logs:PutResourcePolicy",
          "logs:DescribeResourcePolicies",
          "logs:DescribeLogGroups"
        ]
        Resource = "*"
      }
    ]
  })
}
