output "table_name" {
  value       = aws_dynamodb_table.memory_store.name
  description = "DynamoDB table name"
}

output "table_arn" {
  value       = aws_dynamodb_table.memory_store.arn
  description = "DynamoDB table ARN"
}

output "stream_arn" {
  value       = aws_dynamodb_table.memory_store.stream_arn
  description = "DynamoDB stream ARN"
}

output "stream_label" {
  value       = aws_dynamodb_table.memory_store.stream_label
  description = "DynamoDB stream label"
}

output "gsi_agent_index_name" {
  value       = "${aws_dynamodb_table.memory_store.name}-agent-index"
  description = "GSI for agent type queries"
}

output "gsi_time_index_name" {
  value       = "${aws_dynamodb_table.memory_store.name}-time-index"
  description = "GSI for time-based queries"
}
