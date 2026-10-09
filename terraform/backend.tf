terraform {
  # O bucket sai do bootstrap de tc3-infra-k8s e entra via -backend-config:
  #   terraform init -backend-config="bucket=SEU_BUCKET"
  backend "s3" {
    key          = "os-service/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
