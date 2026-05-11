variable "api_name" {
  type        = string
  description = "API name"
}

variable "prefix" {
  type        = string
  description = "Resource prefix"
}

variable "lambda_policies" {
  type = object({
    dynamodb = string
    logs     = string
  })
  description = "DynamoDB and Logs ARNs for Lambda policies"
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to resources"
  default     = {}
}
