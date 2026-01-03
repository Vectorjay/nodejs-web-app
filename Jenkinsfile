pipeline {
    agent {
        docker {
            image 'docker:20.10-dind-alpine'
            args '--privileged --storage-driver overlay2'
            reuseNode true
        }
    }
    
    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }
    
    environment {
        DOCKER_IMAGE = "vectorzy/nodejs-web-app"
        DOCKER_TLS_CERTDIR = ""
    }
    
    stages {
        stage('Prepare') {
            steps {
                sh 'docker info'
            }
        }
        
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Prepare Buildx') {
            steps {
                sh '''
                    docker buildx version
                    docker buildx rm multiarch 2>/dev/null || true
                    docker buildx create --name multiarch --use --bootstrap
                '''
            }
        }
        
        stage('Resolve Version') {
            steps {
                script {
                    env.NODE_VERSION = sh(
                        script: 'node -p "require(\'./package.json\').engines.node" || echo "18.0.0"',
                        returnStdout: true
                    ).trim()
                    
                    env.IMAGE_TAG = "${env.NODE_VERSION}-${env.BUILD_NUMBER}-$(date +%Y%m%d%H%M%S)"
                    env.FULL_IMAGE_TAG = "${env.DOCKER_IMAGE}:${env.IMAGE_TAG}"
                    env.LATEST_TAG = "${env.DOCKER_IMAGE}:latest"
                }
            }
        }
        
        // Add parallel stages for build/test
        // Fix Docker Build & Push stage
        // Add proper error handling throughout
    }
    
    post {
        always {
            sh 'docker buildx rm multiarch 2>/dev/null || true'
            cleanWs()
        }
    }
}