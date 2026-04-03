import { spawn } from 'node:child_process';

const serverUrl = process.env.LHCI_WARMUP_URL ?? 'http://localhost:3000/';
const readyMarker = 'LHCI_WARMUP_COMPLETE';
const readyTimeoutMs = Number(process.env.LHCI_WARMUP_TIMEOUT_MS ?? 120000);
const pollIntervalMs = 1000;
const requestTimeoutMs = 5000;

const command = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
const args = ['workspace', '@compliance-theater/app', 'start'];

const serverProcess = spawn(command, args, {
  env: process.env,
  stdio: ['inherit', 'pipe', 'pipe'],
});

let serverExited = false;
let shuttingDown = false;

const pipeOutput = (stream, writer) => {
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => writer.write(chunk));
};

pipeOutput(serverProcess.stdout, process.stdout);
pipeOutput(serverProcess.stderr, process.stderr);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const requestPage = async (timeoutMs) => {
  const response = await fetch(serverUrl, {
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });

  await response.arrayBuffer();
  return response;
};

const waitForServer = async () => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < readyTimeoutMs) {
    if (serverExited) {
      throw new Error('The application server exited before LHCI warm-up completed.');
    }

    try {
      const response = await requestPage(requestTimeoutMs);
      if (response.status < 500) {
        return;
      }
    } catch {
      // Ignore connection failures until the timeout expires.
    }

    await wait(pollIntervalMs);
  }

  throw new Error(`Timed out waiting for ${serverUrl} after ${readyTimeoutMs}ms.`);
};

const warmServer = async () => {
  const response = await requestPage(15000);
  if (!response.ok) {
    throw new Error(`Warm-up request failed with status ${response.status}.`);
  }
};

const shutdown = (signal = 'SIGTERM') => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (!serverExited) {
    serverProcess.kill(signal);
  }
};

serverProcess.once('exit', (code) => {
  serverExited = true;

  if (!shuttingDown) {
    process.exit(code ?? 0);
  }
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

try {
  await waitForServer();
  await warmServer();
  process.stdout.write(`${readyMarker}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`LHCI warm-up failed: ${message}\n`);
  shutdown('SIGTERM');
  process.exitCode = 1;
}