#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const pluginPackageRoot = resolve(repoRoot, 'web-ui', 'packages', 'codex-mcp');
const pluginDistPath = resolve(pluginPackageRoot, 'dist');
const defaultMarketplacePath = resolve(homedir(), '.codex', 'plugins', 'marketplace.json');
const agentsMarketplacePath = resolve(homedir(), '.agents', 'plugins', 'marketplace.json');

const DEFAULT_MARKETPLACE_NAME = 'local-codex-plugins';
const DEFAULT_MARKETPLACE_DISPLAY_NAME = 'Local Codex Plugins';
const PLUGIN_ENTRY_NAME = 'compliance-theater-2000';

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

const REQUIRED_ENV_VARS = [
  'MCP_COMPLIANCE_THEATER_RESOURCE_CLIENT_SECRET',
];

const OPTIONAL_ENV_VARS = [
  'MCP_COMPLIANCE_THEATER_RESOURCE_SERVER_URL',
  'MCP_COMPLIANCE_THEATER_RESOURCE_OAUTH_AUTHORIZE_URL',
  'MCP_COMPLIANCE_THEATER_RESOURCE_OAUTH_TOKEN_URL',
  'MCP_COMPLIANCE_THEATER_RESOURCE_OAUTH_CLIENT_ID',
  'MCP_COMPLIANCE_THEATER_RESOURCE_OAUTH_CLIENT_SECRET',
];

const parseArgs = () => {
  const args = process.argv.slice(2);
  const ret = {
    marketplacePath: process.env.CODEX_MARKETPLACE_PATH || defaultMarketplacePath,
    apply: false,
    yes: false,
    dev: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--dev') {
      ret.dev = true;
      continue;
    }

    if (arg === '--agents') {
      ret.marketplacePath = agentsMarketplacePath;
      continue;
    }

    if (arg === '--apply') {
      ret.apply = true;
      continue;
    }

    if (arg === '--yes' || arg === '-y') {
      ret.yes = true;
      ret.apply = true;
      continue;
    }

    if (arg === '--marketplace') {
      const value = args[i + 1];
      if (!value) {
        throw new Error('Missing value for --marketplace');
      }
      ret.marketplacePath = resolve(value);
      i += 1;
      continue;
    }

    if (arg.startsWith('--marketplace=')) {
      ret.marketplacePath = resolve(arg.slice('--marketplace='.length));
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      ret.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  ret.marketplacePath = resolve(ret.marketplacePath);
  ret.pluginPath = ret.dev ? pluginPackageRoot : pluginDistPath;
  return ret;
};

const buildPluginEntry = (pluginPath) => ({
  name: PLUGIN_ENTRY_NAME,
  source: {
    source: 'local',
    path: pluginPath,
  },
  policy: {
    installation: 'AVAILABLE',
    authentication: 'ON_INSTALL',
  },
  category: 'Productivity',
});

const printInstructions = (marketplacePath, pluginEntry, dev) => {
  console.log('Codex MCP plugin install helper');
  console.log('');
  console.log(`Plugin source path: ${pluginEntry.source.path}${dev ? ' (dev/src mode)' : ' (dist)'}`);
  console.log(`Default marketplace file: ${defaultMarketplacePath}`);
  console.log(`Selected marketplace file: ${marketplacePath}`);
  console.log('');
  console.log('Ready-to-paste plugin entry:');
  console.log(JSON.stringify(pluginEntry, null, 2));
  console.log('');
  console.log('Required runtime environment variables:');
  for (const variable of REQUIRED_ENV_VARS) {
    const value = process.env[variable];
    const status = value ? `${colors.green}Present${colors.reset}` : `${colors.red}Missing${colors.reset}`;
    console.log(`- [${variable}] : ${status}`);
  }
  console.log('');
  console.log('Optional environment variables:');
  for (const variable of OPTIONAL_ENV_VARS) {
    const value = process.env[variable];
    const status = value ? `${colors.green}Present${colors.reset}` : `${colors.yellow}Not Set${colors.reset}`;
    console.log(`- [${variable}] : ${status}`);
  }
  console.log('');
  console.log('Command line flags:');
  console.log('- --apply           Prompt and apply the entry to the selected marketplace file');
  console.log('- --yes, -y         Apply without prompt (implies --apply)');
  console.log('- --marketplace     Custom marketplace path');
  console.log('- --dev             Use package source root instead of dist/ (for local development)');
  console.log('- --agents          Use ~/.agents/plugins/marketplace.json instead of ~/.codex/plugins/');
  console.log('');
};

const readMarketplace = async (marketplacePath) => {
  try {
    const text = await readFile(marketplacePath, 'utf8');
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Marketplace JSON must be an object at the root.');
    }
    return parsed;
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return {
        name: DEFAULT_MARKETPLACE_NAME,
        interface: {
          displayName: DEFAULT_MARKETPLACE_DISPLAY_NAME,
        },
        plugins: [],
      };
    }
    throw error;
  }
};

