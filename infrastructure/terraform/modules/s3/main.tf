# =====================
# S3 Bucket for Frontend
# =====================

resource "aws_s3_bucket" "frontend" {
  bucket = var.bucket_name

  tags = merge(
    var.tags,
    {
      Name = var.bucket_name
    }
  )
}

# Block public access at bucket level
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = var.block_public_acls
  block_public_policy     = var.block_public_acls
  ignore_public_acls      = var.block_public_acls
  restrict_public_buckets = var.block_public_acls
}

# =====================
# S3 Versioning
# =====================

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

# =====================
# S3 Encryption
# =====================

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# =====================
# S3 Lifecycle Policy
# =====================

resource "aws_s3_bucket_lifecycle_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"
    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "delete-incomplete-uploads"
    status = "Enabled"
    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# =====================
# S3 Bucket Policy (for CloudFront access)
# =====================

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity/${aws_cloudfront_origin_access_identity.frontend[0].id}"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
      },
      {
        Sid    = "AllowListBucket"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity/${aws_cloudfront_origin_access_identity.frontend[0].id}"
        }
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.frontend.arn
      }
    ]
  })
}

# =====================
# CloudFront OAI (Origin Access Identity)
# =====================

resource "aws_cloudfront_origin_access_identity" "frontend" {
  count   = var.create_cloudfront ? 1 : 0
  comment = "OAI for AuditFlow frontend"
}

# =====================
# CloudFront Distribution
# =====================

resource "aws_cloudfront_distribution" "frontend" {
  count   = var.create_cloudfront ? 1 : 0
  comment = var.cloudfront_comment
  enabled = true

  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "S3Frontend"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontend[0].cloudfront_access_identity_path
    }
  }

  # Caching behavior for static files
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3Frontend"
    compress         = true

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }

      headers = []
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600      # 1 hour
    max_ttl                = 86400     # 1 day
  }

  # Cache behaviors for API calls
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3Frontend"

    forwarded_values {
      query_string = true

      cookies {
        forward = "all"
      }

      headers = ["*"]
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
  }

  # Custom error responses
  custom_error_response {
    error_code            = 404
    error_caching_min_ttl = 300
    response_code         = 200
    response_page_path    = "/index.html"
  }

  custom_error_response {
    error_code            = 403
    error_caching_min_ttl = 300
    response_code         = 200
    response_page_path    = "/index.html"
  }

  # Restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # SSL/TLS
  viewer_certificate {
    cloudfront_default_certificate = true
  }

  # Logging (optional)
  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.logs[0].bucket_regional_domain_name
    prefix          = "cloudfront/"
  }

  tags = var.tags

  depends_on = [aws_cloudfront_origin_access_identity.frontend]
}

# =====================
# S3 Bucket for Logs
# =====================

resource "aws_s3_bucket" "logs" {
  count  = var.create_cloudfront ? 1 : 0
  bucket = "${var.bucket_name}-logs"

  tags = merge(
    var.tags,
    {
      Name = "${var.bucket_name}-logs"
    }
  )
}

resource "aws_s3_bucket_public_access_block" "logs" {
  count = var.create_cloudfront ? 1 : 0

  bucket = aws_s3_bucket.logs[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  count = var.create_cloudfront ? 1 : 0

  bucket = aws_s3_bucket.logs[0].id

  rule {
    id     = "delete-old-logs"
    status = "Enabled"
    filter {}

    expiration {
      days = 90
    }
  }
}
