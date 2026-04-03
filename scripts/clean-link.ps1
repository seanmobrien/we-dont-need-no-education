# clean-link.ps1 performs a destructive, blank-state dependency reset for this
# repository and for nested projects that are intentionally buildable both as
# part of the monorepo and on their own.
#
# Intended use cases:
# - Rebuild the dependency graph from scratch after lockfile or linker drift.
# - Recreate install state for the root workspace and nested standalone projects.
# - Verify that each managed install state can survive a clean install,
#   refresh-lockfile pass, and immutable validation pass.
#
# High-level architecture:
# - Install states are registered once in global associative arrays keyed by a
#   stable id.
# - The script executes in ordered stages: destructive cleanup, install,
#   refresh-lockfile, and validate.
# - Validation is intentionally deferred until every refresh has completed so
#   each workspace is checked against the final lockfile state rather than an
#   intermediate one.
# - Validation is non-blocking per workspace: every state is checked and
#   reported even if an earlier state fails.
#
# Intentional design decisions:
# - The effective working directory is always the repository root, computed as
#   the parent of this script's folder.
# - json-viewer is intentionally excluded from the managed install states
#   because workspace builds do not emit a dedicated yarn.lock for it.
# - Each install/refresh/validate stage uses the Yarn release checked into the
#   specific workspace being processed rather than sharing a single root Yarn.
# - Forwarded arguments are reserved for future options and are intentionally
#   ignored by this script today.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path
Set-Location $RepoRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node is not available on PATH. Install Node or ensure the Windows-registered node executable is available."
}

$InstallStateName = @{}
$InstallStatePath = @{}
$InstallStateValidationResult = @{}

$InstallStateIds = @(
  "repo-root"
  "web-ui"
  "semantic-encoding"
)

$InstallRefreshIds = @(
  "repo-root"
  "web-ui"
  "semantic-encoding"
)

function Register-InstallState {
  param(
    [Parameter(Mandatory = $true)][string]$StateId,
    [Parameter(Mandatory = $true)][string]$StateName,
    [Parameter(Mandatory = $true)][string]$StatePath
  )

  $InstallStateName[$StateId] = $StateName
  $InstallStatePath[$StateId] = $StatePath
}

function Write-StageLog {
  param(
    [Parameter(Mandatory = $true)][string]$StageName,
    [Parameter(Mandatory = $true)][string]$WorkspaceName,
    [Parameter(Mandatory = $true)][string]$Message
  )

  Write-Host "[$StageName] $WorkspaceName`: $Message"
}

function Resolve-InstallState {
  param(
    [Parameter(Mandatory = $true)][string]$StateId
  )

  $workspaceName = $InstallStateName[$StateId]
  $workspacePath = $InstallStatePath[$StateId]

  if ([string]::IsNullOrWhiteSpace($workspaceName) -or [string]::IsNullOrWhiteSpace($workspacePath)) {
    throw "Unknown install state id '$StateId'"
  }

  return @{
    Name = $workspaceName
    Path = $workspacePath
  }
}

function Get-YarnBinaryPath {
  param(
    [Parameter(Mandatory = $true)][string]$WorkspacePath
  )

  return Join-Path $WorkspacePath ".yarn\releases\yarn-4.12.0.cjs"
}

function Invoke-YarnInWorkspace {
  param(
    [Parameter(Mandatory = $true)][string]$WorkspacePath,
    [Parameter(Mandatory = $true)][string[]]$Args
  )

  Push-Location $WorkspacePath
  try {
    $workspaceRelativeYarnBinary = ".\.yarn\releases\yarn-4.12.0.cjs"
    if (-not (Test-Path -LiteralPath $workspaceRelativeYarnBinary -PathType Leaf)) {
      throw "Yarn binary missing ($(Join-Path $WorkspacePath $workspaceRelativeYarnBinary))"
    }

    & node $workspaceRelativeYarnBinary @Args
    if ($LASTEXITCODE -ne 0) {
      throw "Yarn command failed in $WorkspacePath with exit code $LASTEXITCODE"
    }
  }
  finally {
    Pop-Location
  }
}

