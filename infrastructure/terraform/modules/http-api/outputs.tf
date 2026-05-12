output "api_endpoint" {
  value       = aws_apigatewayv2_api.auditor.api_endpoint
  description = "HTTP API endpoint URL"
}

output "api_id" {
  value       = aws_apigatewayv2_api.auditor.id
  description = "HTTP API ID"
}
