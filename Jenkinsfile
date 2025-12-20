pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
        ansiColor('xterm')
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    tools {
        nodejs 'nodejs'
    }

    environment {
        DOCKER_IMAGE = 'vectorzy/nodejs-web-app'
        BUILDER_NAME = 'multiarch'
    }

    stages {

        /* -----------------------------
         * CHECKOUT
         * ----------------------------- */
        stage('Checkout') {
            steps {
                checkout scm
                sh 'test -f package.json'
            }
        }

        /* -----------------------------
         * RESOLVE VERSION & TAGS
         * ----------------------------- */
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

                    echo "Resolved version: ${env.NODE_VERSION}"
                    echo "Docker image: ${env.FULL_IMAGE_TAG}"
                }
            }
        }

        /* -----------------------------
         * INSTALL DEPENDENCIES
         * ----------------------------- */
        stage('Install Dependencies') {
            steps {
                sh '''
                    if [ -f package-lock.json ]; then
                      npm ci
                    else
                      npm install
                    fi
                '''
            }
        }

        /* -----------------------------
         * TEST & LINT
         * ----------------------------- */
        stage('Test & Lint') {
            steps {
                sh 'npm test'
                sh 'npm run lint'
            }
        }

        /* -----------------------------
         * BUILD APPLICATION
         * ----------------------------- */
        stage('Build App') {
            steps {
                sh '''
                    if npm run | grep -q "build"; then
                      npm run build
                    else
                      echo "No build step defined"
                    fi
                '''
            }
        }

        /* -----------------------------
         * DOCKER BUILD & PUSH
         * ----------------------------- */
        stage('Docker Build & Push (Multi-Arch)') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-hub-repo',
                    usernameVariable: 'DOCKER_USERNAME',
                    passwordVariable: 'DOCKER_PASSWORD'
                )]) {

                    sh '''
                        echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

                        docker buildx inspect ${BUILDER_NAME} >/dev/null 2>&1 || \
                        docker buildx create --name ${BUILDER_NAME} --use --bootstrap

                        docker buildx use ${BUILDER_NAME}

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

        /* -----------------------------
         * VERIFY IMAGE
         * ----------------------------- */
        stage('Verify Image') {
            steps {
                sh 'docker buildx imagetools inspect ${FULL_IMAGE_TAG}'
            }
        }

        /* -----------------------------
         * DEPLOY (MAIN ONLY)
         * ----------------------------- */
        stage('Deploy (Main Branch Only)') {
            when {
                branch 'main'
            }
            steps {
                sshagent(['ubuntu-server-key']) {
                    sh '''
                        scp docker-compose.yaml ubuntu@13.51.242.134:/home/ubuntu/docker-compose.yaml

                        ssh -o StrictHostKeyChecking=no ubuntu@13.51.242.134 '
                            set -e
                            export IMAGE_NAME=${FULL_IMAGE_TAG}
                            cd /home/ubuntu

                            docker compose pull
                            docker compose down
                            docker compose up -d

                            sleep 5
                            docker ps --filter "name=nodejs-app" --format "table {{.Names}}\\t{{.Status}}"
                        '
                    '''
                }
            }
        }

        /* -----------------------------
         * COMMIT VERSION UPDATE
         * ----------------------------- */
        stage('Commit Version Update') {
            when {
                not { branch 'main' }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'github-creds',
                    usernameVariable: 'GIT_USER',
                    passwordVariable: 'GIT_PASS'
                )]) {

                    sh '''
                        git config user.email "jenkins@example.com"
                        git config user.name "jenkins"

                        git diff --quiet || (
                          git add .
                          git commit -m "ci: version bump"
                          git remote set-url origin https://${GIT_USER}:${GIT_PASS}@github.com/Vectorjay/nodejs-web-app.git
                          git push origin HEAD:refs/heads/jenkins-jobs
                        )
                    '''
                }
            }
        }
    }

    /* -----------------------------
     * CLEANUP
     * ----------------------------- */
    post {
        always {
            sh 'docker builder prune -f || true'
            sh 'docker image prune -f || true'
            sh 'npm cache clean --force || true'
            cleanWs()
        }
        success {
            echo "✅ Pipeline completed successfully"
        }
        failure {
            echo "❌ Pipeline failed — check logs"
        }
    }
}
