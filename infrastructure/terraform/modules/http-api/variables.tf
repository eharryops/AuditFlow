variable "api_name" {
  type        = string
  description = "API name"
}

variable "api_description" {
  type        = string
  description = "API description"
}

variable "stage_name" {
  type        = string
  description = "Stage name (e.g., dev, prod)"
}

variable "lambda_function_arn" {
  type        = string
  description = "Lambda function ARN"
}

variable "lambda_function_name" {
  type        = string
  description = "Lambda function name"
}

variable "cors_allow_origins" {
  type        = list(string)
  description = "CORS allowed origins"
  default     = ["*"]
}

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention in days"
  default     = 7
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to resources"
  default     = {}
}
