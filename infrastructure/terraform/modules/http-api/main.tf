# =====================
# HTTP API Gateway
# =====================

resource "aws_apigatewayv2_api" "auditor" {
  name          = var.api_name
  description   = var.api_description
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.cors_allow_origins
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["*"]
  }

  tags = var.tags
}

# =====================
# Lambda Integration
# =====================

resource "aws_apigatewayv2_integration" "lambda" {
  api_id             = aws_apigatewayv2_api.auditor.id
  integration_type   = "AWS_PROXY"
  payload_format_version = "2.0"
  integration_uri    = var.lambda_function_arn
  integration_method = "POST"
}

# =====================
# Route (catch-all)
# =====================

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.auditor.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "audit" {
  api_id    = aws_apigatewayv2_api.auditor.id
  route_key = "POST /api/audit"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# =====================
# Stage
# =====================

resource "aws_apigatewayv2_stage" "auditor" {
  api_id      = aws_apigatewayv2_api.auditor.id
  name        = var.stage_name
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      integrationLatency = "$context.integration.latency"
    })
  }

  tags = var.tags
}

# =====================
# CloudWatch Logs
# =====================

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/apigateway/auditflow-${var.stage_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# =====================
# Lambda Permission
# =====================

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.auditor.execution_arn}/*"
}
