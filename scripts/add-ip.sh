#!/bin/bash

set -euo pipefail

RESOURCE_GROUP="SchoolLawyer"
POSTGRES_SERVER="plsas-complaint-prod"
INBOUND_RULE_NAME="Home_IP_Automated_Inbound"
OUTBOUND_RULE_NAME="Home_IP_Automated_Outbound"
POSTGRES_RULE_NAME="Home_IP_Automated"
INBOUND_PRIORITY="3000"
OUTBOUND_PRIORITY="3001"

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: Required command not found: $cmd" >&2
    exit 1
  fi
}

resolve_public_ip() {
  local ip=""

  for endpoint in \
    "https://api.ipify.org" \
    "https://ifconfig.me/ip" \
    "https://checkip.amazonaws.com"; do
    ip="$(curl -fsS "$endpoint" 2>/dev/null | tr -d '[:space:]' || true)"
    if [[ "$ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
      echo "$ip"
      return 0
    fi
  done

  echo "ERROR: Unable to resolve current public IPv4 address." >&2
  exit 1
}

ensure_logged_in() {
  if ! az account show >/dev/null 2>&1; then
    echo "ERROR: Azure CLI is not logged in. Run 'az login' and retry." >&2
    exit 1
  fi
}

ensure_resource_group() {
  if ! az group show --name "$RESOURCE_GROUP" >/dev/null 2>&1; then
    echo "ERROR: Resource group '$RESOURCE_GROUP' was not found." >&2
    exit 1
  fi
}

upsert_nsg_rule() {
  local nsg_name="$1"
  local rule_name="$2"
  local direction="$3"
  local priority="$4"
  local source_prefix="$5"
  local destination_prefix="$6"

  if az network nsg rule show \
    --resource-group "$RESOURCE_GROUP" \
    --nsg-name "$nsg_name" \
    --name "$rule_name" >/dev/null 2>&1; then
    echo "Updating NSG rule '$rule_name' in '$nsg_name'"
    az network nsg rule update \
      --resource-group "$RESOURCE_GROUP" \
      --nsg-name "$nsg_name" \
      --name "$rule_name" \
      --priority "$priority" \
      --direction "$direction" \
      --access Allow \
      --protocol '*' \
      --source-address-prefixes "$source_prefix" \
      --source-port-ranges '*' \
      --destination-address-prefixes "$destination_prefix" \
      --destination-port-ranges '*' >/dev/null
  else
    echo "Creating NSG rule '$rule_name' in '$nsg_name'"
    az network nsg rule create \
      --resource-group "$RESOURCE_GROUP" \
      --nsg-name "$nsg_name" \
      --name "$rule_name" \
      --priority "$priority" \
      --direction "$direction" \
      --access Allow \
      --protocol '*' \
      --source-address-prefixes "$source_prefix" \
      --source-port-ranges '*' \
      --destination-address-prefixes "$destination_prefix" \
      --destination-port-ranges '*' >/dev/null
  fi
}

upsert_postgres_firewall_rule() {
  local ip="$1"

  if az postgres flexible-server firewall-rule show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$POSTGRES_SERVER" \
    --rule-name "$POSTGRES_RULE_NAME" >/dev/null 2>&1; then
    echo "Updating PostgreSQL firewall rule '$POSTGRES_RULE_NAME'"
    az postgres flexible-server firewall-rule update \
      --resource-group "$RESOURCE_GROUP" \
      --name "$POSTGRES_SERVER" \
      --rule-name "$POSTGRES_RULE_NAME" \
      --start-ip-address "$ip" \
      --end-ip-address "$ip" >/dev/null
  else
    echo "Creating PostgreSQL firewall rule '$POSTGRES_RULE_NAME'"
    az postgres flexible-server firewall-rule create \
      --resource-group "$RESOURCE_GROUP" \
      --name "$POSTGRES_SERVER" \
      --rule-name "$POSTGRES_RULE_NAME" \
      --start-ip-address "$ip" \
      --end-ip-address "$ip" >/dev/null
  fi
}

main() {
  require_command az
  require_command curl

  ensure_logged_in
  ensure_resource_group

  local public_ip
  public_ip="$(resolve_public_ip)"

  echo "Public IPv4 detected: $public_ip"
  echo "Target resource group: $RESOURCE_GROUP"

  mapfile -t nsg_names < <(
    az network nsg list \
      --resource-group "$RESOURCE_GROUP" \
      --query "[].name" \
      --output tsv
  )

  if [[ "${#nsg_names[@]}" -eq 0 ]]; then
    echo "No NSGs found in '$RESOURCE_GROUP'."
  else
    for nsg_name in "${nsg_names[@]}"; do
      echo "Processing NSG: $nsg_name"

      upsert_nsg_rule \
        "$nsg_name" \
        "$INBOUND_RULE_NAME" \
        "Inbound" \
        "$INBOUND_PRIORITY" \
        "$public_ip" \
        "*"

      upsert_nsg_rule \
        "$nsg_name" \
        "$OUTBOUND_RULE_NAME" \
        "Outbound" \
        "$OUTBOUND_PRIORITY" \
        "*" \
        "$public_ip"
    done
  fi

  upsert_postgres_firewall_rule "$public_ip"

  echo "Done. NSG and PostgreSQL rules have been applied."
}

main "$@"
