variable "bucket_name" {
  type        = string
  description = "S3 bucket name"
}

variable "environment" {
  type        = string
  description = "Environment (dev/staging/prod)"
}

variable "enable_versioning" {
  type        = bool
  description = "Enable S3 versioning"
  default     = true
}

variable "enable_encryption" {
  type        = bool
  description = "Enable S3 encryption"
  default     = true
}

variable "block_public_acls" {
  type        = bool
  description = "Block public ACLs"
  default     = true
}

variable "create_cloudfront" {
  type        = bool
  description = "Create CloudFront distribution"
  default     = true
}

variable "cloudfront_comment" {
  type        = string
  description = "CloudFront distribution comment"
  default     = ""
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to resources"
  default     = {}
}
