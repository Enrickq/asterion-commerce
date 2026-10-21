import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

// Check configuration without displaying any credential values or sending requests.
const major = Number(process.versions.node.split('.')[0]);
const problems = [];
if (major < 24) problems.push('Node.js 24 or newer is required (built-in SQLite).');
const envFile = resolve('.env');
const local = existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {};
const config = { ...local, ...process.env };
const mode = (name, fallback, allowed) => {
  const value = config[name] || fallback;
  if (!allowed.includes(value)) problems.push(`${name} must be one of: ${allowed.join(', ')}.`);
  return value;
};
const requireKeys = (names) => {
  for (const name of names) if (!config[name]?.trim()) problems.push(`${name} is required for the selected mode.`);
};
const payments = mode('PAYMENTS_MODE', 'demo', ['demo', 'paypal-sandbox']);
const agent = mode('AGENT_MODE', 'deterministic', ['deterministic', 'anthropic']);
const weather = mode('WEATHER_MODE', 'fixtures', ['fixtures', 'aemet']);
if (payments === 'paypal-sandbox') requireKeys(['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET']);
if (['true', '1'].includes(config.PUBLIC_DEMO) && payments !== 'demo') problems.push('PUBLIC_DEMO requires PAYMENTS_MODE=demo.');
if (config.SESSION_SECRET && config.SESSION_SECRET.length < 32) problems.push('SESSION_SECRET must contain at least 32 characters.');
if (agent === 'anthropic') requireKeys(['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL']);
if (weather === 'aemet') requireKeys(['AEMET_API_KEY', 'AEMET_STATION_ID']);
if (config.KERNEL_API_KEY || config.KERNEL_SUPPLIER_URL) requireKeys(['KERNEL_API_KEY', 'KERNEL_SUPPLIER_URL']);
if (config.PUBLIC_BASE_URL) {
  try {
    const url = new URL(config.PUBLIC_BASE_URL);
    if (!['http:', 'https:'].includes(url.protocol)) problems.push('PUBLIC_BASE_URL must use http or https.');
  } catch { problems.push('PUBLIC_BASE_URL must be an absolute URL.'); }
}
if (config.PAYPAL_PAYOUT_RECIPIENTS) {
  try {
    const recipients = JSON.parse(config.PAYPAL_PAYOUT_RECIPIENTS);
    if (!recipients || Array.isArray(recipients) || typeof recipients !== 'object') throw new Error();
    if (Object.values(recipients).some(value => typeof value !== 'string')) throw new Error();
  } catch { problems.push('PAYPAL_PAYOUT_RECIPIENTS must be a JSON object mapping allocation IDs to email strings.'); }
}
if (problems.length) {
  for (const problem of problems) process.stderr.write(`FAIL: ${problem}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Ready: Node ${process.versions.node}; payments=${payments}; agents=${agent}; weather=${weather}.\n`);
  process.stdout.write('Configuration presence checked. Provider credentials and account access were not validated.\n');
}
