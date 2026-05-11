import path from 'node:path';
import { build } from 'esbuild';

const rootDir = process.cwd();
const entryPoint = path.join(
  rootDir,
  'src',
  'renderer',
  'monaco.entry.js'
);

const outFile = path.join(rootDir, 'src', 'renderer', 'monaco.bundle.js');

await build({
  entryPoints: [entryPoint],
  outfile: outFile,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['chrome120'],
  loader: {
    '.css': 'css',
    '.ttf': 'file',
    '.woff': 'file',
    '.woff2': 'file',
    '.otf': 'file'
  },
  logLevel: 'info',
  sourcemap: false,
  minify: false
});
