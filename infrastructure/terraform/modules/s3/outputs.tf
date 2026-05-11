output "bucket_name" {
  value       = aws_s3_bucket.frontend.id
  description = "S3 bucket name"
}

output "bucket_arn" {
  value       = aws_s3_bucket.frontend.arn
  description = "S3 bucket ARN"
}

output "bucket_domain_name" {
  value       = aws_s3_bucket.frontend.bucket_regional_domain_name
  description = "S3 bucket regional domain name"
}

output "cloudfront_distribution_id" {
  value       = try(aws_cloudfront_distribution.frontend[0].id, null)
  description = "CloudFront distribution ID"
}

output "cloudfront_domain_name" {
  value       = try(aws_cloudfront_distribution.frontend[0].domain_name, null)
  description = "CloudFront domain name"
}

output "cloudfront_arn" {
  value       = try(aws_cloudfront_distribution.frontend[0].arn, null)
  description = "CloudFront distribution ARN"
}

output "oai_id" {
  value       = try(aws_cloudfront_origin_access_identity.frontend[0].id, null)
  description = "CloudFront Origin Access Identity ID"
}

output "logs_bucket_name" {
  value       = try(aws_s3_bucket.logs[0].id, null)
  description = "S3 logs bucket name"
}
