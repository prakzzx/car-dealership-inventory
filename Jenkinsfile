
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
          docker run -d --name "$PG_NAME" \
            --network prakati-jenkins-local_default \
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

          echo "PostgreSQL did not become ready"
          exit 1
        '''

        script {
          env.TEST_DATABASE_URL = "postgresql://autohub:ci_password@${env.PG_NAME}:5432/autohub_test"
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
          echo "=== Current workspace ==="
          pwd

          echo "=== Backend test files ==="
          find backend/tests -type f -name "*.test.ts" -print

          echo "=== Backend Vitest config ==="
          cat backend/vitest.config.ts

          echo "=== Test database variable ==="
          if [ -n "$TEST_DATABASE_URL" ]; then
            echo "TEST_DATABASE_URL is set"
          else
            echo "TEST_DATABASE_URL is NOT set"
          fi

          echo "=== Database connectivity from Jenkins ==="
          node -e "const net=require('net'); const s=net.connect(5432, process.env.PG_NAME, () => { console.log('PostgreSQL reachable'); s.end(); }); s.on('error', e => { console.error(e.message); process.exitCode=1; });"
        '''
      }
    }

    stage('Test + coverage') {
      steps {
        sh 'npm run test:ci'
      }

      post {
        always {
          junit allowEmptyResults: true,
            testResults: 'backend/reports/junit.xml, frontend/reports/junit.xml'

          archiveArtifacts artifacts: 'backend/coverage/**, frontend/coverage/**',
            allowEmptyArchive: true
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
