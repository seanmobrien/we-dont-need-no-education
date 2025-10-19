# Variables
$ResourceGroupName = "SchoolLawyer"
$ContainerAppName  = "neo4j"   # matches parameters('containerapps_mem0_api_name_1')
$TargetPort        = 8765
$Transport         = "Auto"
$AllowInsecure     = $false

# Existing named rules you already had in the ARM:
$existingRules = @(
    #@{ Name = "Param-Secret-Name"; Ip = "135.234.125.150" },  # name in ARM was [parameters('containerapps_mem0_api_name')]
    @{ Name = "SeanHome";          Ip = "173.22.111.250" }
)

# New IP list you provided
$ipList = @"
20.118.146.180,20.118.148.199,4.227.58.38,134.33.25.222,4.236.8.251,4.236.39.174,20.14.40.97,4.236.61.216,20.118.144.32,20.118.146.221,4.227.76.26,4.227.76.45,4.227.76.46,4.227.76.20,4.227.76.51,4.227.76.18,20.125.76.124,20.125.74.58,20.14.119.70,135.234.107.40,135.234.118.135,20.14.118.252,4.236.1.136,20.118.180.220,20.125.72.245,4.236.29.28,4.236.28.230,4.236.28.126,4.236.29.23,4.236.28.206,4.236.29.43,4.236.16.126
"@ -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }

# Build rule objects for the new list (dedupe and exclude blanks)
$i = 1
$generatedRules =
    $ipList |
    Sort-Object -Unique |
    ForEach-Object {
      az containerapp ingress access-restriction set -n $ContainerAppName -g $ResourceGroupName --ip-address $_ --rule-name ("ContainerApp-${$i}") --action Allow --output none
      $i = $i + 1
    }
