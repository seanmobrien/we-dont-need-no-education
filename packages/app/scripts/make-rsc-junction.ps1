function MakeJunctionPoints() {
  # Compute absolute path to the parent directory of the script
  $scriptDir = Split-Path -Parent $PSScriptRoot
  $Green = "$([char]27)[32m"
  $Red = "$([char]27)[31m"
  $Reset = "$([char]27)[0m"
  $Cyan = "$([char]27)[36m"
  $Blue = "$([char]27)[34m"
  $Yellow = "$([char]27)[33m"
  # Create junctions
  if (Test-Path "$scriptDir\(rsc)") { 
    Write-Host "$($Blue) Folder $($Red)$($scriptDir)\(rsc)$($Blue) already exists...$($Yellow)Skipping."
  } else {
      New-Item -ItemType SymbolicLink -Path "$scriptDir\(rsc)" -Target "$scriptDir"  
      Write-Host "$($Cyan)Created junction point for $($Green)$($scriptDir)\(rsc)$($Cyan)."
  }
  if (Test-Path "$scriptDir\.github\instructions") { 
    Write-Host "$($Blue)Folder $($Red)$($scriptDir)\.github\instructions$($Blue) already exists...$($Yellow)Skipping.$($Reset)"
  } else {
      New-Item -ItemType SymbolicLink -Path "$scriptDir\.github\instructions" -Target "$scriptDir\.github\instructions\web-ui"  
      Write-Host "$($Cyan)Created junction point for $($Green)$($scriptDir)\.github\instructions$($Cyan).$($Reset)"
  }
}

MakeJunctionPoints