const upsertPluginEntry = (marketplace, pluginEntry) => {
  const next = { ...marketplace };

  if (!next.name) {
    next.name = DEFAULT_MARKETPLACE_NAME;
  }

  if (!next.interface || typeof next.interface !== 'object' || Array.isArray(next.interface)) {
    next.interface = { displayName: DEFAULT_MARKETPLACE_DISPLAY_NAME };
  } else if (!next.interface.displayName) {
    next.interface = {
      ...next.interface,
      displayName: DEFAULT_MARKETPLACE_DISPLAY_NAME,
    };
  }

  const existingPlugins = Array.isArray(next.plugins) ? [...next.plugins] : [];

  const index = existingPlugins.findIndex((plugin) => {
    if (!plugin || typeof plugin !== 'object') {
      return false;
    }

    if (plugin.name === pluginEntry.name) {
      return true;
    }

    const source = plugin.source;
    return source && source.source === 'local' && source.path === pluginEntry.source.path;
  });

  if (index >= 0) {
    existingPlugins[index] = {
      ...existingPlugins[index],
      ...pluginEntry,
      source: {
        ...existingPlugins[index]?.source,
        ...pluginEntry.source,
      },
      policy: {
        ...existingPlugins[index]?.policy,
        ...pluginEntry.policy,
      },
    };
  } else {
    existingPlugins.push(pluginEntry);
  }

  next.plugins = existingPlugins;
  return next;
};

const ensurePluginPathExists = async (pluginPath) => {
  await access(pluginPath, fsConstants.R_OK);
};

const askToApply = async (marketplacePath, yes) => {
  if (yes) {
    return true;
  }

  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`Apply this plugin entry to ${marketplacePath}? (y/N) `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
};

const applyMarketplaceUpdate = async (marketplacePath, pluginEntry) => {
  const marketplace = await readMarketplace(marketplacePath);
  const updated = upsertPluginEntry(marketplace, pluginEntry);

  await mkdir(dirname(marketplacePath), { recursive: true });
  await writeFile(marketplacePath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');

  return updated;
};

const printHelp = () => {
  console.log('Usage: node scripts/codex-install-mcp.mjs [--apply] [--yes|-y] [--marketplace <path>] [--dev] [--agents]');
  console.log('');
  console.log('Prints a ready-to-paste marketplace entry for codex-mcp and can upsert it into a marketplace file.');
  console.log('Default marketplace path: ~/.codex/plugins/marketplace.json');
  console.log('By default, the plugin source path points to dist/. Use --dev to point to the package source root.');
};

const main = async () => {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    return;
  }

  await ensurePluginPathExists(options.pluginPath);

  const pluginEntry = buildPluginEntry(options.pluginPath);
  printInstructions(options.marketplacePath, pluginEntry, options.dev);

  if (!options.apply) {
    console.log('No file changes made. Re-run with --apply to update the marketplace file.');
    return;
  }

  const confirmed = await askToApply(options.marketplacePath, options.yes);
  if (!confirmed) {
    console.log('Skipped marketplace update.');
    return;
  }

  await applyMarketplaceUpdate(options.marketplacePath, pluginEntry);
  console.log(`Marketplace updated: ${options.marketplacePath}`);
};

main().catch((error) => {
  console.error(`codex-install-mcp failed: ${error?.message || String(error)}`);
  process.exit(1);
});
