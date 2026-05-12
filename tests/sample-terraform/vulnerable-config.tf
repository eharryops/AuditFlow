# Intentionally vulnerable Terraform for auditing demo

resource "aws_s3_bucket" "data_bucket" {
  bucket = "my-insecure-data-bucket"
  # ❌ No encryption
  # ❌ No versioning
}

resource "aws_iam_role" "lambda_role" {
  name = "audit-demo-lambda"

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
  name = "lambda-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      # ❌ Overly permissive
      Effect   = "Allow"
      Action   = "*"
      Resource = "*"
    }]
  })
}

resource "aws_db_instance" "main" {
  identifier     = "production-db"
  engine         = "mysql"
  engine_version = "5.7"
  instance_class = "db.t2.micro"

  # ❌ No encryption at rest
  storage_encrypted = false

  # ❌ No backups
  backup_retention_period = 0

  # ❌ Publicly accessible
  publicly_accessible = true

  # ❌ Default credentials
  username = "admin"
  password = "password123"
}

resource "aws_security_group" "web" {
  name = "web-sg"

  # ❌ Open to internet
  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_lambda_function" "processor" {
  filename      = "lambda.zip"
  function_name = "data-processor"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs.16"

  # ❌ Old runtime (EOL)
  # ❌ No timeout specified
  # ❌ No memory optimization
}
