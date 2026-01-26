pipeline {
    agent any

    environment {
        AWS_REGION   = "us-east-1"
        AWS_ACCOUNT  = "497248976364"
        ECR_REGISTRY = "${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        DOCKER_IMAGE = "${ECR_REGISTRY}/nodejs-web-app"
        EKS_CLUSTER  = "web-cluster"
        APP_NAME     = "nodejs-web-app"
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

        stage('Build & Push Docker Image (ECR)') {
            steps {
                script {
                    def tag = "build-${env.BUILD_NUMBER}"
                    env.FULL_IMAGE_TAG = "${DOCKER_IMAGE}:${tag}"

                    withCredentials([
                        [
                            $class: 'AmazonWebServicesCredentialsBinding',
                            credentialsId: 'ecr-creds'
                        ]
                    ]) {
                        sh """
                            set -e

                            echo "🔐 Logging into ECR"
                            aws ecr get-login-password --region ${AWS_REGION} \
                              | docker login --username AWS --password-stdin ${ECR_REGISTRY}

                            echo "🐳 Building image: ${FULL_IMAGE_TAG}"
                            docker build -t ${FULL_IMAGE_TAG} .
                            docker push ${FULL_IMAGE_TAG}

                            if [ "${BRANCH_NAME}" = "main" ]; then
                                docker tag ${FULL_IMAGE_TAG} ${DOCKER_IMAGE}:latest
                                docker push ${DOCKER_IMAGE}:latest
                            fi

                            docker logout ${ECR_REGISTRY}
                        """
                    }
                }
            }
        }

        stage('Deploy to EKS') {
            when {
                branch 'main'
            }

            steps {
                script {
                    withCredentials([
                        [
                            $class: 'AmazonWebServicesCredentialsBinding',
                            credentialsId: 'ecr-creds'
                        ]
                    ]) {
                        sh """
                            set -e

                            echo "📦 Creating kubeconfig for EKS"
                            mkdir -p \$HOME/.kube
                            aws eks update-kubeconfig \
                              --region ${AWS_REGION} \
                              --name ${EKS_CLUSTER}

                            echo "🔎 Cluster status"
                            kubectl get nodes

                            echo "🚀 Deploying image: ${FULL_IMAGE_TAG}"

                            kubectl set image deployment/${APP_NAME} \
                              ${APP_NAME}=${FULL_IMAGE_TAG}

                            kubectl rollout status deployment/${APP_NAME}
                        """
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
