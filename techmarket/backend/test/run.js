const fs = require('node:fs');
const path = require('node:path');

const dir = __dirname;
const entries = fs.readdirSync(dir);

for (const name of entries) {
  if (!name.endsWith('.test.js')) continue;
  require(path.join(dir, name));
}

