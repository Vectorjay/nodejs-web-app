pipeline {
    agent any
    
    environment {
        // Use package.json version or generate timestamp-based version
        NODE_VERSION = sh(script: 'node -p "require(\'./package.json\').version"', returnStdout: true).trim()
        BUILD_TIMESTAMP = sh(script: 'date +%Y%m%d%H%M%S', returnStdout: true).trim()
        IMAGE_TAG = "${NODE_VERSION}-${BUILD_NUMBER}-${BUILD_TIMESTAMP}"
        DOCKER_IMAGE = "vectorzy/nodejs-web-app"
        FULL_IMAGE_TAG = "${DOCKER_IMAGE}:${IMAGE_TAG}"
        LATEST_TAG = "${DOCKER_IMAGE}:latest"
    }
    
    tools {
        nodejs 'nodejs'
    }
    
    stages {
        
        stage('Checkout and Setup') {
            steps {
                checkout scm
                script {
                    echo "Building Node.js app version: ${NODE_VERSION}"
                    echo "Build Number: ${BUILD_NUMBER}"
                    echo "Image Tag: ${IMAGE_TAG}"
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                script {
                    echo 'Installing Node.js dependencies...'
                    sh 'npm install'
                }
            }
        }
        
        stage('Run Tests') {
            steps {
                script {
                    echo 'Running tests...'
                    sh 'npm test || true'
                    sh 'npm run lint || true'
                }
            }
        }
        
        stage('Build Application') {
            steps {
                script {
                    echo 'Building application...'
                    sh 'npm run build || echo "No build script found, skipping build step"'
                }
            }
        }
        
        stage('Build Docker Image (Multi-Platform)') {
            steps {
                script {
                    echo "Building multi-platform Docker image: ${FULL_IMAGE_TAG}"
                    echo "Platforms: linux/amd64, linux/arm64"
                    
                    withCredentials([usernamePassword(
                        credentialsId: 'docker-hub-repo', 
                        passwordVariable: 'DOCKER_PASSWORD', 
                        usernameVariable: 'DOCKER_USERNAME'
                    )]) {
                        sh "echo \$DOCKER_PASSWORD | docker login -u \$DOCKER_USERNAME --password-stdin"
                        
                        sh '''
                            docker buildx create --name multi-platform-builder --use --bootstrap || true
                            docker buildx inspect --bootstrap
                        '''
                        
                        sh """
                            docker buildx build \
                            --platform linux/amd64,linux/arm64 \
                            -t ${FULL_IMAGE_TAG} \
                            -t ${LATEST_TAG} \
                            --push .
                        """
                        
                        sh 'docker logout'
                    }
                }
            }
        }
        
        stage('Verify Image') {
            steps {
                script {
                    echo "Verifying multi-platform image: ${FULL_IMAGE_TAG}"
                    withCredentials([usernamePassword(
                        credentialsId: 'docker-hub-repo', 
                        passwordVariable: 'DOCKER_PASSWORD', 
                        usernameVariable: 'DOCKER_USERNAME'
                    )]) {
                        sh """
                            docker login -u \$DOCKER_USERNAME -p \$DOCKER_PASSWORD
                            docker buildx imagetools inspect ${FULL_IMAGE_TAG}
                            docker logout
                        """
                    }
                }
            }
        }
        
        stage('Deploy to Environment') {
            when {
                expression { 
                    env.BRANCH_NAME == 'main' || env.BRANCH_NAME == 'master' 
                }
            }
            steps {
                script {
                    echo "Deploying ${FULL_IMAGE_TAG} to production..."
                    
                    // Choose which image to deploy - you can use FULL_IMAGE_TAG or LATEST_TAG
                    def deployImage = env.FULL_IMAGE_TAG  // or env.LATEST_TAG
                    
                    sshagent(['ubuntu-server-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ubuntu@13.51.242.134 '
                                # Pull the image
                                docker pull ${deployImage}
                                
                                # Stop and remove existing container if it exists
                                if docker ps -a --format "{{.Names}}" | grep -q "^nodejs-app\$"; then
                                    echo "Stopping existing nodejs-app container..."
                                    docker stop nodejs-app
                                    docker rm nodejs-app
                                fi
                                
                                # Run new container
                                echo "Starting new container with ${deployImage}..."
                                docker run -d \
                                    --name nodejs-app \
                                    --restart unless-stopped \
                                    -p 3000:3000 \
                                    -e NODE_ENV=production \
                                    ${deployImage}
                                
                                # Verify container is running
                                sleep 5
                                echo "Container status:"
                                docker ps --filter "name=nodejs-app" --format "table {{.Names}}\\t{{.Status}}"
                            '
                        """
                    }
                }
            }
        }
        
        stage('Cleanup') {
            steps {
                script {
                    echo 'Cleaning up workspace...'
                    sh 'docker builder prune -f || true'
                    sh 'docker image prune -f || true'
                    sh 'npm cache clean --force || true'
                }
            }
        }
    }
    
    post {
        always {
            echo 'Pipeline completed. Cleaning up...'
            sh 'docker buildx rm multi-platform-builder || true'
            archiveArtifacts artifacts: '**/*.log', allowEmptyArchive: true
            cleanWs()
            
            // Log the image that was built (if available)
            script {
                try {
                    echo "Built image: ${FULL_IMAGE_TAG}"
                } catch (Exception e) {
                    echo "Image information not available"
                }
            }
        }
        success {
            script {
                // Use try-catch to handle missing properties
                def imageInfo = "Unknown"
                try {
                    imageInfo = env.FULL_IMAGE_TAG ?: "Image tag not set"
                } catch (Exception e) {
                    imageInfo = "Image information unavailable"
                }
                echo "Pipeline succeeded! Image: ${imageInfo}"
            }
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}