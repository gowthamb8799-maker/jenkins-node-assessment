pipeline {

    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        IMAGE_NAME = 'node-cicd-app'
        APP_NAME = 'Jenkins Docker CI-CD Assessment'
        PORT = '3000'
    }

    stages {

        stage('Git Checkout') {
            steps {
                checkout scm

                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()

                    env.IMAGE_TAG = "${BUILD_NUMBER}-${GIT_COMMIT_SHORT}"
                }

                echo "Image Tag: ${IMAGE_TAG}"
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    set -e

                    docker run --rm \
                      --user "$(id -u):$(id -g)" \
                      -e HOME=/tmp \
                      -v "$PWD:/app" \
                      -w /app \
                      node:22-alpine \
                      npm ci
                '''
            }
        }

        stage('Application Test') {
            steps {
                sh '''
                    set -e

                    docker run --rm \
                      --user "$(id -u):$(id -g)" \
                      -e HOME=/tmp \
                      -v "$PWD:/app" \
                      -w /app \
                      node:22-alpine \
                      npm test
                '''
            }
        }

        stage('Docker Image Build') {
            steps {
                sh '''
                    set -e

                    docker build \
                      -t ${IMAGE_NAME}:${IMAGE_TAG} \
                      .

                    docker images ${IMAGE_NAME}
                '''
            }
        }

        stage('Trivy Security Scan') {
            steps {
                sh '''
                    set -e

                    trivy image \
                      --severity HIGH,CRITICAL \
                      --ignore-unfixed \
                      --format table \
                      --output trivy-report.txt \
                      ${IMAGE_NAME}:${IMAGE_TAG}

                    cat trivy-report.txt

                    trivy image \
                      --severity HIGH,CRITICAL \
                      --ignore-unfixed \
                      --exit-code 1 \
                      ${IMAGE_NAME}:${IMAGE_TAG}
                '''
            }

            post {
                always {
                    archiveArtifacts(
                        artifacts: 'trivy-report.txt',
                        allowEmptyArchive: true
                    )
                }
            }
        }

        stage('Environment Configuration') {
            steps {
                sh '''
                    set -e

                    cat > .env <<EOF
APP_NAME=${APP_NAME}
PORT=${PORT}
IMAGE_TAG=${IMAGE_TAG}
EOF

                    cat .env
                '''
            }
        }

        stage('Save Rollback Version') {
            steps {
                sh '''
                    if [ -f .last-successful-version ]; then

                        cp .last-successful-version .rollback-version

                        echo "Previous successful version:"
                        cat .rollback-version

                    else

                        echo "First deployment - no rollback version available"

                    fi
                '''
            }
        }

        stage('Docker Compose Deployment') {
            steps {
                sh '''
                    set -e

                    echo "Deploying version: ${IMAGE_TAG}"

                    docker compose up -d --force-recreate

                    docker compose ps
                '''
            }
        }

        stage('Application Health Check') {
            steps {
                script {

                    def healthStatus = sh(
                        script: '''
                            for attempt in $(seq 1 12)
                            do

                                echo "Health check attempt: ${attempt}"

                                if curl \
                                  --fail \
                                  --silent \
                                  http://localhost:3000/health
                                then

                                    echo ""
                                    echo "Application is HEALTHY"

                                    exit 0
                                fi

                                sleep 5
                            done

                            echo "Application health check FAILED"

                            docker compose ps
                            docker compose logs --tail=100

                            exit 1
                        ''',
                        returnStatus: true
                    )

                    if (healthStatus != 0) {

                        echo "Deployment failed. Attempting rollback."

                        def rollbackStatus = sh(
                            script: '''
                                if [ ! -f .rollback-version ]; then
                                    echo "No previous successful version available"
                                    exit 1
                                fi

                                ROLLBACK_VERSION=$(cat .rollback-version)

                                echo "Rolling back to: ${ROLLBACK_VERSION}"

                                sed -i \
                                  "s/^IMAGE_TAG=.*/IMAGE_TAG=${ROLLBACK_VERSION}/" \
                                  .env

                                echo "Rollback environment:"
                                cat .env

                                IMAGE_TAG=${ROLLBACK_VERSION} docker compose up -d --force-recreate

                                echo "Waiting for rollback application"

                                for attempt in $(seq 1 12)
                                do

                                    echo "Rollback health check attempt: ${attempt}"

                                    if curl \
                                      --fail \
                                      --silent \
                                      http://localhost:3000/health
                                    then

                                        echo ""
                                        echo "Rollback completed successfully"

                                        exit 0
                                    fi

                                    sleep 5
                                done

                                echo "Rollback health check FAILED"

                                docker compose ps
                                docker compose logs --tail=100

                                exit 1
                            ''',
                            returnStatus: true
                        )

                        if (rollbackStatus == 0) {
                            error(
                                "New deployment failed. Previous successful version restored."
                            )
                        } else {
                            error(
                                "New deployment failed and rollback also failed."
                            )
                        }
                    }
                }
            }
        }

        stage('Mark Successful Version') {
            steps {
                sh '''
                    echo "${IMAGE_TAG}" > .last-successful-version

                    echo "Successful version:"
                    cat .last-successful-version
                '''
            }
        }

        stage('Docker Image Cleanup') {
            steps {
                sh '''
                    docker image prune -f

                    echo "Available application images:"
                    docker images ${IMAGE_NAME}
                '''
            }
        }
    }

    post {

        success {
            echo "CI/CD PIPELINE SUCCESSFUL"
        }

        failure {
            echo "CI/CD PIPELINE FAILED"
        }
    }
}
