import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const srcPath = join(__dirname, '../src');

test('All src/ modules should import successfully without syntax errors', async () => {
  const files = readdirSync(srcPath).filter(f => f.endsWith('.mjs'));
  assert.ok(files.length > 100, 'Should find many source files');
  
  let validImports = 0;
  
  for (const file of files) {
    try {
      const modulePath = 'file:///' + join(srcPath, file).replace(/\\/g, '/');
      const module = await import(modulePath);
      assert.ok(module, 'Module ' + file + ' imported successfully');
      validImports++;
    } catch (error) {
      assert.fail('Failed to import ' + file + ': ' + error.stack);
    }
  }
  
  assert.equal(validImports, files.length, 'All modules imported successfully');
});
