// pipeline {
//     agent any

//     environment {
//         DOCKER_IMAGE = "vectorzy/nodejs-web-app"
//         AWS_REGION   = "us-east-1"
//         EKS_CLUSTER  = "demo-cluster"
//     }

//     stages {

//         stage('Checkout') {
//             steps {
//                 checkout scm
//             }
//         }

//         stage('Build and Test') {
//             steps {
//                 sh 'npm install'
//                 sh 'npm test || echo "Tests optional"'
//                 sh 'npm run build || echo "Build optional"'
//             }
//         }

//         stage('Build Docker Image') {
//             steps {
//                 script {
//                     def tag = "build-${env.BUILD_NUMBER}"
//                     env.FULL_IMAGE_TAG = "${DOCKER_IMAGE}:${tag}"

//                     withCredentials([
//                         usernamePassword(
//                             credentialsId: 'docker-hub-repo',
//                             usernameVariable: 'DOCKER_USER',
//                             passwordVariable: 'DOCKER_PASS'
//                         )
//                     ]) {
//                         sh """
//                             echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin
//                             docker build -t ${FULL_IMAGE_TAG} .
//                             docker push ${FULL_IMAGE_TAG}

//                             if [ "${BRANCH_NAME}" = "main" ]; then
//                                 docker tag ${FULL_IMAGE_TAG} ${DOCKER_IMAGE}:latest
//                                 docker push ${DOCKER_IMAGE}:latest
//                             fi

//                             docker logout
//                         """
//                     }
//                 }
//             }
//         }

//         stage('Deploy to EKS') {
//             when {
//                 branch 'main'
//             }

//             environment {
//                 AWS_ACCESS_KEY_ID     = credentials('jenkins_aws_access_key_id')
//                 AWS_SECRET_ACCESS_KEY = credentials('jenkins-aws_secret-access-key')
//                 APP_NAME = 'nodejs-web-app'
//             }

//             steps {
//                 script {
//                     echo 'delopying docker image ...'
//                     sh 'envsubst < kubernetes/deployment.yaml | kubectl apply -f '
//                     sh 'envsubst < kubernetes/service.yaml | kubectl apply -f '
//                 }
//             }
//         }
//     }

//     post {
//         always {
//             sh 'docker system prune -f || true'
//             cleanWs()
//         }
//         success {
//             echo "✅ Pipeline completed successfully!"
//         }
//         failure {
//             echo "❌ Pipeline failed!"
//         }
//     }
// }
pipeline {
  agent any

  environment {
    AWS_REGION  = 'us-east-1'
    EKS_CLUSTER = 'app-cluster'
  }

  stages {

    stage('Build App') {
      steps {
        echo "🔧 Building the application..."
        // your build steps go here
      }
    }

    stage('Build Image') {
      steps {
        echo "🐳 Building the docker image..."
        // docker build / push goes here
      }
    }

    stage('Deploy to EKS') {
      environment {
        AWS_ACCESS_KEY_ID     = credentials('jenkins_aws_access_key_id')
        AWS_SECRET_ACCESS_KEY = credentials('jenkins_aws_secret_access_key')
        AWS_DEFAULT_REGION    = 'us-east-1'
      }
      steps {
        script {
          sh '''
            set -e

            echo "🔐 Checking AWS identity (Jenkins)"
            aws sts get-caller-identity

            echo "📦 Creating kubeconfig for EKS"
            aws eks update-kubeconfig \
              --region $AWS_DEFAULT_REGION \
              --name $EKS_CLUSTER

            echo "🔍 Verifying cluster access"
            kubectl get nodes

            echo "🚀 Deploying nginx (idempotent)"
            kubectl create deployment nginx-deployment \
              --image=nginx \
              --dry-run=client -o yaml | kubectl apply -f -

            echo "📊 Deployment status"
            kubectl rollout status deployment/nginx-deployment
            kubectl get deployments
          '''
        }
      }
    }
  }

  post {
    success {
      echo "✅ Deployment to EKS completed successfully"
    }
    failure {
      echo "❌ Deployment failed"
    }
  }
}
