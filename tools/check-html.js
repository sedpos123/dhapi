const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const files = fs.readdirSync(publicDir).filter(name => name.endsWith('.html'));

for (const file of files) {
  const html = fs.readFileSync(path.join(publicDir, file), 'utf8');
  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(match => !/application\/ld\+json/i.test(match[1]) && !/\bsrc\s*=/i.test(match[1]))
    .map(match => match[2])
    .filter(Boolean);

  for (const source of scripts) new Function(source);
  console.log(`${file}: inline scripts parsed`);
}
