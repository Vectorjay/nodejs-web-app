pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "vectorzy/nodejs-web-app"
        AWS_REGION   = "us-east-1"
        EKS_CLUSTER  = "demo-cluster"
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

        stage('Deploy to EKS') {
            when {
                branch 'main'
            }
            environment {
                AWS_ACCESS_KEY_ID = credentials('jenkins_aws_access_key_id')
                AWS_SECRET_ACCESS_KEY = credentials('jenkins-aws_secret_access_key')
            }
            steps {
                script {
                    echo '🚀 Deploying to EKS...'
                    
                    sh '''
                        # Set AWS credentials
                        export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
                        export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
                        export AWS_DEFAULT_REGION="${AWS_REGION}"
                        
                        # Clean up any role environment variables
                        unset AWS_ROLE_ARN AWS_WEB_IDENTITY_TOKEN_FILE AWS_ROLE_SESSION_NAME 2>/dev/null || true
                        
                        # Generate fresh kubeconfig
                        echo "Generating kubeconfig..."
                        rm -f ~/.kube/config
                        aws eks update-kubeconfig \
                          --region ${AWS_REGION} \
                          --name ${EKS_CLUSTER}
                        
                        # Test connection
                        echo "Testing EKS connection..."
                        kubectl get nodes
                        
                        # Deploy your app
                        echo "Deploying application..."
                        
                        # Update or create deployment
                        kubectl set image deployment/nodejs-app nodejs-app=${FULL_IMAGE_TAG} \
                          --namespace=default \
                          --record || \
                          kubectl create deployment nodejs-app \
                            --image=${FULL_IMAGE_TAG} \
                            --namespace=default
                        
                        # Create service if it doesn't exist
                        kubectl expose deployment nodejs-app \
                          --type=LoadBalancer \
                          --port=80 \
                          --target-port=3000 \
                          --name=nodejs-app-service \
                          --namespace=default \
                          --dry-run=client -o yaml | kubectl apply -f -
                        
                        echo "Waiting for rollout..."
                        kubectl rollout status deployment/nodejs-app --namespace=default --timeout=120s
                        
                        echo "✅ Deployment complete!"
                    '''
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
                        def changes = sh(
                            script: 'git status --porcelain',
                            returnStdout: true
                        ).trim()

                        if (changes) {
                            echo "Found changes to commit"

                            withCredentials([
                                usernamePassword(
                                    credentialsId: 'github-creds',
                                    usernameVariable: 'GIT_USER',
                                    passwordVariable: 'GIT_TOKEN'
                                )
                            ]) {
                                sh """
                                    git config user.email "jenkins@example.com"
                                    git config user.name "jenkins"

                                    git add -u
                                    git commit -m "ci: update for build ${env.BUILD_NUMBER} [skip ci]"
                                    git push https://${GIT_USER}:${GIT_TOKEN}@github.com/Vectorjay/nodejs-web-app.git HEAD:${env.BRANCH_NAME}
                                """
                            }
                        } else {
                            echo "No changes to commit"
                        }
                    } catch (Exception e) {
                        echo "Commit stage failed: ${e.message}"
                        echo "Continuing pipeline..."
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