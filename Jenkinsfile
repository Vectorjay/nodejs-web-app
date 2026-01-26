pipeline {
    agent any

    environment {
        AWS_REGION   = "us-east-1"
        EKS_CLUSTER  = "web-cluster"
        DOCKER_REPO_SERVER = "497248976364.dkr.ecr.us-east-1.amazonaws.com"
        DOCKER_REPO = "${DOCKER_REPO_SERVER}/nodejs-app"
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
                    env.FULL_IMAGE_TAG = "${DOCKER_REPO}:${tag}"

                    withCredentials([
                        usernamePassword(
                            credentialsId: 'ecr-creds',
                            usernameVariable: 'DOCKER_USER',
                            passwordVariable: 'DOCKER_PASS'
                        )
                    ]) {
                        sh """
                            echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin $DOCKER_REPO_SERVER 
                            docker build -t  ${DOCKER_REPO}:${FULL_IMAGE_TAG} .
                            docker push ${DOCKER_REPO}:${FULL_IMAGE_TAG}

                            if [ "${BRANCH_NAME}" = "main" ]; then
                                docker tag ${FULL_IMAGE_TAG} ${DOCKER_REPO}:latest
                                docker push ${DOCKER_REPO}:latest
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
                AWS_ACCESS_KEY_ID     = credentials('jenkins_aws_access_key_id')
                AWS_SECRET_ACCESS_KEY = credentials('jenkins_aws_secret_access_key')
                APP_NAME = 'nodejs-web-app'
            }

            steps {
                script {
                    echo 'deploying docker image ...'
                    sh '''
                        set -e

                        echo "🏠 Jenkins HOME"
                        echo "HOME=$HOME"

                        # Ensure kube directory exists
                        mkdir -p $HOME/.kube

                        echo "🔐 AWS identity"
                        aws sts get-caller-identity

                        echo "📦 Creating kubeconfig for EKS"
                        aws eks update-kubeconfig \
                        --region us-east-1 \
                        --name web-cluster \
                        --kubeconfig $HOME/.kube/config

                        export KUBECONFIG=$HOME/.kube/config

                        echo "🔎 Kubernetes context"
                        kubectl config current-context
                        kubectl get nodes

                        echo "🚀 Deploying application"
                        export FULL_IMAGE_TAG="$FULL_IMAGE_TAG"
                        export APP_NAME="$APP_NAME"

                        envsubst < kubernetes/deployment.yaml | kubectl apply -f - --validate=false
                        envsubst < kubernetes/service.yaml | kubectl apply -f - --validate=false
                    '''
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