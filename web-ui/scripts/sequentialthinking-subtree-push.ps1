param(
  [string]$Branch = "develop",
  [string]$Remote = "mcp-servers"
)

$ErrorActionPreference = 'Stop'

# Locate repo root and switch there so prefixes resolve correctly
$gitRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $gitRoot) { throw "Not inside a Git repository" }
Set-Location -LiteralPath $gitRoot

$prefix = 'web-ui/lib/ai/tools/sequentialthinking'

Write-Host "Pushing subtree at $prefix to ${Remote}:${Branch}..."

git subtree push --prefix=$prefix $Remote $Branch

Write-Host "Done: Pushed subtree $prefix to ${Remote}:${Branch}"
