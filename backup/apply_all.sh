#!/bin/bash

#set environment variables
source envexport.sh

#########----------------------------------------------------#########

echo ""
options=("./backup-"*)
i=1
for option in "${options[@]}"; do
    echo "$i. "$option""
    ((i++))
done

read -p "Enter the number of the directory you want to select: " selection

if [[ "$selection" =~ ^[0-9]+$ ]] && [ "$selection" -ge 1 ] && [ "$selection" -le ${#options[@]} ]; then
    selected_directory="${options[$((selection-1))]}"
	current_path="$PWD"
	cd $selected_directory

	principal_dir=("okta_group" "okta_auth_server" "okta_auth_server_policy" "okta_policy_mfa_default" "okta_policy_mfa" "okta_policy_password_default" "okta_policy_password" "okta_policy_signon")

	for folder in "${principal_dir[@]}"; do
		echo $folder
		path_okta=$(find . -type d -name "$folder" -print -quit)

		if [ -n "$path_okta" ]; then
			echo "Processing $path_okta"
			cd "$path_okta" || exit
			$current_path/terraform2 init
			$current_path/terraform2 apply -auto-approve
			cd $current_path
		fi
	done

	second_dir=("okta_group_rule" "okta_policy_rule_password" "okta_policy_rule_signon" "okta_auth_server_scope" "okta_auth_server_claim" "okta_auth_server_policy_rule" "okta_app_auto_login" "okta_app_basic_auth" "okta_app_bookmark" "okta_app_oauth" "okta_app_saml" "okta_app_secure_password_store" "okta_app_swa" "okta_app_three_field" "okta_event_hook""okta_factor""okta_inline_hook" "okta_idp_oidc" "okta_idp_saml" "okta_idp_social" "okta_network_zone" "okta_template_sms" "okta_trusted_origin")
		
	for folder in "${second_dir[@]}"; do
		echo $folder
		path_okta=$(find . -type d -name "$folder" -print -quit)

		if [ -n "$path_okta" ]; then
			echo "Processing $path_okta"
			cd "$path_okta" || exit
			$current_path/terraform2 init
			$current_path/terraform2 apply -auto-approve
			cd $current_path
		fi
	done
else 
	echo "Invalid selection. Enter a number from 1 to ${#options[@]}."
fi