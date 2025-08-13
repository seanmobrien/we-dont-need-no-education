param(
  [switch]$AllowDirty
)

$ErrorActionPreference = 'Stop'

# Ensure we are inside a Git repository
$gitRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $gitRoot) { throw "Not inside a Git repository" }
Set-Location -LiteralPath $gitRoot

# Check working tree cleanliness
$status = & git status --porcelain=v1
if (-not $AllowDirty -and $status) {
  Write-Error "Working tree is not clean. Commit, stash, or rerun with -AllowDirty.\n$status"
  exit 1
}

# Basic context info
$currentBranch = (& git rev-parse --abbrev-ref HEAD).Trim()
Write-Host "Repo: $gitRoot"
Write-Host "Branch: $currentBranch"
if ($status) { Write-Host "Note: Dirty working tree (allowed)" } else { Write-Host "Working tree clean" }

# Verify persistent upstream path existence (optional)
$upstreamPath = Join-Path $gitRoot 'web-ui/.upstream/mcp-servers'
if (Test-Path $upstreamPath) {
  Write-Host "Upstream clone present: $upstreamPath"
} else {
  Write-Host "Upstream clone missing: $upstreamPath (will be created by pull script)"
}
