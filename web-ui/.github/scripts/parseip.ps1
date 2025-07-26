#function Convert-CIDRToIPRange {
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
#}
