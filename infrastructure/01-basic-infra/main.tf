
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Get available Availability Zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Find the latest Ubuntu 24.04 AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# VPC
resource "aws_vpc" "trafficflow" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.name_prefix}-vpc"
  }
}

# Public subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.trafficflow.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.name_prefix}-public-subnet"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "trafficflow" {
  vpc_id = aws_vpc.trafficflow.id

  tags = {
    Name = "${var.name_prefix}-igw"
  }
}

# Public route table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.trafficflow.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.trafficflow.id
  }

  tags = {
    Name = "${var.name_prefix}-public-rt"
  }
}

# Associate route table with public subnet
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Security group
resource "aws_security_group" "app" {
  name        = "${var.name_prefix}-app-sg"
  description = "Allow TrafficFlow web and API traffic"
  vpc_id      = aws_vpc.trafficflow.id

  # Frontend
  ingress {
    description = "TrafficFlow frontend"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Backend API
  ingress {
    description = "TrafficFlow API"
    from_port   = 4000
    to_port     = 4000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound internet access
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.name_prefix}-app-sg"
  }
}

# IAM role for EC2 Session Manager
data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ssm" {
  name               = "${var.name_prefix}-ssm-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

# Allow Session Manager access
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ssm.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Instance profile
resource "aws_iam_instance_profile" "ssm" {
  name = "${var.name_prefix}-instance-profile"
  role = aws_iam_role.ssm.name
}

# EC2 instance
resource "aws_instance" "app" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.app.id]
  associate_public_ip_address = true

  iam_instance_profile = aws_iam_instance_profile.ssm.name

  root_block_device {
    volume_size           = var.root_volume_size
    volume_type           = "gp3"
    delete_on_termination = true
  }

  # Install Docker
  user_data = <<-EOF
    #!/bin/bash
    set -eux

    apt-get update
    apt-get install -y docker.io docker-compose-v2

    systemctl enable docker
    systemctl start docker

    # Install SSM Agent if missing
    snap install amazon-ssm-agent --classic || true
    systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent.service || true
    systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service || true
  EOF

  depends_on = [
    aws_iam_role_policy_attachment.ssm_core
  ]

  tags = {
    Name = "${var.name_prefix}-ec2"
  }
}

# Outputs
output "instance_id" {
  value       = aws_instance.app.id
  description = "EC2 instance ID"
}

output "instance_public_ip" {
  value       = aws_instance.app.public_ip
  description = "Public IPv4 address"
}

output "web_url" {
  value       = "http://${aws_instance.app.public_ip}:3000"
  description = "TrafficFlow frontend URL"
}

output "api_url" {
  value       = "http://${aws_instance.app.public_ip}:4000"
  description = "TrafficFlow API URL"
}
