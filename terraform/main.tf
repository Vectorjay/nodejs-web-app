provider "aws"{
    default = var.region
}

resource "aws_vpc" "myapp_vpc"{
    cidr_block = var.vpc_cidr_block
    tags = {
        Name: "${var.env_prefix}-vpc"
    }
}

resource "aws_subnet" "myapp-subnet-1" {
  vpc_id     = aws_vpc.myapp_vpc.id
  cidr_block = var.subnet_cidr_block
  availability_zone = var.availability_zone
  tags = {
        Name: "${var.env_prefix}-subnet-1"
    }
}

resource "aws_internet_gateway" "myapp-igw"{
    vpc_id = aws_vpc.myapp_vpc.id

    tags = {
        Name: "${var.env_prefix}-igw"
    }

}

resource "aws_default_route_table" "main-rtb"{
    default_route_table_id = aws_vpc.myapp_vpc.default_route_table_id
    route {
        cidr_block = "0.0.0.0/0"
        gateway_id = aws_internet_gateway.myapp-igw.id
    }
    tags = {
        Name: "${var.env_prefix}-main-rtb"
    }
}

data "aws_ami" "latest-ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = [var.image_name]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "myapp-server" {
  ami           = data.aws_ami.latest-ubuntu.id
  instance_type = var.instance_type

  subnet_id = aws_subnet.myapp-subnet-1.id
  vpc_security_group_ids = [aws_default_security_group.default-sg.id]
  availability_zone = var.availability_zone

  associate_public_ip_address = true
  key_name = "devops_new"

  user_data = file("entry-script.sh")

  tags = {
    Name = "${var.env_prefix}-server"
  }
}

