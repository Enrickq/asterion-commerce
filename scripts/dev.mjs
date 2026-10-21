import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const children = new Set();
let shuttingDown = false;

function stop(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  process.exitCode = exitCode;
  for (const child of children) child.kill('SIGTERM');
  const force = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
  }, 4000);
  force.unref();
}

function run(args, label) {
  const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', windowsHide: true });
  children.add(child);
  child.once('error', (error) => {
    process.stderr.write(`${label} could not start: ${error.message}\n`);
    stop(1);
  });
  child.once('exit', (code) => {
    children.delete(child);
    if (!shuttingDown) {
      process.stderr.write(`${label} stopped. Shutting down the development session.\n`);
      stop(code || 1);
    }
  });
}

process.once('SIGINT', () => stop(0));
process.once('SIGTERM', () => stop(0));
process.stdout.write('ASTERION · API http://localhost:8787 · frontend http://localhost:5173\n');
run(['--env-file-if-exists=.env', 'server/index.mjs'], 'API');
run([fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), '--host', '127.0.0.1'], 'Vite');
