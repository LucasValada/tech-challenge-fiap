terraform {
  required_version = ">= 1.6"

  required_providers {
    kind = {
      source  = "tehcyx/kind"
      version = "~> 0.6"
    }
  }
}

provider "kind" {}

resource "kind_cluster" "oficina" {
  name           = var.cluster_name
  wait_for_ready = true

  kind_config {
    kind        = "Cluster"
    api_version = "kind.x-k8s.io/v1alpha4"

    # Control-plane exposes app (NodePort 30080) and Postgres (NodePort 30432) to the host
    node {
      role = "control-plane"

      extra_port_mappings {
        container_port = 30080
        host_port      = var.app_host_port
        protocol       = "TCP"
      }

      extra_port_mappings {
        container_port = 30432
        host_port      = var.db_host_port
        protocol       = "TCP"
      }
    }

    # Two worker nodes simulate high-availability
    node {
      role = "worker"
    }

    node {
      role = "worker"
    }
  }
}