function Test-InstallArtifacts {
  param(
    [Parameter(Mandatory = $true)][string]$WorkspaceName,
    [Parameter(Mandatory = $true)][string]$WorkspacePath,
    [Parameter(Mandatory = $true)][string]$LockfilePath
  )

  $nodeModulesState = Join-Path $WorkspacePath "node_modules\.yarn-state.yml"
  $installState = Join-Path $WorkspacePath ".yarn\install-state.gz"
  $packageJson = Join-Path $WorkspacePath "package.json"
  $yarnBinary = Get-YarnBinaryPath -WorkspacePath $WorkspacePath

  if (-not (Test-Path -LiteralPath $LockfilePath -PathType Leaf)) {
    Write-StageLog -StageName "validate" -WorkspaceName $WorkspaceName -Message "FAIL yarn.lock missing ($LockfilePath)"
    return $false
  }

  if ((Get-Item -LiteralPath $LockfilePath).Length -le 0) {
    Write-StageLog -StageName "validate" -WorkspaceName $WorkspaceName -Message "FAIL yarn.lock empty ($LockfilePath)"
    return $false
  }

  if (-not (Test-Path -LiteralPath $packageJson -PathType Leaf)) {
    Write-StageLog -StageName "validate" -WorkspaceName $WorkspaceName -Message "FAIL package.json missing ($packageJson)"
    return $false
  }

  if (-not (Test-Path -LiteralPath $yarnBinary -PathType Leaf)) {
    Write-StageLog -StageName "validate" -WorkspaceName $WorkspaceName -Message "FAIL Yarn binary missing ($yarnBinary)"
    return $false
  }

  if (-not (Test-Path -LiteralPath $nodeModulesState -PathType Leaf)) {
    Write-StageLog -StageName "validate" -WorkspaceName $WorkspaceName -Message "FAIL missing node_modules/.yarn-state.yml"
    return $false
  }

  if (-not (Test-Path -LiteralPath $installState -PathType Leaf)) {
    Write-StageLog -StageName "validate" -WorkspaceName $WorkspaceName -Message "FAIL missing .yarn/install-state.gz"
    return $false
  }

  return $true
}

function Initialize-InstallState {
  param(
    [Parameter(Mandatory = $true)][string]$StateId
  )

  $state = Resolve-InstallState -StateId $StateId
  $workspaceName = $state.Name
  $workspacePath = $state.Path

  $lockfile = Join-Path $workspacePath "yarn.lock"
  if (-not (Test-Path -LiteralPath $lockfile -PathType Leaf)) {
    New-Item -ItemType File -Path $lockfile -Force | Out-Null
  }

  Write-StageLog -StageName "install" -WorkspaceName $workspaceName -Message "running yarn install"
  Invoke-YarnInWorkspace -WorkspacePath $workspacePath -Args @("install")

  $nodeModulesState = Join-Path $workspacePath "node_modules\.yarn-state.yml"
  $installState = Join-Path $workspacePath ".yarn\install-state.gz"

  if (-not (Test-Path -LiteralPath $nodeModulesState -PathType Leaf)) {
    if (Test-Path -LiteralPath $installState -PathType Leaf) {
      throw "Missing $nodeModulesState in $workspacePath. Found $installState, but node-modules linker requires $nodeModulesState."
    }
    throw "Missing $nodeModulesState in $workspacePath."
  }
}

function Update-InstallState {
  param(
    [Parameter(Mandatory = $true)][string]$StateId
  )

  $state = Resolve-InstallState -StateId $StateId
  $workspaceName = $state.Name
  $workspacePath = $state.Path

  Write-StageLog -StageName "refresh" -WorkspaceName $workspaceName -Message "running yarn install --refresh-lockfile"
  Invoke-YarnInWorkspace -WorkspacePath $workspacePath -Args @("install", "--refresh-lockfile")
}

