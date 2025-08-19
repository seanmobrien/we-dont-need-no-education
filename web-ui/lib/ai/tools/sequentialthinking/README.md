# About this folder: Git subtree integration

This folder is vendored from another repository using git subtree (split of a subdirectory).

- Parent repository (this repo):
  - URL: https://github.com/seanmobrien/we-dont-need-no-education
  - Path to subtree: web-ui/lib/ai/tools/sequentialthinking
- Child (upstream) repository and subdirectory:
  - URL: https://github.com/seanmobrien/mcp-servers
  - Subdirectory: src/sequentialthinking
  - Default branch: develop

Quick operations (from the repository root)
- Pull updates from upstream (only src/sequentialthinking):
  1) Maintain a persistent upstream clone at web-ui/.upstream/mcp-servers
    pwsh
    if (!(Test-Path 'web-ui/.upstream/mcp-servers')) { git clone --depth=1 -b develop https://github.com/seanmobrien/mcp-servers.git 'web-ui/.upstream/mcp-servers' }
    git -C 'web-ui/.upstream/mcp-servers' fetch origin develop
    git -C 'web-ui/.upstream/mcp-servers' checkout develop
    git -C 'web-ui/.upstream/mcp-servers' subtree split --prefix=src/sequentialthinking -b sequentialthinking-split --rejoin
  2) Pull into this subtree (squashed history)
    git subtree pull --prefix=web-ui/lib/ai/tools/sequentialthinking 'web-ui/.upstream/mcp-servers' sequentialthinking-split --squash
  Or use the helper script from anywhere inside the repo:
      pwsh web-ui/scripts/sequentialthinking-subtree-pull.ps1 -Branch develop

- Contribute changes back to upstream:
  1) Commit your edits in this folder as usual in the parent repo
  2) Push a split branch to a fork or to upstream (requires write access)
    pwsh
    # If you don't have push rights, point mcp-servers at your fork first:
    # git remote set-url mcp-servers https://github.com/<your-username>/mcp-servers.git
    git subtree push --prefix=web-ui/lib/ai/tools/sequentialthinking mcp-servers sequentialthinking-split
  # Or use helper script:
  pwsh web-ui/scripts/sequentialthinking-subtree-push.ps1 -Branch sequentialthinking-split -Remote mcp-servers
  3) Open a PR from sequentialthinking-split into the upstream repo
    Note: The split branch places the files at repo root. Upstream maintainers can merge by
    moving those files into src/sequentialthinking (or by using `git subtree merge -P src/sequentialthinking`).

Notes
- Ensure your working tree is clean before running subtree operations.
- We use `--squash` to keep the parent repository history compact.
- A convenience remote named `mcp-servers` is configured to https://github.com/seanmobrien/mcp-servers.git.

### Working on a specific upstream branch ("check out a branch in the sub-repo")

Because this folder is a subtree (not a submodule), it is not an independent Git repo. To work against a specific upstream branch, use a temporary clone of the upstream and then pull/push via subtree.

Check out upstream branch and pull it into the subtree:

1) Use the persistent upstream clone and check out the target branch (replace `<branch>`)
  pwsh
  if (!(Test-Path 'web-ui/.upstream/mcp-servers')) { git clone --depth=1 https://github.com/seanmobrien/mcp-servers.git 'web-ui/.upstream/mcp-servers' }
  git -C 'web-ui/.upstream/mcp-servers' fetch origin <branch>
  git -C 'web-ui/.upstream/mcp-servers' checkout <branch>

2) Split only the desired subdirectory from that branch
  git -C 'web-ui/.upstream/mcp-servers' subtree split --prefix=src/sequentialthinking -b seq-split-<branch>

3) Pull the split branch into this subtree path (squashed)
  git subtree pull --prefix=web-ui/lib/ai/tools/sequentialthinking 'web-ui/.upstream/mcp-servers' seq-split-<branch> --squash

Push local changes to a specific upstream branch:

1) Commit your local edits in this subtree path in the parent repo
2) Push to upstream branch (creates the branch on remote if it doesn’t exist and you have permissions)
  pwsh
  git subtree push --prefix=web-ui/lib/ai/tools/sequentialthinking mcp-servers <branch>

Tip: The persistent local clone lives at `web-ui/.upstream/mcp-servers`. Point subtree commands at that path.

### Helper scripts

