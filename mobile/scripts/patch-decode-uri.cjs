// Expo Router 57 uses query-string 7 (CommonJS). The security-fixed decoder
// 0.5.1 is ESM-only. Adapt only its export, preserving the upstream algorithm.
const fs = require('node:fs');
const path = require('node:path');
const entry = require.resolve('decode-uri-component');
const packagePath = path.join(path.dirname(entry), 'package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (pkg.version !== '0.5.1')
  throw new Error('Review the decoder compatibility patch before upgrading.');
const code = fs.readFileSync(entry, 'utf8');
const from = 'export default function decodeUriComponent';
const to = 'module.exports = function decodeUriComponent';
if (!code.includes(from) && !code.includes(to))
  throw new Error('Unexpected decoder source; refusing to patch.');
fs.writeFileSync(entry, code.replace(from, to));
pkg.type = 'commonjs';
fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
console.log('Applied CommonJS export compatibility for decode-uri-component 0.5.1.');
