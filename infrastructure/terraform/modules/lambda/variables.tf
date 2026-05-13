variable "function_name" {
  type        = string
  description = "Lambda function name"
}

variable "runtime" {
  type        = string
  description = "Lambda runtime"
  default     = "nodejs20.x"
}

variable "handler" {
  type        = string
  description = "Lambda handler"
  default     = "lambda-handler.handler"
}

variable "timeout" {
  type        = number
  description = "Lambda timeout in seconds"
  default     = 60
}

variable "memory_size" {
  type        = number
  description = "Lambda memory size in MB"
  default     = 512
}

variable "ephemeral_storage" {
  type        = number
  description = "Ephemeral storage size in MB"
  default     = 10240
}

variable "source_dir" {
  type        = string
  description = "Source directory for Lambda code"
}

variable "zip_output_path" {
  type        = string
  description = "Path to output ZIP file"
}

variable "environment_variables" {
  type        = map(string)
  description = "Environment variables for Lambda"
  default     = {}
}

variable "execution_role_arn" {
  type        = string
  description = "IAM role ARN for Lambda execution"
}

variable "api_source_arn" {
  type        = string
  description = "API Gateway ARN for permissions"
  default     = "*"
}

variable "vpc_config" {
  type = object({
    subnet_ids         = list(string)
    security_group_ids = list(string)
  })
  description = "VPC configuration for Lambda"
  default = {
    subnet_ids         = []
    security_group_ids = []
  }
}

variable "enable_dynamodb_stream_trigger" {
  type        = bool
  description = "Enable DynamoDB stream as event source"
  default     = false
}

variable "dynamodb_stream_arn" {
  type        = string
  description = "DynamoDB stream ARN"
  default     = ""
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to resources"
  default     = {}
}
