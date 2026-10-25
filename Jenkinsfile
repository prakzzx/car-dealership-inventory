```groovy
// AutoHub CI pipeline.
// Requires a Linux Jenkins agent with Docker and NodeJS tool "node22".
pipeline {
  agent any

  tools {
    nodejs 'node22'
  }

  options {
    timeout(time: 25, unit: 'MINUTES')
    timestamps()
    disableConcurrentBuilds(abortPrevious: false)
  }

  environment {
    PG_NAME = "autohub-pg-${BUILD_NUMBER}-${EXECUTOR_NUMBER}"
    CI = 'true'
  }

  stages {
    stage('Start PostgreSQL') {
      steps {
        sh '''
          set -eu

          docker run -d --name "$PG_NAME" \
            -p 127.0.0.1::5432 \
            -e POSTGRES_USER=autohub \
            -e POSTGRES_PASSWORD=ci_password \
            -e POSTGRES_DB=autohub_test \
            postgres:16-alpine

          for i in $(seq 1 30); do
            if docker exec "$PG_NAME" pg_isready -U autohub -d autohub_test; then
              exit 0
            fi
            sleep 2
          done

          docker logs "$PG_NAME"
          echo "PostgreSQL did not become ready"
          exit 1
        '''

        script {
          def port = sh(
            script: 'docker port "$PG_NAME" 5432/tcp | head -1 | sed "s/.*://"',
            returnStdout: true
          ).trim()

          if (!port) {
            error('Could not determine the PostgreSQL host port')
          }

          env.TEST_DATABASE_URL =
            "postgresql://autohub:ci_password@127.0.0.1:${port}/autohub_test"

          echo 'PostgreSQL is ready; test database URL configured.'
        }
      }
    }

    stage('Install') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Typecheck') {
      steps {
        sh 'npm run typecheck'
      }
    }

    stage('Debug test discovery') {
      steps {
        sh '''
          echo "Workspace: $PWD"
          echo "Backend test files:"
          find backend/tests -type f -name "*.test.ts" -print

          echo "Frontend test files:"
          find frontend/tests -type f \\( -name "*.test.ts" -o -name "*.test.tsx" \\) -print

          echo "Backend Vitest configuration:"
          cat backend/vitest.config.ts

          echo "Test database URL configured:"
          if [ -n "${TEST_DATABASE_URL:-}" ]; then
            echo "yes"
          else
            echo "no"
          fi
        '''
      }
    }

    stage('Test + coverage') {
      steps {
        sh 'npm run test:ci'
      }

      post {
        always {
          junit(
            allowEmptyResults: true,
            testResults: 'backend/reports/junit.xml,frontend/reports/junit.xml'
          )

          archiveArtifacts(
            artifacts: 'backend/coverage/**,frontend/coverage/**',
            allowEmptyArchive: true
          )
        }
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build'
      }
    }
  }

  post {
    always {
      sh 'docker rm -f "$PG_NAME" || true'
    }
  }
}
```
