output "api_endpoint" {
  value       = aws_api_gateway_stage.auditor.invoke_url
  description = "API Gateway endpoint URL"
}

output "api_id" {
  value       = aws_api_gateway_rest_api.auditor.id
  description = "API Gateway REST API ID"
}

output "api_arn" {
  value       = aws_api_gateway_rest_api.auditor.arn
  description = "API Gateway REST API ARN"
}

output "deployment_id" {
  value       = aws_api_gateway_deployment.auditor.id
  description = "API Gateway deployment ID"
}

output "stage_name" {
  value       = aws_api_gateway_stage.auditor.stage_name
  description = "API Gateway stage name"
}

output "api_key_id" {
  value       = aws_api_gateway_api_key.auditor.id
  description = "API key ID"
}

output "usage_plan_id" {
  value       = aws_api_gateway_usage_plan.auditor.id
  description = "Usage plan ID"
}
