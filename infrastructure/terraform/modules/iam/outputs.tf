output "lambda_execution_role_arn" {
  value       = aws_iam_role.lambda_execution.arn
  description = "Lambda execution role ARN"
}

output "lambda_execution_role_name" {
  value       = aws_iam_role.lambda_execution.name
  description = "Lambda execution role name"
}

output "api_execution_role_arn" {
  value       = aws_iam_role.api_execution.arn
  description = "API Gateway execution role ARN"
}

output "api_execution_role_name" {
  value       = aws_iam_role.api_execution.name
  description = "API Gateway execution role name"
}
