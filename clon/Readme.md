### Usage Instructions for Okta Tenant Clone Scripts

#### Requirements:
- [Terraform](https://developer.hashicorp.com/terraform/install) installed
- [Terraformer](https://github.com/GoogleCloudPlatform/terraformer#installation) installed
- [Node.js](https://nodejs.org/en/download) installed

#### Setup:

1. Make sure the scripts are executable:
    ```
    chmod +x clone.sh envexport.sh
    ```

2. Edit `envexport.sh` with your Okta tenant information to clone:
    ```
    # envexport.sh
    export OKTA_ORG_NAME="your-okta-org-name"
    export OKTA_BASE_URL="https://your-okta-org-url"
    export OKTA_API_KEY="your-okta-api-key"
    ```

#### Usage:

1. **Run Full Clone:**
    ```
    ./clone.sh
    ```
    - This creates a clone folder named `clone` containing replicas of supported Okta resources.
    - If already existe a clone folder the bash request a permision to remplace the folder for one new

2. **Set the enviroment of the tenant to create the new resources:**

    - Open main.tf into the clone folder and set the values for the new tenant
    ```
    org_name  = "OKTA_ORG_NAME"
    api_token = "OKTA_API_TOKEN"
    base_url  = "OKTA_BASE_URL"
    ```

3. **Create the resource:**
    - When the bash finishes creating the clone, the result is a Terraform project made with modules and it can use all the commands that provide Terraform

    3.1. **Initialize All Modules:**
    ```
    terraform init
    ```
    - This command should be run the first time when the clone is created.

    3.2 **Plan all changes:**
    ```
    terraform plan
    ```
    - This command helps to show all the resources to create.

    3.2 **Applay all changes:**
    ```
    terraform apply
    ```
    - This command helps to create all the resources for the new tenant.

    3.3. **Plan Changes for Specific Module:**
    ```
    terraform plan -target="module.<name_module>"
    ```
    - This command helps to show the resources that will be created for these specific modules.
    - <name_module> can be found in the main.tf file, this file, has all the declarations of modules.

    3.4. **Apply Changes for Specific Module:**
    ```
    terraform apply -target="module.<name_module>"
    ```
    - This command helps to create the resources that will be created for these specific modules.
    - <name_module> can be found in the main.tf file, this file, has all the declarations of modules.

#### Note:

- Ensure you have the correct permissions and configurations set in your Okta account.
- Each clone operation remplace a new files if already exist a clone, and scripts prompt for the desired if you want to continue or cancel de process.
- Review and update the `envexport.sh` file with your Okta tenant information before running the scripts.
- If you use windows, you need to use gitbash in order to run de scripts correctly 