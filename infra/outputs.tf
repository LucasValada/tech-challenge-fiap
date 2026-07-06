output "cluster_name" {
  description = "Name of the provisioned Kind cluster"
  value       = kind_cluster.oficina.name
}

output "kubeconfig_path" {
  description = "Absolute path to the kubeconfig file created by Kind"
  value       = kind_cluster.oficina.kubeconfig_path
}

output "kubeconfig" {
  description = "Raw kubeconfig content (sensitive)"
  value       = kind_cluster.oficina.kubeconfig
  sensitive   = true
}
