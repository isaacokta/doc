### Usage Instructions for Okta Tenant Backup Scripts

#### Requirements:
- [Terraform](https://developer.hashicorp.com/terraform/install) installed
- [Terraformer](https://github.com/GoogleCloudPlatform/terraformer#installation) installed
- [Node.js](https://nodejs.org/en/download) installed

#### Setup:

1. Make sure the scripts are executable:
    ```
    chmod +x backups.sh plan_all.sh apply_all.sh plan_one.sh apply_one.sh envexport.sh
    ```

2. Edit `envexport.sh` with your Okta tenant information:
    ```
    # envexport.sh
    export OKTA_ORG_NAME="your-okta-org-name"
    export OKTA_BASE_URL="https://your-okta-org-url"
    export OKTA_API_KEY="your-okta-api-key"
    ```

#### Usage:

1. **Run Full Backup:**
    ```
    ./backups.sh
    ```
    - This creates a backup folder named `backup-<timestamp>` containing replicas of supported Okta resources.

2. **Plan Changes for All Modules:**
    ```
    ./plan_all.sh
    ```
    - Iterates through all modules in the backup and checks for changes.

3. **Apply Changes for All Modules:**
    ```
    ./apply_all.sh
    ```
    - Applies changes from the backup to the Okta tenant.

4. **Plan Changes for Specific Resource:**
    ```
    ./plan_one.sh
    ```
    - Select the backup folder.
    - Choose the specific resource to plan changes for.

5. **Apply Changes for Specific Resource:**
    ```
    ./apply_one.sh
    ```
    - Select the backup folder.
    - Choose the specific resource to apply changes.

#### Note:

- Ensure you have the correct permissions and configurations set in your Okta account.
- Each backup operation creates a new folder, and scripts prompt for the desired backup folder when necessary.
- Review and update the `envexport.sh` file with your Okta tenant information before running the scripts.
- If you use windows, you need to use gitbash in order to run de scripts correctly 