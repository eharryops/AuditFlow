# =====================
# Lambda Function
# =====================

resource "aws_lambda_function" "auditor" {
  filename         = var.zip_output_path
  function_name    = var.function_name
  role             = var.execution_role_arn
  handler          = var.handler
  runtime          = var.runtime
  timeout          = var.timeout
  memory_size      = var.memory_size
  architectures    = ["x86_64"]

  # Ephemeral storage for temp files
  ephemeral_storage {
    size = var.ephemeral_storage
  }

  # Environment variables
  environment {
    variables = var.environment_variables
  }

  # X-Ray tracing
  tracing_config {
    mode = "Active"
  }

  # Reserved concurrent executions (optional)
  reserved_concurrent_executions = -1  # Unreserved

  # VPC configuration (if needed for RDS/ElastiCache)
  dynamic "vpc_config" {
    for_each = length(var.vpc_config.subnet_ids) > 0 ? [1] : []
    content {
      subnet_ids         = var.vpc_config.subnet_ids
      security_group_ids = var.vpc_config.security_group_ids
    }
  }

  # Layer attachment (optional for shared dependencies)
  # layers = var.layers

  tags = merge(
    var.tags,
    {
      Name = var.function_name
    }
  )

  source_code_hash = filebase64sha256(var.zip_output_path)
}

# =====================
# Lambda Permissions
# =====================

# Permission for API Gateway to invoke Lambda
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auditor.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_source_arn}/*"
}

# =====================
# Lambda Alias (for versioning)
# =====================

resource "aws_lambda_alias" "live" {
  name            = "live"
  description     = "Live alias for AuditFlow Lambda"
  function_name   = aws_lambda_function.auditor.function_name
  function_version = aws_lambda_function.auditor.version

  lifecycle {
    ignore_changes = [function_version]
  }
}

# =====================
# Lambda Event Source Mapping (optional)
# =====================

# For DynamoDB Streams event processing
resource "aws_lambda_event_source_mapping" "dynamodb_stream" {
  count              = var.enable_dynamodb_stream_trigger ? 1 : 0
  event_source_arn  = var.dynamodb_stream_arn
  function_name     = aws_lambda_function.auditor.arn
  enabled           = true
  batch_size        = 100
  starting_position = "LATEST"

  function_response_types = ["ReportBatchItemFailures"]
}

# =====================
# Lambda Concurrency Monitoring
# =====================

resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "${var.function_name}-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Average"
  threshold           = var.timeout * 800  # 80% of timeout
  alarm_description   = "Alert when Lambda duration exceeds 80% of timeout"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.auditor.function_name
  }
}

# =====================
# Lambda Logging
# =====================

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 30

  tags = var.tags
}
