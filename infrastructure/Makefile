.PHONY: help init plan apply destroy fmt validate clean

ENVIRONMENT ?= dev
REGION ?= us-east-1
TF_DIR := terraform
ENV_DIR := $(TF_DIR)/environments/$(ENVIRONMENT)

help:
	@echo "AuditFlow Infrastructure Management"
	@echo "===================================="
	@echo ""
	@echo "Usage: make [target] ENVIRONMENT=dev|prod"
	@echo ""
	@echo "Targets:"
	@echo "  init       - Initialize Terraform (run once per environment)"
	@echo "  plan       - Plan infrastructure changes"
	@echo "  apply      - Apply infrastructure changes"
	@echo "  destroy    - Destroy infrastructure (use with caution!)"
	@echo "  fmt        - Format Terraform code"
	@echo "  validate   - Validate Terraform configuration"
	@echo "  clean      - Remove .terraform and lock files"
	@echo "  cost       - Estimate infrastructure costs"
	@echo ""
	@echo "Examples:"
	@echo "  make init ENVIRONMENT=dev"
	@echo "  make plan ENVIRONMENT=prod"
	@echo "  make apply ENVIRONMENT=prod"

init:
	@echo "Initializing Terraform for $(ENVIRONMENT) environment..."
	cd $(TF_DIR) && terraform init \
		-backend-config=$(ENV_DIR)/backend.tfvars \
		-upgrade

plan:
	@echo "Planning infrastructure changes for $(ENVIRONMENT) environment..."
	cd $(TF_DIR) && terraform plan \
		-var-file=$(ENV_DIR)/terraform.tfvars \
		-out=tfplan

apply:
	@echo "Applying infrastructure changes to $(ENVIRONMENT) environment..."
	@echo "WARNING: This will create/modify AWS resources"
	@read -p "Continue? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		cd $(TF_DIR) && terraform apply tfplan; \
	fi

destroy:
	@echo "DESTROYING $(ENVIRONMENT) infrastructure"
	@echo "WARNING: This will DELETE all AWS resources!"
	@read -p "Type '$(ENVIRONMENT)-destroy' to confirm: " confirm; \
	if [ "$$confirm" = "$(ENVIRONMENT)-destroy" ]; then \
		cd $(TF_DIR) && terraform destroy \
			-var-file=$(ENV_DIR)/terraform.tfvars \
			-auto-approve; \
	else \
		echo "Destroy cancelled."; \
	fi

fmt:
	@echo "Formatting Terraform code..."
	cd $(TF_DIR) && terraform fmt -recursive

validate:
	@echo "Validating Terraform configuration..."
	cd $(TF_DIR) && terraform validate

clean:
	@echo "Cleaning Terraform files..."
	cd $(TF_DIR) && rm -rf .terraform .terraform.lock.hcl tfplan
	find . -name '.terraform' -type d -exec rm -rf {} + 2>/dev/null || true

cost:
	@echo "Estimating costs for $(ENVIRONMENT) environment..."
	@echo "Install 'infracost' to see detailed cost estimates:"
	@echo "  brew install infracost  (macOS)"
	@echo "  choco install infracost (Windows)"
	@echo "Then run: infracost breakdown --path $(TF_DIR)"

# Output useful information
output:
	@echo "Outputs for $(ENVIRONMENT) environment:"
	cd $(TF_DIR) && terraform output -json

# Show current state
state-show:
	@echo "Current Terraform state for $(ENVIRONMENT):"
	cd $(TF_DIR) && terraform state list

# Backend setup (one-time for S3 + DynamoDB)
backend-init:
	@echo "Setting up backend infrastructure..."
	@echo "Creating S3 bucket for Terraform state..."
	aws s3 mb s3://auditflow-terraform-state-$(ENVIRONMENT) \
		--region $(REGION) 2>/dev/null || echo "Bucket already exists"
	@echo "Enabling versioning..."
	aws s3api put-bucket-versioning \
		--bucket auditflow-terraform-state-$(ENVIRONMENT) \
		--versioning-configuration Status=Enabled
	@echo "Creating DynamoDB table for locks..."
	aws dynamodb create-table \
		--table-name terraform-locks \
		--attribute-definitions AttributeName=LockID,AttributeType=S \
		--key-schema AttributeName=LockID,KeyType=HASH \
		--billing-mode PAY_PER_REQUEST \
		--region $(REGION) 2>/dev/null || echo "Table already exists"
	@echo "Backend infrastructure ready!"
