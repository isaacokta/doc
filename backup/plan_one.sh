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

	oktaOptions=("./"*"/okta/"*)
	ir=1
	for oktaOption in "${oktaOptions[@]}"; do
		echo "$ir. $(basename "$oktaOption")"
		((ir++))
	done
	#"okta_auth_server_claim" "okta_network_zone" "okta_template_sms"
	read -p "Enter the number of the resource you want to select: " selectionres
	if [[ "$selectionres" =~ ^[0-9]+$ ]] && [ "$selectionres" -ge 1 ] && [ "$selectionres" -le ${#oktaOptions[@]} ]; then
    	selected_resource="${oktaOptions[$((selectionres-1))]}"
		echo "Processing $selected_resource"
		cd "$selected_resource" || exit
		$current_path/terraform2 init
		$current_path/terraform2 plan
		cd $current_path
	else 
		echo "Invalid selection. Enter a number from 1 to ${#oktaOptions[@]}."
	fi
else 
	echo "Invalid selection. Enter a number from 1 to ${#options[@]}."
fi