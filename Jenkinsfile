pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = "vectorzy/nodejs-web-app"
        SERVER_DIR = "/home/ubuntu"
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
                    def tag = "build-${env.BUILD_NUMBER}"
                    env.FULL_IMAGE_TAG = "${DOCKER_IMAGE}:${tag}"
                    
                    withCredentials([usernamePassword(
                        credentialsId: 'docker-hub-repo',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )]) {
                        sh """
                            echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin
                            docker build -t ${env.FULL_IMAGE_TAG} .
                            docker push ${env.FULL_IMAGE_TAG}
                            
                            if [ "${env.BRANCH_NAME}" = "main" ]; then
                                docker tag ${env.FULL_IMAGE_TAG} ${DOCKER_IMAGE}:latest
                                docker push ${DOCKER_IMAGE}:latest
                            fi
                            
                            docker logout
                        """
                    }
                }
            }
        }
        
        stage('Deploy to Server') {
            when {
                branch 'main'
            }
            steps {
                script {
                    sshagent(['ubuntu-server-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ubuntu@13.53.44.237 "
                                # Pull the new image
                                docker pull ${env.FULL_IMAGE_TAG}
                                
                                # Stop and remove old container if exists
                                docker stop nodejs-app 2>/dev/null || echo 'No container to stop'
                                docker rm nodejs-app 2>/dev/null || echo 'No container to remove'
                                
                                # Run new container
                                docker run -d \\
                                  --name nodejs-app \\
                                  -p 3000:3000 \\
                                  --restart unless-stopped \\
                                  ${env.FULL_IMAGE_TAG}
                                
                                echo 'Container started!'
                                docker ps | grep nodejs-app
                            "
                        """
                    }
                }
            }
        }
        
        stage('Commit Version Update') {
            steps {
                script {
                    withCredentials([usernamePassword(
                        credentialsId: 'github-creds',
                        usernameVariable: 'USER',
                        passwordVariable: 'PASS'
                    )]) {
                        sh '''
                            git config user.email "jenkins@example.com"
                            git config user.name "jenkins"
                            git status
                        '''
                        
                        sh '''
                            git diff --quiet || (
                              git add .
                              git commit -m "ci: version bump"
                              git remote set-url origin https://${USER}:${PASS}@github.com/Vectorjay/nodejs-web-app.git
                              git push origin HEAD:refs/heads/jenkins-jobs
                            )
                        '''
                    }
                }
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