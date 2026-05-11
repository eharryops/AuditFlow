# AuditFlow AWS Deployment Guide

## Overview

This Terraform infrastructure deploys AuditFlow to AWS with the following components:

| Component | Purpose | Config |
|-----------|---------|--------|
| **Lambda** | API backend (Node.js 20) | 512 MB (dev), 1 GB (prod) |
| **API Gateway** | REST API with CORS | Regional, caching enabled |
| **DynamoDB** | Memory store (findings cache) | On-demand (dev), Provisioned (prod) |
| **S3 + CloudFront** | Frontend distribution | Global CDN, HTTPS only |
| **CloudWatch** | Logging & monitoring | Logs, metrics, alarms |

---

## Prerequisites

1. **AWS Account** with permissions to create:
   - Lambda, API Gateway, DynamoDB, S3, CloudFront
   - CloudWatch, IAM roles
   - (Use `AdministratorAccess` policy for initial setup)

2. **CLI Tools**:
   ```bash
   # Terraform
   brew install terraform  # macOS
   choco install terraform # Windows
   
   # AWS CLI
   brew install awscli     # macOS
   choco install awscliv2  # Windows
   ```

3. **AWS Credentials**:
   ```bash
   aws configure
   # Enter AWS Access Key ID, Secret Key, region (us-east-1), output (json)
   ```

4. **Claude API Key**:
   ```bash
   export CLAUDE_API_KEY="sk-ant-..."
   ```

---

## Deployment Steps

### 1. Setup Backend Infrastructure (One-time)

The backend stores Terraform state in S3 with DynamoDB locks:

```bash
cd infrastructure
make backend-init ENVIRONMENT=dev
make backend-init ENVIRONMENT=prod
```

This creates:
- S3 buckets: `auditflow-terraform-state-dev`, `auditflow-terraform-state-prod`
- DynamoDB table: `terraform-locks`

### 2. Initialize Terraform

```bash
# Dev environment
make init ENVIRONMENT=dev

# Prod environment (requires AWS credentials with elevated permissions)
make init ENVIRONMENT=prod
```

### 3. Plan Infrastructure

```bash
# Review changes before applying
make plan ENVIRONMENT=dev

# This generates a tfplan file showing all resources to be created
```

Expected output (~15-20 resources):
```
Plan: 25 to add, 0 to change, 0 to destroy

Resources to create:
  + aws_lambda_function
  + aws_api_gateway_rest_api
  + aws_dynamodb_table
  + aws_s3_bucket
  + aws_cloudfront_distribution
  + aws_iam_role (2x)
  + aws_cloudwatch_log_group (2x)
  + aws_cloudwatch_metric_alarm (3x)
  + ... and 14 more
```

### 4. Apply Infrastructure

```bash
# Dev environment (fast, safe to test)
make apply ENVIRONMENT=dev

# Prod environment (requires manual confirmation)
make apply ENVIRONMENT=prod
```

Deployment takes ~5 minutes. You'll see:
```
✓ aws_iam_role.lambda_execution created
✓ aws_dynamodb_table.memory_store created
✓ aws_lambda_function.auditor created
✓ aws_api_gateway_rest_api.auditor created
✓ aws_s3_bucket.frontend created
✓ aws_cloudfront_distribution.frontend created
... (20+ resources)

Apply complete!
```

### 5. Retrieve Outputs

```bash
make output ENVIRONMENT=dev

# Returns:
# api_gateway_url = "https://xxxxx.execute-api.us-east-1.amazonaws.com/dev"
# cloudfront_domain = "dxxxxx.cloudfront.net"
# lambda_function_name = "auditflow-dev-auditor"
# dynamodb_table_name = "auditflow-dev-memory"
# s3_bucket_name = "auditflow-dev-frontend-123456789"
```

---

## Post-Deployment Configuration

### 1. Upload Frontend to S3

```bash
# Build React frontend
cd ../../frontend
npm run build

# Upload to S3
aws s3 sync dist/ s3://auditflow-dev-frontend-123456789/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id DXXXXX \
  --paths "/*"
```

### 2. Configure API URL in Frontend

Update `.env` in frontend:
```
VITE_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/dev
```

### 3. Package & Deploy Lambda

The Terraform module expects a ZIP file at `backend/.terraform/lambda-build.zip`.

