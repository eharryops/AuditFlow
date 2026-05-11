# This Terraform file has intentional security vulnerabilities
# for testing the Security Agent

# VULNERABILITY 1: Overly permissive IAM role
resource "aws_iam_role" "lambda_role" {
  name = "lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_policy" {
  name   = "lambda-policy"
  role   = aws_iam_role.lambda_role.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "*"  # VULNERABILITY: Wildcard action
      Resource = "*"  # VULNERABILITY: Wildcard resource
    }]
  })
}

# VULNERABILITY 2: S3 bucket without encryption
resource "aws_s3_bucket" "data_bucket" {
  bucket = "my-insecure-data-bucket"
  # VULNERABILITY: No server_side_encryption_configuration
}

resource "aws_s3_bucket_public_access_block" "data_bucket_pab" {
  bucket                  = aws_s3_bucket.data_bucket.id
  block_public_acls       = false  # VULNERABILITY: Allows public access
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# VULNERABILITY 3: RDS database with public access
resource "aws_db_instance" "main" {
  identifier     = "main-database"
  engine         = "postgres"
  instance_class = "db.t3.micro"
  allocated_storage = 20

  publicly_accessible = true  # VULNERABILITY: Exposed to internet
  skip_final_snapshot = true

  username = "admin"
  password = "password123"  # VULNERABILITY: Hardcoded password!
}

# VULNERABILITY 4: Lambda with disabled SSL verification
resource "aws_lambda_function" "processor" {
  filename      = "lambda.zip"
  function_name = "data-processor"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"

  environment {
    variables = {
      DB_HOST     = aws_db_instance.main.endpoint
      SSL_VERIFY  = "false"  # VULNERABILITY: Disabled SSL verification
      API_KEY     = "sk-1234567890abcdef"  # VULNERABILITY: Hardcoded secret
    }
  }
}

# VULNERABILITY 5: Security group allowing all traffic
resource "aws_security_group" "app_sg" {
  name        = "app-security-group"
  description = "Application security group"
  vpc_id      = "vpc-12345"

  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # VULNERABILITY: All traffic allowed
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]  # VULNERABILITY: All traffic allowed
  }
}

# VULNERABILITY 6: DynamoDB with default encryption
resource "aws_dynamodb_table" "audit_logs" {
  name           = "audit-logs"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "id"
  stream_specification {
    stream_view_type = "NEW_AND_OLD_IMAGES"
    # VULNERABILITY: No KMS key specified (uses default encryption)
  }

  attribute {
    name = "id"
    type = "S"
  }

  tags = {
    Name = "audit-logs"
  }
}
