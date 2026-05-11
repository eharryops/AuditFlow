bucket         = "auditflow-terraform-state-prod"
key            = "auditflow/prod/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "terraform-locks"