Build and package:
```bash
cd ../../backend
npm install --production
zip -r ../.terraform/lambda-build.zip . \
  -x "node_modules/@anthropic-ai/sdk/docs/*" \
  -x "tests/*" \
  -x ".git/*"
```

Then re-apply Terraform:
```bash
make plan ENVIRONMENT=dev
make apply ENVIRONMENT=dev
```

---

## Environment Variables

### Dev Environment

```hcl
# environments/dev/terraform.tfvars
region      = "us-east-1"
environment = "dev"

# Allow local development origins
cors_allow_origins = [
  "http://localhost:3000",
  "http://localhost:5173"
]

# Low capacity for cost savings
dynamodb_read_capacity  = 0   # On-demand
dynamodb_write_capacity = 0   # On-demand

log_level = "DEBUG"
```

### Prod Environment

```hcl
# environments/prod/terraform.tfvars
region      = "us-east-1"
environment = "prod"

# Only production domain
cors_allow_origins = [
  "https://auditflow.eddieeharry.com"
]

# Provisioned capacity with auto-scaling
dynamodb_read_capacity  = 10
dynamodb_write_capacity = 10

log_level = "INFO"
```

---

## Testing Deployment

### 1. Health Check

```bash
API_URL="https://xxxxx.execute-api.us-east-1.amazonaws.com/dev"

curl -X GET $API_URL/health
# Expected: {"status": "ok"}
```

### 2. Run Audit

```bash
# Sample Terraform
TERRAFORM=$(cat <<'EOF'
resource "aws_s3_bucket" "example" {
  bucket = "example-bucket"
}
EOF
)

curl -X POST $API_URL/audit \
  -H "Content-Type: application/json" \
  -d "{\"terraform\": \"$TERRAFORM\"}"

# Expected: {"audit_id": "...", "findings": [...]}
```

### 3. Monitor Logs

```bash
# Lambda logs
aws logs tail /aws/lambda/auditflow-dev-auditor --follow

# API Gateway logs
aws logs tail /aws/apigateway/auditflow-dev --follow
```

---

## Cost Estimation

### Dev Environment (On-Demand DynamoDB)

| Service | Cost/Month | Notes |
|---------|-----------|-------|
| Lambda | ~$0.20 | 1M requests, 512 MB |
| DynamoDB | ~$1-5 | On-demand, ~100-500 writes/day |
| API Gateway | ~$0.35 | 1M API calls |
| S3 + CloudFront | ~$0.50 | <10 GB storage + data transfer |
| CloudWatch | ~$0.15 | Logs + metrics |
| **Total** | **~$2.50/month** | Very cheap for development |

### Prod Environment (Provisioned DynamoDB)

| Service | Cost/Month | Notes |
|---------|-----------|-------|
| Lambda | ~$5.00 | 10M requests, 1 GB |
| DynamoDB | ~$25 | 10 RCU, 10 WCU provisioned |
| API Gateway | ~$3.50 | 10M API calls |
| S3 + CloudFront | ~$2.00 | 100 GB storage + data transfer |
| CloudWatch | ~$0.50 | Logs + metrics |
| **Total** | **~$36/month** | Production-grade infrastructure |

**To reduce costs:**
1. Use DynamoDB on-demand instead of provisioned
2. Use S3 transfer acceleration to reduce bandwidth
3. Enable CloudFront compression for smaller responses
4. Set Lambda reserved concurrency to avoid unexpected scaling

---

## Monitoring & Alarms

### CloudWatch Dashboards

View infrastructure metrics:
```bash
aws cloudwatch list-dashboards
aws cloudwatch get-dashboard --dashboard-name AuditFlow
```

### Configured Alarms

1. **Lambda Errors** — Alert if >5 errors in 5 minutes
2. **Lambda Throttles** — Alert if any throttling occurs
3. **Lambda Duration** — Alert if 80% of timeout is exceeded
4. **DynamoDB Throttles** — Alert on throttled requests

View alarms:
```bash
aws cloudwatch describe-alarms --alarm-name-prefix auditflow-dev
```

---

## Updating Deployment

### Update Lambda Code

