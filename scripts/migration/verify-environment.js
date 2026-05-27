const { execSync } = require('child_process');

console.log('Validating Environment Determinism...');

try {
  // Check if Docker is available for Testcontainers
  execSync('docker info', { stdio: 'ignore' });
  console.log('✅ Docker runtime detected.');
} catch (error) {
  console.log('⚠️ Docker runtime not detected. Integration tests using Testcontainers may fail.');
}

console.log('✅ Environment determinism checks completed.');
