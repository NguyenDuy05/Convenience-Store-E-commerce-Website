const { spawnSync } = require('node:child_process');
const path = require('node:path');

const result = spawnSync(process.execPath, ['--test', 'test/features.integration.test.js'], {
  cwd: path.resolve(__dirname, '..'),
  env: { ...process.env, RUN_FEATURE_INTEGRATION: '1' },
  stdio: 'inherit',
});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
