"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listLocalFileResources = listLocalFileResources;
exports.readLocalFileResource = readLocalFileResource;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const pluginRoot = (0, node_path_1.join)(__dirname, "..");
const skillsSourceRoot = (0, node_path_1.join)(pluginRoot, "skills");
function toPosixPath(path) {
    return path.split(node_path_1.sep).join("/");
}
function mimeTypeForPath(path) {
    const extension = (0, node_path_1.extname)(path).toLowerCase();
    if (extension === ".md") {
        return "text/markdown";
    }
    if (extension === ".yaml" || extension === ".yml") {
        return "application/yaml";
    }
    if (extension === ".json") {
        return "application/json";
    }
    return "text/plain";
}
function resourceUri(virtualPath) {
    return `file://./${virtualPath.replace(/^\.\//, "")}`;
}
function normalizeResourcePath(uriOrPath) {
    return uriOrPath
        .replace(/^file:\/\/\.\//, "")
        .replace(/^file:\/\/\//, "")
        .replace(/^\.\//, "");
}
async function collectSkillFiles(directory) {
    const entries = await (0, promises_1.readdir)(directory, { withFileTypes: true });
    const resources = await Promise.all(entries.map(async (entry) => {
        const sourcePath = (0, node_path_1.join)(directory, entry.name);
        if (entry.isDirectory()) {
            return collectSkillFiles(sourcePath);
        }
        if (!entry.isFile()) {
            return [];
        }
        const skillRelativePath = toPosixPath((0, node_path_1.relative)(skillsSourceRoot, sourcePath));
        const virtualPath = `.agents/skills/${skillRelativePath}`;
        return [{
                uri: resourceUri(virtualPath),
                name: virtualPath,
                description: `Bundled Compliance Theater skill file at ${virtualPath}.`,
                mimeType: mimeTypeForPath(sourcePath),
                sourcePath,
                virtualPath,
            }];
    }));
    return resources.flat();
}
async function listLocalFileResources() {
    const agentResource = {
        uri: resourceUri("AGENTS.md"),
        name: "./AGENTS.md",
        description: "Compliance Theater MCP agent instructions, with links to MCP-hosted skills.",
        mimeType: "text/markdown",
        sourcePath: (0, node_path_1.join)(pluginRoot, "_AGENTS.md"),
        virtualPath: "AGENTS.md",
    };
    const resources = [agentResource, ...(await collectSkillFiles(skillsSourceRoot))];
    return resources.map(({ sourcePath: _sourcePath, virtualPath: _virtualPath, ...resource }) => resource);
}
async function readLocalFileResource(uriOrPath) {
    const resources = [
        {
            uri: resourceUri("AGENTS.md"),
            name: "./AGENTS.md",
            sourcePath: (0, node_path_1.join)(pluginRoot, "_AGENTS.md"),
            virtualPath: "AGENTS.md",
            mimeType: "text/markdown",
        },
        ...(await collectSkillFiles(skillsSourceRoot)),
    ];
    const requestedPath = normalizeResourcePath(uriOrPath);
    const resource = resources.find((candidate) => candidate.uri === uriOrPath ||
        candidate.name === uriOrPath ||
        candidate.virtualPath === requestedPath ||
        candidate.name.replace(/^\.\//, "") === requestedPath);
    if (!resource) {
        return undefined;
    }
    return {
        contents: [{
                uri: resource.uri,
                mimeType: resource.mimeType,
                text: await (0, promises_1.readFile)(resource.sourcePath, "utf8"),
            }]
    };
}
//# sourceMappingURL=local-file-resources.js.map