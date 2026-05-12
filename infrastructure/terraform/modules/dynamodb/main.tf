# =====================
# DynamoDB Table
# =====================

resource "aws_dynamodb_table" "memory_store" {
  name           = var.table_name
  billing_mode   = var.read_capacity == 0 ? "PAY_PER_REQUEST" : "PROVISIONED"
  hash_key       = "audit_id"
  range_key      = "finding_id"

  # Provisioned mode (if capacity specified)
  read_capacity  = var.read_capacity > 0 ? var.read_capacity : null
  write_capacity = var.write_capacity > 0 ? var.write_capacity : null

  # Attributes
  attribute {
    name = "audit_id"
    type = "S"
  }

  attribute {
    name = "finding_id"
    type = "S"
  }

  attribute {
    name = "agent_type"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "N"
  }

  # GSI for querying by agent type
  global_secondary_index {
    name            = "${var.table_name}-agent-index"
    hash_key        = "agent_type"
    range_key       = "created_at"
    projection_type = "ALL"

    read_capacity  = var.read_capacity == 0 ? null : var.read_capacity
    write_capacity = var.write_capacity == 0 ? null : var.write_capacity
  }

  # GSI for querying by timestamp
  global_secondary_index {
    name            = "${var.table_name}-time-index"
    hash_key        = "created_at"
    projection_type = "KEYS_ONLY"

    read_capacity  = var.read_capacity == 0 ? null : var.read_capacity
    write_capacity = var.write_capacity == 0 ? null : var.write_capacity
  }

  # TTL for automatic cleanup of old findings
  dynamic "ttl" {
    for_each = var.enable_ttl ? [1] : []
    content {
      attribute_name = var.ttl_attribute_name
      enabled        = true
    }
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = var.point_in_time_recovery
  }

  # Encryption at rest
  server_side_encryption {
    enabled     = true
    kms_key_arn = null  # Use AWS-managed key
  }

  # Tagging
  tags = merge(
    var.tags,
    {
      Name = var.table_name
    }
  )

  # Stream specification for event-driven architecture
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
}

# =====================
# DynamoDB Auto Scaling
# =====================

# Read scaling for provisioned mode
resource "aws_appautoscaling_target" "dynamodb_read" {
  count              = var.read_capacity > 0 ? 1 : 0
  max_capacity       = 40
  min_capacity       = var.read_capacity
  resource_id        = "table/${aws_dynamodb_table.memory_store.name}"
  scalable_dimension = "dynamodb:table:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "dynamodb_read" {
  count              = var.read_capacity > 0 ? 1 : 0
  name               = "${var.table_name}-read-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.dynamodb_read[0].resource_id
  scalable_dimension = aws_appautoscaling_target.dynamodb_read[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.dynamodb_read[0].service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 70.0

    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }

    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}

# Write scaling for provisioned mode
resource "aws_appautoscaling_target" "dynamodb_write" {
  count              = var.write_capacity > 0 ? 1 : 0
  max_capacity       = 40
  min_capacity       = var.write_capacity
  resource_id        = "table/${aws_dynamodb_table.memory_store.name}"
  scalable_dimension = "dynamodb:table:WriteCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "dynamodb_write" {
  count              = var.write_capacity > 0 ? 1 : 0
  name               = "${var.table_name}-write-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.dynamodb_write[0].resource_id
  scalable_dimension = aws_appautoscaling_target.dynamodb_write[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.dynamodb_write[0].service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 70.0

    predefined_metric_specification {
      predefined_metric_type = "DynamoDBWriteCapacityUtilization"
    }

    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}

# GSI auto-scaling
resource "aws_appautoscaling_target" "gsi_read" {
  count              = var.read_capacity > 0 ? 1 : 0
  max_capacity       = 40
  min_capacity       = var.read_capacity
  resource_id        = "table/${aws_dynamodb_table.memory_store.name}/index/${var.table_name}-agent-index"
  scalable_dimension = "dynamodb:index:ReadCapacityUnits"
  service_namespace  = "dynamodb"
}

resource "aws_appautoscaling_policy" "gsi_read" {
  count              = var.read_capacity > 0 ? 1 : 0
  name               = "${var.table_name}-gsi-read-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.gsi_read[0].resource_id
  scalable_dimension = aws_appautoscaling_target.gsi_read[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.gsi_read[0].service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 70.0

    predefined_metric_specification {
      predefined_metric_type = "DynamoDBReadCapacityUtilization"
    }

    scale_in_cooldown  = 60
    scale_out_cooldown = 60
  }
}
