param(
  [string]$Branch = "develop",
  [switch]$NoSquash
)

$ErrorActionPreference = 'Stop'

# Locate repo root and switch there so prefixes resolve correctly
$gitRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $gitRoot) { throw "Not inside a Git repository" }
Set-Location -LiteralPath $gitRoot

$prefix = 'web-ui/lib/ai/tools/sequentialthinking'
$upstreamPath = Join-Path $gitRoot 'web-ui/.upstream/mcp-servers'

Write-Host "Using upstream clone at: $upstreamPath"
if (-not (Test-Path $upstreamPath)) {
  Write-Host "Cloning upstream repository (branch $Branch) ..."
  git clone --depth=1 -b $Branch https://github.com/seanmobrien/mcp-servers.git $upstreamPath
} else {
  Write-Host "Fetching and checking out branch $Branch ..."
  git -C $upstreamPath fetch origin $Branch
  git -C $upstreamPath checkout $Branch
  git -C $upstreamPath reset --hard origin/$Branch
}

$splitBranch = "seq-split-$Branch"
try {
  # Remove previous split branch if it exists
  git -C $upstreamPath branch -D $splitBranch | Out-Null
} catch {}

Write-Host "Creating split branch for src/sequentialthinking -> $splitBranch ..."
git -C $upstreamPath subtree split --prefix=src/sequentialthinking -b $splitBranch

Write-Host "Pulling split into subtree at $prefix ..."
if ($NoSquash) {
  git subtree pull --prefix=$prefix $upstreamPath $splitBranch
} else {
  git subtree pull --prefix=$prefix $upstreamPath $splitBranch --squash
}

Write-Host "Done: Pulled $Branch (src/sequentialthinking) into $prefix"
