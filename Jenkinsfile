pipeline {
    agent {
        docker {
            image 'docker:20.10-dind'
            args '--privileged --storage-driver vfs -v /tmp:/tmp'
            reuseNode true
        }
    }

    environment {
        DOCKER_IMAGE = "vectorzy/nodejs-web-app"
        DOCKER_TLS_CERTDIR = ""
    }

    stages {
        stage('Start Docker Daemon') {
            steps {
                sh '''
                    # Start Docker daemon
                    dockerd &
                    sleep 15
                    
                    # Test Docker
                    docker info
                    docker buildx version
                    
                    # Create buildx builder if needed
                    docker buildx create --name mybuilder --use --bootstrap || true
                '''
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Resolve Version') {
            steps {
                script {
                    env.NODE_VERSION = sh(
                        script: 'node -p "require(\'./package.json\').version"',
                        returnStdout: true
                    ).trim()

                    env.BUILD_TIMESTAMP = sh(
                        script: 'date +%Y%m%d%H%M%S',
                        returnStdout: true
                    ).trim()

                    env.IMAGE_TAG = "${env.NODE_VERSION}-${env.BUILD_NUMBER}-${env.BUILD_TIMESTAMP}"
                    env.FULL_IMAGE_TAG = "${env.DOCKER_IMAGE}:${env.IMAGE_TAG}"
                    env.LATEST_TAG = "${env.DOCKER_IMAGE}:latest"

                    echo "Version: ${env.NODE_VERSION}"
                    echo "Image: ${env.FULL_IMAGE_TAG}"
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test || true'
                sh 'npm run lint || true'
            }
        }

        stage('Build App') {
            steps {
                sh 'npm run build || echo "No build step"'
            }
        }

        stage('Docker Build & Push (Multi-Arch)') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-hub-repo',
                    usernameVariable: 'DOCKER_USERNAME',
                    passwordVariable: 'DOCKER_PASSWORD'
                )]) {

                    sh """
                        # Login to Docker Hub
                        echo \$DOCKER_PASSWORD | docker login -u \$DOCKER_USERNAME --password-stdin

                        # Ensure buildx is ready
                        docker buildx inspect multiarch >/dev/null 2>&1 || \
                        docker buildx create --name multiarch --use --bootstrap

                        docker buildx use multiarch

                        # Build and push multi-architecture images
                        docker buildx build \\
                          --platform linux/amd64,linux/arm64 \\
                          -t ${env.FULL_IMAGE_TAG} \\
                          -t ${env.LATEST_TAG} \\
                          --push .

                        docker logout
                    """
                }
            }
        }

        stage('Verify Image') {
            steps {
                sh "docker buildx imagetools inspect ${env.FULL_IMAGE_TAG}"
            }
        }

        stage('Deploy (Main Branch Only)') {
            when {
                branch 'main'
            }
            steps {
                sshagent(['ubuntu-server-key']) {
                    sh """
                        scp docker-compose.yaml ubuntu@13.51.242.134:/home/ubuntu/docker-compose.yaml

                        ssh -o StrictHostKeyChecking=no ubuntu@13.51.242.134 '
                            set -e

                            export IMAGE_NAME=${env.FULL_IMAGE_TAG}
                            cd /home/ubuntu

                            docker compose pull
                            docker compose down
                            docker compose up -d

                            sleep 5
                            docker ps --filter "name=nodejs-app" --format "table {{.Names}}\\t{{.Status}}"
                        '
                    """
                }
            }
        }

        stage('Cleanup') {
            steps {
                sh '''
                    # Clean Docker resources
                    docker builder prune -f || true
                    docker image prune -f || true
                    docker container prune -f || true
                    docker system prune -f || true
                '''
                sh 'npm cache clean --force || true'
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
}