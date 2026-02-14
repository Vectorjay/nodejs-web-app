variable  vpc_cidr_block {
    default = "10.0.0.0/16"
}
variable  subnet_cidr_block {
    default = "10.0.1.0/24"
}
variable  env_prefix {
    default = "dev"
}
variable  my_ip {
    default = "98.97.76.195/32"
}
variable  instance_type {
    default = "t3.medium"
} 
variable  availability_zone {
    default = "us-east-1a"
}
variable  image_name {
    default = "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"
}

variable region {
    default = "us-east-1"
}