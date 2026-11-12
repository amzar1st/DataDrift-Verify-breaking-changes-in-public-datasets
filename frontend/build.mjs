import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await Promise.all(['index.html','style.css'].map(file => copyFile('frontend/' + file, 'dist/' + file)));
await build({ entryPoints: ['frontend/app.mjs'], outfile: 'dist/app.js', bundle: true, minify: true, format: 'esm', target: 'es2022' });
