const { execSync } = require('child_process');

console.log('Running Migration Smoke Test...');
try {
  execSync('npm test', { stdio: 'inherit' });
  console.log('✅ Smoke Test Passed. System is stable.');
} catch (error) {
  console.error('❌ Smoke Test Failed. Regression detected.');
  process.exit(1);
}
