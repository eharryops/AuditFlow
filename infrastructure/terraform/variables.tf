variable "region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Environment name (dev/staging/prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project" {
  type        = string
  description = "Project name"
  default     = "auditflow"
}

variable "claude_api_key" {
  type        = string
  description = "Anthropic Claude API key"
  sensitive   = true
}

# =====================
# DynamoDB Configuration
# =====================

variable "dynamodb_table_name" {
  type        = string
  description = "DynamoDB table name for memory store"
  default     = "auditflow-memory"
}

variable "dynamodb_read_capacity" {
  type        = number
  description = "DynamoDB read capacity units (OnDemand if 0)"
  default     = 0  # OnDemand mode for cost optimization
}

variable "dynamodb_write_capacity" {
  type        = number
  description = "DynamoDB write capacity units (OnDemand if 0)"
  default     = 0
}

# =====================
# Lambda Configuration
# =====================

variable "lambda_memory_size" {
  type        = number
  description = "Lambda memory allocation (128-10240 MB)"
  default     = 512
}

variable "lambda_timeout" {
  type        = number
  description = "Lambda timeout in seconds"
  default     = 60
}

# =====================
# API Gateway Configuration
# =====================

variable "cors_allow_origins" {
  type        = list(string)
  description = "CORS allowed origins"
  default     = ["https://localhost:3000", "https://localhost:5173"]
}

# =====================
# Logging & Monitoring
# =====================

variable "log_retention_days" {
  type        = number
  description = "CloudWatch log retention in days"
  default     = 30
}

variable "log_level" {
  type        = string
  description = "Lambda log level (DEBUG, INFO, WARN, ERROR)"
  default     = "INFO"
  validation {
    condition     = contains(["DEBUG", "INFO", "WARN", "ERROR"], var.log_level)
    error_message = "Log level must be DEBUG, INFO, WARN, or ERROR."
  }
}

# =====================
# Tagging
# =====================

variable "additional_tags" {
  type        = map(string)
  description = "Additional tags to apply to all resources"
  default     = {}
}
