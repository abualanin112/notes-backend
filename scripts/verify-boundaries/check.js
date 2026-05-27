const { execSync } = require('child_process');

console.log('Verifying Architecture Boundaries...');
try {
  // We run eslint which includes the boundary rules
  execSync('npm run lint', { stdio: 'inherit' });
  console.log('✅ Boundary check passed.');
} catch (error) {
  console.error('❌ Boundary violations detected.');
  process.exit(1);
}
