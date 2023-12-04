#!/bin/bash

##Requires Terraform and Terraformer
#set environment variables
source envexport.sh

#########----------------------------------------------------#########
folder="clone"
if [ -d "$folder" ]; then
  read -p "The folder already exists. Do you want to continue and remplace the folder? (y/n): " choice
  if [ "$choice" != "y" ]; then
    echo "Process canceled."
    exit 1
  fi
  rm -rf "$folder"
fi

mkdir "$folder"
cd $folder

cat > main.tf << EOF
terraform {
  required_providers {
    okta = {
      source = "okta/okta"
      version = "4.6.1"
    }
  }
}

provider "okta" {
  #org_name  = "OKTA_ORG_NAME"
  #api_token = "OKTA_API_TOKEN"
  #base_url  = "OKTA_BASE_URL"
}
EOF
terraform init

#download tenant resources

terraformer import okta --path-output="resources" --resources="okta_policy_password,okta_policy_rule_password,okta_policy_password_default,okta_policy_mfa,okta_policy_rule_mfa,okta_policy_mfa_default,okta_policy_signon,okta_policy_rule_signon" --excludes=okta_user,okta_user_type,okta_user_schema

node ../tferparse.js "resources/okta"
