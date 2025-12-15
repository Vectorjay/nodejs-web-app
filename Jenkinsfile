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
        DEPLOY_IMAGE = ""  // Will be set dynamically
        DEPLOY_TAG = ""    // Will be set dynamically
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
                    
                    // Set the deployment image to use
                    env.DEPLOY_IMAGE = env.FULL_IMAGE_TAG
                    env.DEPLOY_TAG = env.IMAGE_TAG
                    
                    echo "Deployment image set to: ${DEPLOY_IMAGE}"
                }
            }
        }
        
        stage('Verify Image') {
            steps {
                script {
                    echo "Verifying multi-platform image: ${DEPLOY_IMAGE}"
                    withCredentials([usernamePassword(
                        credentialsId: 'docker-hub-repo', 
                        passwordVariable: 'DOCKER_PASSWORD', 
                        usernameVariable: 'DOCKER_USERNAME'
                    )]) {
                        sh """
                            docker login -u \$DOCKER_USERNAME -p \$DOCKER_PASSWORD
                            docker buildx imagetools inspect ${DEPLOY_IMAGE}
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
                    echo "Deploying ${DEPLOY_IMAGE} to production..."
                    echo "Using tag: ${DEPLOY_TAG}"
                    
                    // Method 1: Deploy specific tagged image
                    def dockerCmd = "docker run -p 3000:3000 -d ${DEPLOY_IMAGE}"
                    // OR Method 2: Deploy latest image
                    // def dockerCmd = "docker run -p 3000:3000 -d ${LATEST_TAG}"
                    
                    sshagent(['ubuntu-server-key']) {
                        sh "ssh -o StrictHostKeyChecking=no ubuntu@13.51.242.134 '${dockerCmd}'"
                    }
                    
                    // Alternative: Pull and run on target server
                    sshagent(['ubuntu-server-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ubuntu@13.51.242.134 '
                                docker pull ${DEPLOY_IMAGE} || true
                                docker stop nodejs-app || true
                                docker rm nodejs-app || true
                                docker run -d --name nodejs-app -p 3000:3000 ${DEPLOY_IMAGE}
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
        }
        success {
            echo "Pipeline succeeded! Image deployed: ${DEPLOY_IMAGE}"
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}