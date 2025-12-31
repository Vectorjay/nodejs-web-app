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

        stage('Resolve Version') {
            steps {
                script {
                    env.NODE_VERSION = sh(
                        script: 'node -p "require(\'./package.json\').version"',
                        returnStdout: true
                    ).trim()

                    env.BUILD_TIMESTAMP = sh(
                        script: 'date +%Y%m%d%H%M%S"',
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

        /* ===============================
           DOCKER BUILD (RUNS IN AGENT)
           =============================== */
        stage('Docker Build & Push (Multi-Arch)') {
            agent {
                docker {
                    image 'docker:26-cli'
                    args '-v /var/run/docker.sock:/var/run/docker.sock'
                }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-hub-repo',
                    usernameVariable: 'DOCKER_USERNAME',
                    passwordVariable: 'DOCKER_PASSWORD'
                )]) {
                    sh '''
                        docker version

                        echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

                        docker buildx create --name multiarch --use --bootstrap || docker buildx use multiarch

                        docker buildx build \
                          --platform linux/amd64,linux/arm64 \
                          -t ${FULL_IMAGE_TAG} \
                          -t ${LATEST_TAG} \
                          --push .

                        docker logout
                    '''
                }
            }
        }

        stage('Verify Image') {
            agent {
                docker {
                    image 'docker:26-cli'
                    args '-v /var/run/docker.sock:/var/run/docker.sock'
                }
            }
            steps {
                sh 'docker buildx imagetools inspect ${FULL_IMAGE_TAG}'
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
            agent {
                docker {
                    image 'docker:26-cli'
                    args '-v /var/run/docker.sock:/var/run/docker.sock'
                }
            }
            steps {
                sh '''
                    docker builder prune -f || true
                    docker image prune -f || true
                '''
            }
        }

        stage('Commit Version Update') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'github-creds',
                    usernameVariable: 'USER',
                    passwordVariable: 'PASS'
                )]) {

                    sh '''
                        git config user.email "jenkins@example.com"
                        git config user.name "jenkins"

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
