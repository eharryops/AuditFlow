output "function_name" {
  value       = aws_lambda_function.auditor.function_name
  description = "Lambda function name"
}

output "function_arn" {
  value       = aws_lambda_function.auditor.arn
  description = "Lambda function ARN"
}

output "invoke_arn" {
  value       = aws_lambda_function.auditor.invoke_arn
  description = "Lambda invoke ARN (for API Gateway)"
}

output "version" {
  value       = aws_lambda_function.auditor.version
  description = "Lambda function version"
}

output "log_group_name" {
  value       = aws_cloudwatch_log_group.lambda.name
  description = "CloudWatch log group name"
}
