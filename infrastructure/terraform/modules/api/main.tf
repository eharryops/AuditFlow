# =====================
# API Gateway REST API
# =====================

resource "aws_api_gateway_rest_api" "auditor" {
  name        = var.api_name
  description = var.api_description

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = merge(
    var.tags,
    {
      Name = var.api_name
    }
  )
}

# =====================
# Resources & Methods
# =====================

# Root resource already exists as api.root_resource_id

# Health check endpoint
resource "aws_api_gateway_resource" "health" {
  rest_api_id = aws_api_gateway_rest_api.auditor.id
  parent_id   = aws_api_gateway_rest_api.auditor.root_resource_id
  path_part   = "health"
}

resource "aws_api_gateway_method" "health" {
  rest_api_id      = aws_api_gateway_rest_api.auditor.id
  resource_id      = aws_api_gateway_resource.health.id
  http_method      = "GET"
  authorization    = "NONE"
}

resource "aws_api_gateway_integration" "health" {
  rest_api_id             = aws_api_gateway_rest_api.auditor.id
  resource_id             = aws_api_gateway_resource.health.id
  http_method             = aws_api_gateway_method.health.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arn
}

# Audit endpoint (POST)
resource "aws_api_gateway_resource" "audit" {
  rest_api_id = aws_api_gateway_rest_api.auditor.id
  parent_id   = aws_api_gateway_rest_api.auditor.root_resource_id
  path_part   = "audit"
}

resource "aws_api_gateway_method" "audit_post" {
  rest_api_id      = aws_api_gateway_rest_api.auditor.id
  resource_id      = aws_api_gateway_resource.audit.id
  http_method      = "POST"
  authorization    = "NONE"

  request_parameters = {
    "method.request.header.Content-Type" = true
  }
}

resource "aws_api_gateway_integration" "audit_post" {
  rest_api_id             = aws_api_gateway_rest_api.auditor.id
  resource_id             = aws_api_gateway_resource.audit.id
  http_method             = aws_api_gateway_method.audit_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arn
}

# Audit by ID endpoint (GET)
resource "aws_api_gateway_resource" "audit_by_id" {
  rest_api_id = aws_api_gateway_rest_api.auditor.id
  parent_id   = aws_api_gateway_resource.audit.id
  path_part   = "{auditId}"
}

resource "aws_api_gateway_method" "audit_get" {
  rest_api_id      = aws_api_gateway_rest_api.auditor.id
  resource_id      = aws_api_gateway_resource.audit_by_id.id
  http_method      = "GET"
  authorization    = "NONE"

  request_parameters = {
    "method.request.path.auditId" = true
  }
}

resource "aws_api_gateway_integration" "audit_get" {
  rest_api_id             = aws_api_gateway_rest_api.auditor.id
  resource_id             = aws_api_gateway_resource.audit_by_id.id
  http_method             = aws_api_gateway_method.audit_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = var.lambda_invoke_arn
}

# =====================
# CORS Configuration
# =====================

resource "aws_api_gateway_method" "cors_health" {
  rest_api_id      = aws_api_gateway_rest_api.auditor.id
  resource_id      = aws_api_gateway_resource.health.id
  http_method      = "OPTIONS"
  authorization    = "NONE"
}

resource "aws_api_gateway_integration" "cors_health" {
  rest_api_id      = aws_api_gateway_rest_api.auditor.id
  resource_id      = aws_api_gateway_resource.health.id
  http_method      = aws_api_gateway_method.cors_health.http_method
  type             = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_integration_response" "cors_health_200" {
  rest_api_id       = aws_api_gateway_rest_api.auditor.id
  resource_id       = aws_api_gateway_resource.health.id
  http_method       = aws_api_gateway_method.cors_health.http_method
  status_code       = "200"
  selection_pattern = ""

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method_response" "cors_health_200" {
  rest_api_id = aws_api_gateway_rest_api.auditor.id
  resource_id = aws_api_gateway_resource.health.id
  http_method = aws_api_gateway_method.cors_health.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# Similar CORS for audit endpoints
resource "aws_api_gateway_method" "cors_audit" {
  rest_api_id      = aws_api_gateway_rest_api.auditor.id
  resource_id      = aws_api_gateway_resource.audit.id
  http_method      = "OPTIONS"
  authorization    = "NONE"
}

resource "aws_api_gateway_integration" "cors_audit" {
  rest_api_id      = aws_api_gateway_rest_api.auditor.id
  resource_id      = aws_api_gateway_resource.audit.id
  http_method      = aws_api_gateway_method.cors_audit.http_method
  type             = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_integration_response" "cors_audit_200" {
  rest_api_id       = aws_api_gateway_rest_api.auditor.id
  resource_id       = aws_api_gateway_resource.audit.id
  http_method       = aws_api_gateway_method.cors_audit.http_method
  status_code       = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

resource "aws_api_gateway_method_response" "cors_audit_200" {
  rest_api_id = aws_api_gateway_rest_api.auditor.id
  resource_id = aws_api_gateway_resource.audit.id
  http_method = aws_api_gateway_method.cors_audit.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# =====================
# API Deployment
# =====================

resource "aws_api_gateway_deployment" "auditor" {
  rest_api_id = aws_api_gateway_rest_api.auditor.id
  stage_name  = var.stage_name

  depends_on = [
    aws_api_gateway_integration.health,
    aws_api_gateway_integration.audit_post,
    aws_api_gateway_integration.audit_get,
    aws_api_gateway_integration.cors_health,
    aws_api_gateway_integration.cors_audit,
  ]

  lifecycle {
    create_before_destroy = true
  }
}

# =====================
# API Stage with Caching
# =====================

resource "aws_api_gateway_stage" "auditor" {
  deployment_id = aws_api_gateway_deployment.auditor.id
  rest_api_id   = aws_api_gateway_rest_api.auditor.id
  stage_name    = var.stage_name

  tags = var.tags
}

# =====================
# CloudWatch Log Group
# =====================

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/apigateway/${var.api_name}"
  retention_in_days = 30

  tags = var.tags
}

# =====================
# API Key & Usage Plan (optional)
# =====================

resource "aws_api_gateway_api_key" "auditor" {
  name        = "${var.api_name}-key"
  description = "API key for AuditFlow"
  enabled     = true

  tags = var.tags
}

resource "aws_api_gateway_usage_plan" "auditor" {
  name        = "${var.api_name}-usage"
  description = "Usage plan for AuditFlow"

  api_stages {
    api_id      = aws_api_gateway_rest_api.auditor.id
    stage       = aws_api_gateway_stage.auditor.stage_name
  }

  throttle_settings {
    burst_limit = 5000
    rate_limit  = 2000
  }

  quota_settings {
    limit  = 100000
    period = "DAY"
  }

  tags = var.tags
}

resource "aws_api_gateway_usage_plan_key" "auditor" {
  key_id        = aws_api_gateway_api_key.auditor.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.auditor.id
}