function Test-InstallState {
  param(
    [Parameter(Mandatory = $true)][string]$StateId
  )

  $state = Resolve-InstallState -StateId $StateId
  $workspaceName = $state.Name
  $workspacePath = $state.Path
  $lockfilePath = Join-Path $workspacePath "yarn.lock"

  Write-StageLog -StageName "validate" -WorkspaceName $workspaceName -Message "starting"

  if (-not (Test-InstallArtifacts -WorkspaceName $workspaceName -WorkspacePath $workspacePath -LockfilePath $lockfilePath)) {
    $InstallStateValidationResult[$StateId] = $false
    return $false
  }

  try {
    Invoke-YarnInWorkspace -WorkspacePath $workspacePath -Args @("install", "--immutable")
  }
  catch {
    Write-StageLog -StageName "validate" -WorkspaceName $workspaceName -Message "FAIL yarn install --immutable exited with error"
    $InstallStateValidationResult[$StateId] = $false
    return $false
  }

  if (-not (Test-InstallArtifacts -WorkspaceName $workspaceName -WorkspacePath $workspacePath -LockfilePath $lockfilePath)) {
    $InstallStateValidationResult[$StateId] = $false
    return $false
  }

  $lockfileSize = (Get-Item -LiteralPath $lockfilePath).Length
  Write-StageLog -StageName "validate" -WorkspaceName $workspaceName -Message "PASS immutable install succeeded; yarn.lock bytes=$lockfileSize"
  $InstallStateValidationResult[$StateId] = $true
  return $true
}

function Remove-MatchingDirectories {
  param(
    [Parameter(Mandatory = $true)][string]$RootPath,
    [Parameter(Mandatory = $true)][string[]]$Names
  )

  $dirs = Get-ChildItem -Path $RootPath -Directory -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { $Names -contains $_.Name } |
    Sort-Object FullName -Descending

  foreach ($dir in $dirs) {
    Write-Host $dir.FullName
    Remove-Item -LiteralPath $dir.FullName -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function Remove-MatchingFiles {
  param(
    [Parameter(Mandatory = $true)][string]$RootPath,
    [Parameter(Mandatory = $true)][string[]]$Names
  )

  $files = Get-ChildItem -Path $RootPath -File -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { $Names -contains $_.Name }

  foreach ($file in $files) {
    Write-Host $file.FullName
    Remove-Item -LiteralPath $file.FullName -Force -ErrorAction SilentlyContinue
  }
}

Register-InstallState -StateId "repo-root" -StateName "Repository Root" -StatePath $RepoRoot
# Register-InstallState -StateId "web-ui" -StateName "Web UI" -StatePath (Join-Path $RepoRoot "web-ui")
Register-InstallState -StateId "semantic-encoding" -StateName "Semantic Encoding" -StatePath (Join-Path $RepoRoot "web-ui\submodules\sce")

Remove-MatchingDirectories -RootPath $RepoRoot -Names @("node_modules", "dist", "build", ".next")
Remove-MatchingFiles -RootPath $RepoRoot -Names @(
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  ".tsbuildinfo",
  "install-state.gz",
  "tsconfig.tsbuildinfo",
  "npm-shrinkwrap.json"
)

foreach ($stateId in $InstallStateIds) {
  Initialize-InstallState -StateId $stateId
}

foreach ($stateId in $InstallRefreshIds) {
  Update-InstallState -StateId $stateId
}

$validationFailures = 0
foreach ($stateId in $InstallRefreshIds) {
  if (-not (Test-InstallState -StateId $stateId)) {
    $validationFailures++
  }
}

Write-Host "Validation summary:"
foreach ($stateId in $InstallRefreshIds) {
  $result = $InstallStateValidationResult[$stateId]
  if ($null -eq $result) {
    $result = $false
  }
  Write-Host ("  {0}: {1}" -f $InstallStateName[$stateId], $result)
}

if ($validationFailures -gt 0) {
  Write-Error "Completed cleanup/install/refresh, but $validationFailures validation check(s) failed."
  exit 1
}

Write-Host "Cleaned up symlinks/lockfiles, reinstalled dependencies, refreshed lockfiles, and validated install state files."