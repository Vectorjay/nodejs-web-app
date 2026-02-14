#!/bin/bash
set -e

echo "🚀 Setting up Application Server with Docker"

# Update packages
apt-get update -y

# Install Docker + curl (for compose download)
apt-get install -y docker.io curl

# Enable and start Docker
systemctl enable docker
systemctl start docker

# Add ubuntu user to docker group (if exists)
if id "ubuntu" &>/dev/null; then
    usermod -aG docker ubuntu
fi

# Install Docker Compose (standalone binary)
echo "📦 Installing Docker Compose..."

curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose

chmod +x /usr/local/bin/docker-compose

# Verify installation (logs will appear in cloud-init output)
docker --version
docker-compose --version

echo "✅ Docker and Docker Compose installed successfully"