```bash
# 1. Update backend code
cd backend
# ... make changes ...

# 2. Rebuild and package
npm install --production
zip -r ../.terraform/lambda-build.zip . -x "node_modules/@anthropic-ai/sdk/docs/*"

# 3. Re-apply Terraform (detects code hash change)
cd ../infrastructure/terraform
make plan ENVIRONMENT=dev
make apply ENVIRONMENT=dev
```

### Update Frontend

```bash
# 1. Update React code
cd frontend
# ... make changes ...

# 2. Build and deploy
npm run build
aws s3 sync dist/ s3://auditflow-dev-frontend-123456789/ --delete

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id DXXXXX --paths "/*"
```

### Update Infrastructure

```bash
# Edit terraform files, then:
make plan ENVIRONMENT=dev
make apply ENVIRONMENT=dev
```

---

## Destroying Infrastructure

**WARNING: This will DELETE all AWS resources!**

```bash
# Dry-run (check what will be destroyed)
cd terraform
terraform destroy -var-file=environments/dev/terraform.tfvars -dry-run

# Actual destroy (requires confirmation)
make destroy ENVIRONMENT=dev

# This will:
# - Delete Lambda function
# - Delete API Gateway
# - Delete DynamoDB table
# - Empty and delete S3 buckets
# - Delete CloudFront distribution
# - Delete IAM roles
# - Delete CloudWatch logs (after retention period)
```

---

## Troubleshooting

### Lambda Fails to Start

```bash
# Check Lambda logs
aws logs tail /aws/lambda/auditflow-dev-auditor --follow

# Check for missing environment variables
aws lambda get-function-configuration --function-name auditflow-dev-auditor
```

**Common Issues:**
- `CLAUDE_API_KEY` not set
- `DYNAMODB_TABLE_NAME` not matching actual table
- Node.js dependencies missing in ZIP

### API Gateway Returns 5xx

```bash
# Check API logs
aws logs tail /aws/apigateway/auditflow-dev --follow

# Check Lambda execution
aws lambda invoke --function-name auditflow-dev-auditor /tmp/response.json
cat /tmp/response.json
```

### DynamoDB Throttled

```bash
# Check consumed capacity
aws dynamodb get-item \
  --table-name auditflow-dev-memory \
  --key '{"audit_id": {"S": "test-id"}}'

# If on-demand, auto-scales. If provisioned, increase capacity:
aws dynamodb update-table \
  --table-name auditflow-dev-memory \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=20,WriteCapacityUnits=20
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CloudFront CDN                           │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Caching Layer (300 sec)                                 │    │
│  │ - Static assets: /index.html, /main.js, /style.css     │    │
│  │ - API responses: /api/* (0 sec cache)                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           ↓                                       │
└───────────────────────────┼───────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                      S3 Origin (Frontend)                         │
│  - React app (dist/)                                             │
│  - Static assets                                                 │
│  - Versioning enabled (retention: 30 days)                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────┴───────┐
                    ↓               ↓
            ┌──────────────┐   ┌──────────────┐
            │ API Gateway  │   │ S3 Direct    │
            │ (caching)    │   │ (fallback)   │
            └──────┬───────┘   └──────────────┘
                   ↓
        ┌──────────────────────┐
        │   Lambda Function    │
        │ (auditflow-auditor)  │
        │ - 512 MB (dev)       │
        │ - 1 GB (prod)        │
        │ - Timeout: 60/120s   │
        └──────────┬───────────┘
                   ↓
        ┌──────────────────────┐
        │    DynamoDB Table    │
        │ (auditflow-memory)   │
        │ - Audit findings     │
        │ - TTL: 90 days       │
        │ - Point-in-time rec. │
        └──────────────────────┘
```

---

## Next Steps

1. ✅ Deploy infrastructure (Terraform)
2. 📦 Build and push Lambda code
3. 🎨 Upload React frontend
4. 🧪 Test /audit endpoint
5. 📊 Monitor CloudWatch dashboards
6. 🔐 Add authentication (API Key, OAuth)
7. 📈 Set up auto-scaling policies
8. 🚀 Configure DNS (Route 53)

---

## Support & Questions

For issues:
1. Check CloudWatch logs
2. Review Terraform state: `terraform state show`
3. Verify IAM permissions: `aws iam get-user`
4. Test Lambda locally: `sam local start-api`

---

**Created:** 2024-05-11  
**By:** Eddie Harry  
**Project:** AuditFlow - AI Infrastructure Auditor
