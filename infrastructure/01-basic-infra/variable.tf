
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "name_prefix" {
  description = "Prefix for AWS resource names"
  type        = string
  default     = "trafficflow-lab01"
}

variable "vpc_cidr" {
  description = "VPC CIDR range"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "Public subnet CIDR range"
  type        = string
  default     = "10.0.1.0/24"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "root_volume_size" {
  description = "EC2 root disk size in GiB"
  type        = number
  default     = 20

  validation {
    condition     = var.root_volume_size >= 8
    error_message = "Root volume size must be at least 8 GiB."
  }
}
