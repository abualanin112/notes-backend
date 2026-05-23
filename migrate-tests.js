const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'tests/integration');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Success assertions
  content = content.replace(/expect\(res\.body\)\.toEqual\(/g, 'expect(res.body.data).toEqual(');
  content = content.replace(/expect\(res\.body\)\.toMatchObject\(/g, 'expect(res.body.data).toMatchObject(');
  content = content.replace(/expect\(res\.body\)\.not\.toHaveProperty\(/g, 'expect(res.body.data).not.toHaveProperty(');
  content = content.replace(
    /expect\(res\.body\)\.toHaveProperty\('results'\)/g,
    "expect(res.body.data).toHaveProperty('results')",
  );
  content = content.replace(/res\.body\.results/g, 'res.body.data.results');
  content = content.replace(/res\.body\.id/g, 'res.body.data.id');
  content = content.replace(/res\.body\.name/g, 'res.body.data.name');
  content = content.replace(/res\.body\.email/g, 'res.body.data.email');
  content = content.replace(/res\.body\.role/g, 'res.body.data.role');
  content = content.replace(/res\.body\.title/g, 'res.body.data.title');
  content = content.replace(/res\.body\.content/g, 'res.body.data.content');
  content = content.replace(/res\.body\.user/g, 'res.body.data.user');
  content = content.replace(/res\.body\.tokens/g, 'res.body.data.tokens');

  // Error assertions
  content = content.replace(/res\.body\.message/g, 'res.body.error.message');
  content = content.replace(/res\.body\.code/g, 'res.body.error.code');
  content = content.replace(
    /expect\(res\.body\)\.toHaveProperty\('message'/g,
    "expect(res.body.error).toHaveProperty('message'",
  );

  // Strip role from expected DTO objects
  content = content.replace(/\s*role:\s*'user',/g, '');
  content = content.replace(/\s*role:\s*'admin',/g, '');
  content = content.replace(/expect\(res\.body\.data\.role\)\.toBe\('user'\);/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Integration tests updated');
