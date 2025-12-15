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
        DOCKER_REGISTRY = "docker.io" // or your registry
    }
    
    tools {
        // Add Node.js tool if configured in Jenkins
        nodejs 'nodejs' // Update to match your Jenkins Node.js installation name
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
                    // Use npm ci for clean install (like package-lock.json)
                    //sh 'npm ci'
                    
                    // Or if you want to install globally for the pipeline
                    sh 'npm install'
                }
            }
        }
        
        stage('Run Tests') {
            steps {
                script {
                    echo 'Running tests...'
                    // Run tests if you have test scripts
                    sh 'npm test || true' // Continue even if tests fail
                    
                    // Run linting if configured
                    sh 'npm run lint || true'
                }
            }
        }
        
        stage('Build Application') {
            steps {
                script {
                    echo 'Building application...'
                    // Run build script if you have one (for frontend assets, etc.)
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
                        // Login to Docker Hub
                        sh "echo \$DOCKER_PASSWORD | docker login -u \$DOCKER_USERNAME --password-stdin"
                        
                        // Setup buildx for multi-platform builds
                        sh '''
                            docker buildx create --name multi-platform-builder --use --bootstrap || true
                            docker buildx inspect --bootstrap
                        '''
                        
                        // Build and push multi-platform image
                        sh """
                            docker buildx build \
                            --platform linux/amd64,linux/arm64 \
                            -t ${FULL_IMAGE_TAG} \
                            -t ${LATEST_TAG} \
                            --push .
                        """
                        
                        // Logout after push
                        sh 'docker logout'
                    }
                }
            }
        }
        
        stage('Verify Image') {
            steps {
                script {
                    echo 'Verifying multi-platform image was created...'
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
                    // Only deploy on main branch or specific branches
                    env.BRANCH_NAME == 'main' || env.BRANCH_NAME == 'master' 
                }
            }
            steps {
                script {
                    echo "Deploying ${FULL_IMAGE_TAG} to production..."
                    // Add your deployment logic here
                    // Example: Update Kubernetes deployment, AWS ECS, etc.
                    
                    // For Kubernetes:
                    // sh "kubectl set image deployment/nodejs-app nodejs-app=${FULL_IMAGE_TAG}"
                    
                    // For Docker Swarm:
                    // sh "docker service update --image ${FULL_IMAGE_TAG} nodejs-service"
                }
            }
        }
        
        stage('Cleanup') {
            steps {
                script {
                    echo 'Cleaning up workspace...'
                    // Clean Docker build cache
                    sh 'docker builder prune -f || true'
                    
                    // Optional: Clean old images
                    sh 'docker image prune -f || true'
                    
                    // Clean npm cache if needed
                    sh 'npm cache clean --force || true'
                }
            }
        }
    }
    
    post {
        always {
            echo 'Pipeline completed. Cleaning up...'
            // Clean up buildx builder
            sh 'docker buildx rm multi-platform-builder || true'
            
            // Archive artifacts if any
            archiveArtifacts artifacts: '**/*.log', allowEmptyArchive: true
            
            // Clean workspace
            cleanWs()
        }
        success {
            echo 'Pipeline succeeded!'
            // Send success notification
            // emailext body: "Node.js app ${IMAGE_TAG} built and pushed successfully!", subject: "Pipeline Success: ${JOB_NAME}", to: 'team@example.com'
        }
        failure {
            echo 'Pipeline failed!'
            // Send failure notification
            // emailext body: "Pipeline ${BUILD_URL} failed!", subject: "Pipeline Failure: ${JOB_NAME}", to: 'team@example.com'
        }
    }
}