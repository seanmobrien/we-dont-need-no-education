import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import type { AnyRecord } from "./types";

export type LocalFileResource = {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  sourcePath: string;
  virtualPath: string;
};

const pluginRoot = join(__dirname, "..");
const skillsSourceRoot = join(pluginRoot, "skills");

function toPosixPath(path: string): string {
  return path.split(sep).join("/");
}

function mimeTypeForPath(path: string): string {
  const extension = extname(path).toLowerCase();
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

function resourceUri(virtualPath: string): string {
  return `file://./${virtualPath.replace(/^\.\//, "")}`;
}

function normalizeResourcePath(uriOrPath: string): string {
  return uriOrPath
    .replace(/^file:\/\/\.\//, "")
    .replace(/^file:\/\/\//, "")
    .replace(/^\.\//, "");
}

async function collectSkillFiles(directory: string): Promise<LocalFileResource[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const resources = await Promise.all(entries.map(async (entry) => {
    const sourcePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectSkillFiles(sourcePath);
    }
    if (!entry.isFile()) {
      return [];
    }
    const skillRelativePath = toPosixPath(relative(skillsSourceRoot, sourcePath));
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

export async function listLocalFileResources(): Promise<AnyRecord[]> {
  const agentResource: LocalFileResource = {
    uri: resourceUri("AGENTS.md"),
    name: "./AGENTS.md",
    description: "Compliance Theater MCP agent instructions, with links to MCP-hosted skills.",
    mimeType: "text/markdown",
    sourcePath: join(pluginRoot, "_AGENTS.md"),
    virtualPath: "AGENTS.md",
  };
  const resources = [agentResource, ...(await collectSkillFiles(skillsSourceRoot))];
  return resources.map(({ sourcePath: _sourcePath, virtualPath: _virtualPath, ...resource }) => resource);
}

export async function readLocalFileResource(uriOrPath: string): Promise<AnyRecord | undefined> {
  const resources = [
    {
      uri: resourceUri("AGENTS.md"),
      name: "./AGENTS.md",
      sourcePath: join(pluginRoot, "_AGENTS.md"),
      virtualPath: "AGENTS.md",
      mimeType: "text/markdown",
    },
    ...(await collectSkillFiles(skillsSourceRoot)),
  ];
  const requestedPath = normalizeResourcePath(uriOrPath);
  const resource = resources.find((candidate) =>
    candidate.uri === uriOrPath ||
    candidate.name === uriOrPath ||
    candidate.virtualPath === requestedPath ||
    candidate.name.replace(/^\.\//, "") === requestedPath
  );
  if (!resource) {
    return undefined;
  }
  return {
    contents: [{
      uri: resource.uri,
      mimeType: resource.mimeType,
      text: await readFile(resource.sourcePath, "utf8"),
    }]
  };
}