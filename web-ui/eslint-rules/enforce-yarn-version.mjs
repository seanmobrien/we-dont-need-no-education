// Custom ESLint rule: enforce-yarn-version
// Fails if ESLint is not run via the expected Yarn version.
//
// Expected version matches the `engines.yarn` field in all workspace lib packages.

import { execSync } from 'child_process';

const EXPECTED_YARN_RANGE = '>=4.12.0';
const EXPECTED_YARN_MIN = [4, 12, 0];

function parseVersion(versionStr) {
    const m = String(versionStr).match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!m) return null;
    return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

function satisfiesGte(version, minVersion) {
    const [major, minor, patch] = version;
    const [minMajor, minMinor, minPatch] = minVersion;
    if (major !== minMajor) return major > minMajor;
    if (minor !== minMinor) return minor > minMinor;
    return patch >= minPatch;
}

function checkYarnVersion() {
    // When ESLint runs via a yarn script, yarn sets npm_config_user_agent.
    const userAgent = process.env.npm_config_user_agent;
    if (userAgent) {
        const match = userAgent.match(/^yarn\/(\S+)/);
        if (!match) {
            return {
                valid: false,
                message: `ESLint must be run using Yarn ${EXPECTED_YARN_RANGE}. Detected non-Yarn package manager (user agent: "${userAgent}").`,
            };
        }
        const detectedVersion = match[1];
        const parsed = parseVersion(detectedVersion);
        if (!parsed || !satisfiesGte(parsed, EXPECTED_YARN_MIN)) {
            return {
                valid: false,
                message: `Yarn version ${detectedVersion} does not satisfy required ${EXPECTED_YARN_RANGE}.`,
            };
        }
        return { valid: true };
    }

    // npm_config_user_agent is not set — ESLint may be running directly from the CLI.
    // Fall back to querying the active yarn binary.
    try {
        const detectedVersion = execSync('yarn --version', {
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
        const parsed = parseVersion(detectedVersion);
        if (!parsed || !satisfiesGte(parsed, EXPECTED_YARN_MIN)) {
            return {
                valid: false,
                message: `Yarn version ${detectedVersion} does not satisfy required ${EXPECTED_YARN_RANGE}.`,
            };
        }
        return { valid: true };
    } catch {
        return {
            valid: false,
            message: `ESLint must be run using Yarn ${EXPECTED_YARN_RANGE}. Could not detect Yarn — ensure Yarn is installed and used to run ESLint.`,
        };
    }
}

// Check once at module load time so the cost is paid only once per ESLint run.
const yarnCheck = checkYarnVersion();

const enforceYarnVersionRule = {
    meta: {
        type: 'problem',
        docs: {
            description: `Enforce that ESLint is run with Yarn ${EXPECTED_YARN_RANGE}`,
        },
        schema: [],
        messages: {
            wrongVersion: '{{ message }}',
        },
    },
    create(context) {
        if (yarnCheck.valid) return {};
        return {
            Program(node) {
                context.report({
                    node,
                    messageId: 'wrongVersion',
                    data: { message: yarnCheck.message },
                });
            },
        };
    },
};

export default enforceYarnVersionRule;
