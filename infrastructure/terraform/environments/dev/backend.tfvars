bucket         = "auditflow-terraform-state-dev"
key            = "auditflow/dev/terraform.tfstate"
region         = "us-east-1"
encrypt        = true
dynamodb_table = "terraform-locks"
