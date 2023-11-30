#!/bin/bash

##Requires Terraform and Terraformer
#set environment variables
source envexport.sh

#########----------------------------------------------------#########
folder="backup-$(date +'%Y%m%d_%H%M%S')"
mkdir $folder
cat > $folder/main.tf << EOF
terraform {
  required_providers {
    okta = {
      source = "okta/okta"
      version = "4.6.1"
    }
  }
}

provider "okta" {
  org_name  = "$OKTA_ORG_NAME"
  api_token = "$OKTA_API_TOKEN"
  base_url  = "$OKTA_BASE_URL"
}
EOF
cd $folder
terraform init

#download tenant resources

if [ -z "$1"]; then
    op=$OKTA_ORG_NAME
else
    op=$1
fi

terraformer import okta --path-output="$op" --resources="*" --excludes=okta_user,okta_user_type,okta_user_schema,okta_template_sms
node ../tferparse.js "$op/okta"
echo "Downloaded tenant $OKTA_ORG_NAME"
echo "Saved to $folder/$op/"



