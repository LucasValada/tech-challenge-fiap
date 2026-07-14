variable "cluster_name" {
  description = "Name of the Kind cluster"
  type        = string
  default     = "oficina-cluster"
}

variable "app_host_port" {
  description = "Host port mapped to the application NodePort (30080 inside the cluster)"
  type        = number
  default     = 3000
}

variable "db_host_port" {
  description = "Host port mapped to the PostgreSQL NodePort (30432 inside the cluster)"
  type        = number
  default     = 5432
}
