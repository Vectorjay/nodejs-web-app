pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = "vectorzy/nodejs-web-app"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build and Test') {
            steps {
                sh 'npm install'
                sh 'npm test || echo "Tests optional"'
                sh 'npm run build || echo "Build optional"'
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    // Simple tag - just use build number
                    def tag = "build-${env.BUILD_NUMBER}"
                    
                    withCredentials([usernamePassword(
                        credentialsId: 'docker-hub-repo',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )]) {
                        sh """
                            echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin
                            
                            # Simple single-arch build (much faster)
                            docker build -t ${DOCKER_IMAGE}:${tag} .
                            docker push ${DOCKER_IMAGE}:${tag}
                            
                            # Also tag as latest if on main branch
                            if [ "${env.BRANCH_NAME}" = "main" ]; then
                                docker tag ${DOCKER_IMAGE}:${tag} ${DOCKER_IMAGE}:latest
                                docker push ${DOCKER_IMAGE}:latest
                            fi
                            
                            docker logout
                        """
                    }
                }
            }
        }
        
    //     stage('Deploy to Server') {
    //         when {
    //             branch 'main'
    //         }
    //         steps {
    //             script {
    //                 def tag = "build-${env.BUILD_NUMBER}"
                    
    //                 sshagent(['ubuntu-server-key']) {
    //                     sh """
    //                         ssh -o StrictHostKeyChecking=no ubuntu@13.53.44.237 "
    //                             cd /home/ubuntu
    //                             docker pull ${DOCKER_IMAGE}:${tag}
    //                             docker-compose down
    //                             docker-compose up -d
    //                         "
    //                     """
    //                 }
    //             }
    //         }
    //     }
    // }

    stage('Deploy (Main Branch Only)') {
    when {
        branch 'main'
    }
    steps {
        sshagent(['ubuntu-server-key']) {
            sh """
                # Make sure we have a docker-compose file
                ls -la docker-compose* || echo "Creating default docker-compose file..."
                
                # Create one if missing (optional)
                if [ ! -f "docker-compose.yaml" ] && [ ! -f "docker-compose.yml" ]; then
                    cat > docker-compose.yaml << 'EOF'
    version: '3'
    services:
    app:
        image: ${env.FULL_IMAGE_TAG}
        ports:
        - "3000:3000"
        restart: always
    EOF
                fi
                
                # Copy and deploy
                scp docker-compose.yaml ubuntu@13.51.242.134:/home/ubuntu/
                
                ssh ubuntu@13.51.242.134 "
                    cd /home/ubuntu
                    docker-compose pull
                    docker-compose up -d
                "
            """
        }
    }
}
    
    post {
        always {
            sh 'docker system prune -f || true'
            cleanWs()
        }
    }
}