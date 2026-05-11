variable "api_name" {
  type        = string
  description = "API Gateway name"
}

variable "api_description" {
  type        = string
  description = "API Gateway description"
  default     = ""
}

variable "stage_name" {
  type        = string
  description = "API Gateway stage name"
  default     = "prod"
}

variable "lambda_function_arn" {
  type        = string
  description = "Lambda function ARN"
}

variable "lambda_invoke_arn" {
  type        = string
  description = "Lambda invoke ARN"
}

variable "cors_allow_origins" {
  type        = list(string)
  description = "CORS allowed origins"
  default     = ["*"]
}

variable "cors_allow_headers" {
  type        = list(string)
  description = "CORS allowed headers"
  default     = ["Content-Type", "Authorization"]
}

variable "resources" {
  type = map(object({
    methods = list(string)
  }))
  description = "API resources and methods"
  default = {
    "audit" = {
      methods = ["POST"]
    }
  }
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to resources"
  default     = {}
}
