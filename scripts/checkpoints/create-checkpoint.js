const { execSync } = require('child_process');

const phase = process.argv[2];
if (!phase) {
  console.error('Usage: node create-checkpoint.js <phase-number>');
  process.exit(1);
}

try {
  const tagName = `checkpoint/phase-${phase}-complete`;
  execSync(`git tag ${tagName}`);
  console.log(`✅ Checkpoint created: ${tagName}`);
} catch (error) {
  console.error('❌ Failed to create checkpoint.');
  process.exit(1);
}