Run a pre-flight verification (ensures clean working tree unless -AllowDirty):
  pwsh web-ui/scripts/sequentialthinking-subtree-verify.ps1

One-liner syncs:
- Pull latest from upstream (develop):
  pwsh web-ui/scripts/sequentialthinking-subtree-sync.ps1 -Mode pull -Branch develop
- Pull a feature branch from upstream:
  pwsh web-ui/scripts/sequentialthinking-subtree-sync.ps1 -Mode pull -Branch feature/my-branch
- Push local subtree changes to upstream branch (requires permissions):
  pwsh web-ui/scripts/sequentialthinking-subtree-sync.ps1 -Mode push -Branch sequentialthinking-split -Remote mcp-servers

# Sequential Thinking MCP Server

An MCP server implementation that provides a tool for dynamic and reflective problem-solving through a structured thinking process.

## Features

- Break down complex problems into manageable steps
- Revise and refine thoughts as understanding deepens
- Branch into alternative paths of reasoning
- Adjust the total number of thoughts dynamically
- Generate and verify solution hypotheses

## Tool

### sequential_thinking

Facilitates a detailed, step-by-step thinking process for problem-solving and analysis.

**Inputs:**
- `thought` (string): The current thinking step
- `nextThoughtNeeded` (boolean): Whether another thought step is needed
- `thoughtNumber` (integer): Current thought number
- `totalThoughts` (integer): Estimated total thoughts needed
- `isRevision` (boolean, optional): Whether this revises previous thinking
- `revisesThought` (integer, optional): Which thought is being reconsidered
- `branchFromThought` (integer, optional): Branching point thought number
- `branchId` (string, optional): Branch identifier
- `needsMoreThoughts` (boolean, optional): If more thoughts are needed

## Usage

The Sequential Thinking tool is designed for:
- Breaking down complex problems into steps
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where the full scope might not be clear initially
- Tasks that need to maintain context over multiple steps
- Situations where irrelevant information needs to be filtered out

## Configuration

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

#### npx

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sequential-thinking"
      ]
    }
  }
}
```

#### docker

```json
{
  "mcpServers": {
    "sequentialthinking": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "mcp/sequentialthinking"
      ]
    }
  }
}
```

To disable logging of thought information set env var: `DISABLE_THOUGHT_LOGGING` to `true`.
Comment

### Usage with VS Code

For quick installation, click one of the installation buttons below...

[![Install with NPX in VS Code](https://img.shields.io/badge/VS_Code-NPM-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=sequentialthinking&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40modelcontextprotocol%2Fserver-sequential-thinking%22%5D%7D) [![Install with NPX in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-NPM-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=sequentialthinking&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40modelcontextprotocol%2Fserver-sequential-thinking%22%5D%7D&quality=insiders)

[![Install with Docker in VS Code](https://img.shields.io/badge/VS_Code-Docker-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=sequentialthinking&config=%7B%22command%22%3A%22docker%22%2C%22args%22%3A%5B%22run%22%2C%22--rm%22%2C%22-i%22%2C%22mcp%2Fsequentialthinking%22%5D%7D) [![Install with Docker in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Docker-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=sequentialthinking&config=%7B%22command%22%3A%22docker%22%2C%22args%22%3A%5B%22run%22%2C%22--rm%22%2C%22-i%22%2C%22mcp%2Fsequentialthinking%22%5D%7D&quality=insiders)

For manual installation, you can configure the MCP server using one of these methods:

**Method 1: User Configuration (Recommended)**
Add the configuration to your user-level MCP configuration file. Open the Command Palette (`Ctrl + Shift + P`) and run `MCP: Open User Configuration`. This will open your user `mcp.json` file where you can add the server configuration.

**Method 2: Workspace Configuration**
Alternatively, you can add the configuration to a file called `.vscode/mcp.json` in your workspace. This will allow you to share the configuration with others.

> For more details about MCP configuration in VS Code, see the [official VS Code MCP documentation](https://code.visualstudio.com/docs/copilot/mcp).

For NPX installation:

```json
{
  "servers": {
    "sequential-thinking": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sequential-thinking"
      ]
    }
  }
}
```

For Docker installation:

```json
{
  "servers": {
    "sequential-thinking": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "mcp/sequentialthinking"
      ]
    }
  }
}
```

## Building

Docker:

```bash
docker build -t mcp/sequentialthinking -f src/sequentialthinking/Dockerfile .
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
