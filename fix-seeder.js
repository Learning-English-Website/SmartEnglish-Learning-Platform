const fs = require('fs');
const path = 'C:/Users/Vip/Documents/GitHub/SmartEnglish-Learning-Platform/server/src/seeders/duolingo.seeder.js';
let code = fs.readFileSync(path, 'utf8');

// Check brace/bracket balance
let braces = 0, brackets = 0;
let inStr = false, strChar = '', escaped = false;
let problemLines = [];

for (let i = 0; i < code.length; i++) {
  const ch = code[i];
  if (escaped) { escaped = false; continue; }
  if (ch === '\\') { escaped = true; continue; }
  if (inStr) { if (ch === strChar) inStr = false; continue; }
  if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; continue; }
  if (ch === '{') braces++;
  if (ch === '}') { braces--; if (braces < 0) problemLines.push('} at char ' + i); }
  if (ch === '[') brackets++;
  if (ch === ']') { brackets--; if (brackets < 0) problemLines.push('] at char ' + i); }
}

console.log('Brace count:', braces);
console.log('Bracket count:', brackets);
if (problemLines.length) console.log('Problems:', problemLines.slice(0, 10));
