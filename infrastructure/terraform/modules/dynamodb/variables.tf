variable "table_name" {
  type        = string
  description = "DynamoDB table name"
}

variable "environment" {
  type        = string
  description = "Environment (dev/staging/prod)"
}

variable "read_capacity" {
  type        = number
  description = "Read capacity units (0 = on-demand)"
  default     = 0
}

variable "write_capacity" {
  type        = number
  description = "Write capacity units (0 = on-demand)"
  default     = 0
}

variable "enable_ttl" {
  type        = bool
  description = "Enable TTL for automatic cleanup"
  default     = true
}

variable "ttl_attribute_name" {
  type        = string
  description = "TTL attribute name"
  default     = "expiration_time"
}

variable "point_in_time_recovery" {
  type        = bool
  description = "Enable point-in-time recovery"
  default     = true
}

variable "tags" {
  type        = map(string)
  description = "Tags to apply to resources"
  default     = {}
}
