param(
  [ValidateSet('pull','push')]
  [string]$Mode = 'pull',
  [string]$Branch = 'develop',
  [string]$Remote = 'mcp-servers',
  [switch]$NoSquash,
  [switch]$AllowDirty
)

$ErrorActionPreference = 'Stop'

# Verify clean tree (unless allowed)
& "$PSScriptRoot/sequentialthinking-subtree-verify.ps1" -AllowDirty:$AllowDirty

switch ($Mode) {
  'pull' {
    & "$PSScriptRoot/sequentialthinking-subtree-pull.ps1" -Branch $Branch -NoSquash:$NoSquash
  }
  'push' {
    & "$PSScriptRoot/sequentialthinking-subtree-push.ps1" -Branch $Branch -Remote $Remote
  }
  default {
    throw "Unknown mode: $Mode"
  }
}
