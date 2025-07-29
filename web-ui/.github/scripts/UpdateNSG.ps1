# Variables
$resourceGroup = "SchoolLawyer"
$serverName = "plsas-complaint-prod"

function Convert-CIDRToIPRange {
    param (
        [Parameter(Mandatory = $true)]
        [string]$CIDR
    )

    $result = [PSCustomObject]@{
        CIDR    = $CIDR
        StartIP = $null
        EndIP   = $null
        Success = $false
    }

    try {
        $parts = $CIDR.Split('/')
        if ($parts.Count -ne 2) { return $result }

        $ip = $parts[0]
        $maskLength = [int]$parts[1]

        $octets = $ip.Split('.')
        if ($octets.Count -ne 4) { return $result }

        $ipInt = (($octets[0] -as [uint32]) -shl 24) `
               -bor (($octets[1] -as [uint32]) -shl 16) `
               -bor (($octets[2] -as [uint32]) -shl 8) `
               -bor ($octets[3] -as [uint32])

        if ($maskLength -eq 0) {
            $mask = 0
        } elseif ($maskLength -eq 32) {
            $mask = [uint32]::MaxValue
        } else {
            $mask = [uint32]::MaxValue -shl (32 - $maskLength)
        }

        $startIPInt = $ipInt -band $mask
        $notMask = (-bnot $mask) -band [uint32]::MaxValue
        $endIPInt = $startIPInt -bor $notMask

        $result.StartIP = (($startIPInt -shr 24) -band 255).ToString() + "." +
                          (($startIPInt -shr 16) -band 255).ToString() + "." +
                          (($startIPInt -shr 8) -band 255).ToString() + "." +
                          (($startIPInt) -band 255).ToString()

        $result.EndIP = (($endIPInt -shr 24) -band 255).ToString() + "." +
                        (($endIPInt -shr 16) -band 255).ToString() + "." +
                        (($endIPInt -shr 8) -band 255).ToString() + "." +
                        (($endIPInt) -band 255).ToString()

        $result.Success = $true
    }
    catch {
        $result.Success = $false
    }

    return $result
}





# Retrieve GitHub meta IP ranges
$githubMeta = Invoke-RestMethod -Uri "https://api.github.com/meta" -Headers @{ "User-Agent" = "PowerShell" }

# Combine IP ranges (adjust which ones based on use case)
$ipRanges = $githubMeta.hooks + $githubMeta.web + $githubMeta.actions

Write-Host "GitHub IP Ranges Retrieved:"
$ipRanges

# Clean up old GitHub-related rules first (optional but recommended for maintenance)
$existingRules = az postgres flexible-server firewall-rule list `
    --resource-group $resourceGroup `
    --name $serverName `
    --query "[?starts_with(name, 'GitHub_')].name" `
    --output tsv

foreach ($rule in $existingRules) {
    az postgres flexible-server firewall-rule delete `
        --resource-group $resourceGroup `
        --name $serverName `
        --rule-name $rule
    Write-Host "Deleted old rule: $rule"
}

# Create new rules for each GitHub IP range
$counter = 1
foreach ($ip in $ipRanges) {

    $ipBlock = Convert-CIDRToIPRange -CIDR $ip
    write-output $ipBlock
    if ($ipBlock.Success) {
        Write-Output "New Start: $($ipBlock.StartIP), End: $($ipBlock.EndIP)"
        # Extract start and end IP (Postgres requires both — for single IP use same value)
        $ruleName = "GitHub_$counter"

        az postgres flexible-server firewall-rule create `
            --resource-group $resourceGroup `
            --name $serverName `
            --rule-name $ruleName `
            --start-ip-address $ipBlock.StartIP `
            --end-ip-address $ipBlock.EndIP

        Write-Host "Created rule: $ruleName for IP $ip"
        $counter++

    }
}

Write-Host "All GitHub IP ranges applied to PostgreSQL Flexible Server."
