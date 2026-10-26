import { mkdir, mkdtemp, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this script with npm run pack:windows');
const run = (args, options = {}) => {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${args[0]} failed (${result.status})`);
  return result;
};
run(['scripts/build.mjs']);
const stage = await mkdtemp(join(tmpdir(), 'nexusx-windows-'));
// Validate the absolute cleanup target before any work or recursive removal.
const fromTemp = relative(resolve(tmpdir()), resolve(stage));
if (!fromTemp || fromTemp.startsWith('..') || isAbsolute(fromTemp)) throw new Error('Invalid temporary staging directory');
try {
  for (const file of [...pkg.files, 'LICENSE']) {
    await mkdir(dirname(join(stage, file)), { recursive: true });
    await cp(file, join(stage, file), { recursive: true });
  }
  // Window pets are bundled JS; the optional AppKit executable only runs on macOS.
  await rm(join(stage, 'lib/desktop/PetCompanion'), { force: true });
  const manifest = { ...pkg, os: ['win32'], files: [...pkg.files, 'BUILD_INFO.json'] };
  delete manifest.cpu;
  delete manifest.scripts;
  delete manifest.devDependencies;
  await writeFile(join(stage, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(join(stage, 'BUILD_INFO.json'), JSON.stringify({
    name: pkg.name, version: pkg.version, platform: 'win32',
    desktopCompanion: { supported: false },
  }, null, 2) + '\n');
  const packed = run([npmCli, 'pack', '--ignore-scripts', '--json', '--pack-destination', stage], {
    cwd: stage, stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8',
  });
  const filename = `${pkg.name}-${pkg.version}-win32.tgz`;
  const destination = resolve('releases');
  await mkdir(destination, { recursive: true });
  const archive = join(destination, filename);
  // The temporary directory and repository can live on different Windows drives.
  await cp(join(stage, JSON.parse(packed.stdout)[0].filename), archive);
  const sha256 = createHash('sha256').update(await readFile(archive)).digest('hex');
  await writeFile(`${archive}.sha256`, `${sha256}  ${filename}\n`);
  console.log(`Packaged ${archive} (Windows client, window pets and notification sound)`);
} finally {
  // Only remove the temporary directory created above, never a caller-supplied path.
  await rm(stage, { recursive: true, force: true });
}
