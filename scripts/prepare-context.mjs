import { readFile, writeFile } from 'node:fs/promises';
const source = await readFile('vendor/dsh-context/lib/client.js', 'utf8');
const loader = 'window.__ModuleLoader__.load(';
if (source.split(loader).length !== 2) throw new Error('Unexpected upstream context bundle; review its adapter before building.');
// Upstream now opens settings through pluginNavigation, mapped by context-plugin.js.
const adapted = source.replace(loader, 'capture(');
await writeFile('src/vendor/context-client.cjs', 'module.exports = () => { let plugin; const capture = entry => { plugin = entry.factory(require); };\n' + adapted + '\nreturn plugin; };\n');
