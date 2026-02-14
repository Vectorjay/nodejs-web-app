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

        stage ('Terraform server provision')
            {
            environment {
                AWS_ACCESS_KEY_ID = credentials ('jenkins_aws_access_key_id')
                AWS_SECRET_ACCESS_KEY = credentials ('jenkins_aws_secret_access_key')
                TF_VAR_env_prefix = 'test'
            }
            script{
                dir('terraform') {
                    sh "terrafom init"
                    sh "terraform apply --auto-apply"
                    EC2_PUBLIC_IP = sh (
                        script: "terraform output ec2_public_ip",
                        returnStdout: true
                    ).trim()
                }
            }

        }

        stage('Deploy to Server') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "waiting for EC2 server to initialize"
                    sleep(time: 90, unit: "SECONDS")

                    echo "deploying docker image to ec2..."
                    echo "${EC2_PUBLIC_IP}"
                    
                    sshagent(['ubuntu-server-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ubuntu@${EC2_PUBLIC_IP} "
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
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    try {
                        // Check if there are any changes
                        def changes = sh(script: 'git status --porcelain', returnStdout: true).trim()
                        
                        if (changes) {
                            echo "Found changes to commit: ${changes}"
                            
                            withCredentials([
                                usernamePassword(
                                    credentialsId: 'github-creds',
                                    usernameVariable: 'GIT_USER',
                                    passwordVariable: 'GIT_TOKEN'
                                )
                            ]) {
                                sh """
                                    # Set git config
                                    git config user.email "jenkins@example.com"
                                    git config user.name "jenkins"
                                    
                                    # Add only tracked files (safer)
                                    git add -u
                                    
                                    # Commit
                                    git commit -m "ci: update for build ${env.BUILD_NUMBER} [skip ci]"
                                    
                                    # Push to current branch
                                    git push https://${GIT_USER}:${GIT_TOKEN}@github.com/Vectorjay/nodejs-web-app.git HEAD:${env.BRANCH_NAME}
                                """
                            }
                            echo "Changes committed successfully"
                        } else {
                            echo "No changes to commit"
                        }
                    } catch (Exception e) {
                        echo "Failed to commit changes: ${e.message}"
                        echo "Continuing pipeline..."
                        // Don't fail the whole pipeline
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
        success {
            echo "✅ Pipeline completed successfully!"
        }
        failure {
            echo "❌ Pipeline failed!"
        }
    }
}
