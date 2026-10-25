// Declarative Jenkins pipeline. Needs: a Linux agent with Docker, and a NodeJS tool named "node22" (Node >= 20)
// configured under Manage Jenkins -> Tools (NodeJS plugin). NOT yet run on a real Jenkins server - see README.
pipeline {
  agent any
  tools { nodejs 'node22' }
  options { timeout(time: 25, unit: 'MINUTES'); timestamps(); disableConcurrentBuilds(abortPrevious: false) }
  environment {
    PG_NAME = "autohub-pg-${BUILD_NUMBER}-${EXECUTOR_NUMBER}"
    CI = 'true'
  }
  stages {
    stage('Start PostgreSQL') {
      steps {
        sh '''
          # Random free host port (127.0.0.1::5432) so parallel builds never collide.
          docker run -d --name "$PG_NAME" -p 127.0.0.1::5432 \
            -e POSTGRES_USER=autohub -e POSTGRES_PASSWORD=ci_password -e POSTGRES_DB=autohub_test \
            postgres:16-alpine
          for i in $(seq 1 30); do
            docker exec "$PG_NAME" pg_isready -U autohub -d autohub_test && exit 0
            sleep 2
          done
          echo "PostgreSQL did not become ready"; exit 1
        '''
        script {
          def port = sh(script: 'docker port "$PG_NAME" 5432/tcp | head -1 | sed "s/.*://"', returnStdout: true).trim()
          // The database name ends in _test, which the test suite requires before it will reset anything.
          env.TEST_DATABASE_URL = "postgresql://autohub:ci_password@127.0.0.1:${port}/autohub_test"
        }
      }
    }
    stage('Install')   { steps { sh 'npm ci' } }
    stage('Typecheck') { steps { sh 'npm run typecheck' } }
    
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
        '''
      }
    }

    stage('Test + coverage') {
      steps { sh 'npm run test:ci' }
      post {
        always {
          junit allowEmptyResults: true, testResults: 'backend/reports/junit.xml, frontend/reports/junit.xml'
          archiveArtifacts artifacts: 'backend/coverage/**, frontend/coverage/**', allowEmptyArchive: true
        }
      }
    }
    stage('Build') { steps { sh 'npm run build' } }
  }
  post {
    always { sh 'docker rm -f "$PG_NAME" || true' }
  }
}
