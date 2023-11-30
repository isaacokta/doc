const fs = require('fs');
const process = require('process');
const { json } = require('stream/consumers');

//get resource directory list
const targetDir = process.argv[2];
const option = process.argv[3];
let directories = [];
try{
    directories = fs.readdirSync(targetDir, {withFileTypes: true}).filter(dirent => dirent.isDirectory());
}catch(err){
    if (err.code === 'ENOENT'){
        console.log(`Directory ${targetDir} not found`);
        process.exit(1);
    }else{
        throw err;
    }
}

function getFileContent(filename) {
    try{
        return fs.readFileSync(filename, 'utf8');
    }catch(err){
        if (err.code === 'ENOENT'){
            return null;
        }else{
            throw err;
        }
    }
}

let maintf = getFileContent('main.tf');

//get provider version
const versionPattern = /okta\s*=\s*{.*version\s*=\s*"([^"]+)".*}/s;
const providerVersion = versionPattern.exec(maintf)[1];
console.log(`Okta provider version: ${providerVersion}`);


const providerfile = `provider "okta" {
    version = "${providerVersion}"
  }
  
  terraform {
      required_providers {
          okta = {
            source = "okta/okta"
            version = "${providerVersion}"
          }
    }
  }`

//process each directory
function updateProviders (){
    console.log('Updating provider files');
    directories.forEach(dir => {
        fs.writeFileSync(`${targetDir}/${dir.name}/provider.tf`, providerfile);
    });
}

//remove some attributes from app respurces
function cleanup(resources) {
    resources.forEach(resource => {
        console.log(`Parsing ${resource}`)
        const filename = resource.replace('okta_', '');
        let resourceFile = getFileContent(`${targetDir}/${resource}/${filename}.tf`);
        if(!resourceFile) return;
        if(resource.startsWith('okta_app')) {
            resourceFile = resourceFile.replace(/"\s*\${/g, '"$$${');  //escape $ in interpolation
        }
        fs.writeFileSync(`${targetDir}/${resource}/${filename}.tf`, resourceFile);
    });
}

function cleanupClaims(){
    //Remove elments from resource
    let resourceFile = getFileContent(`${targetDir}/okta_auth_server_claim/auth_server_claim.tf`);
    const claimToRemove = ['address','birthdate','email','email_verified','family_name','gender','given_name','locale','middle_name','name','phone_number','picture','profile','zoneinfo', 'updated_at', 'nickname', 'preferred_username', 'website'];
    if(resourceFile){
        const resourceBlock = resourceFile.split(/(?=\bresource\b)/);
        const newResource = resourceBlock
        .filter((block) => {
            const matchName = block.match(/name\s*=\s*"([^"]+)"/);
            const resourceName = matchName && matchName[1];

            return !claimToRemove.includes(resourceName);
        })
        .join('');
        fs.writeFileSync(`${targetDir}/okta_auth_server_claim/auth_server_claim.tf`, newResource);
    }
    //Remove lements from tfsate
    resourceFile = getFileContent(`${targetDir}/okta_auth_server_claim/terraform.tfstate`);
    const itemsRemove = [];
    if(resourceFile){
        const objecttf = JSON.parse(resourceFile);
        objecttf.modules.forEach((module)=>{
            for (let key in module.resources){
                if(claimToRemove.includes(module.resources[key].primary.attributes.name)){
                    itemsRemove.push(key);
                    delete module.outputs[`${key.replace('.','_')}_id`];
                    delete module.resources[key];
                }
            }
        });
        const newResource2 = JSON.stringify(objecttf,null,2);
        fs.writeFileSync(`${targetDir}/okta_auth_server_claim/terraform.tfstate`, newResource2);
    }
    //Remove elements from outputs
    resourceFile = getFileContent(`${targetDir}/okta_auth_server_claim/outputs.tf`);
    if(resourceFile){
        const outputBlock = resourceFile.split(/(?=\boutput\b)/);
        const newOutput = outputBlock
        .filter((block) => {
            const matchName = block.match(/value\s*=\s*["']\${(.+?)}["']/);
            const outputName = `${matchName && matchName[1]}`.replace(".id","");

            return !itemsRemove.includes(outputName);
        })
        .join('');
        fs.writeFileSync(`${targetDir}/okta_auth_server_claim/outputs.tf`, newOutput);

    }
}

function cleanNetwork(){
    let resourceFile = getFileContent(`${targetDir}/okta_network_zone/network_zone.tf`);
    if(resourceFile){
        const resourceBlock = resourceFile.split(/(?=\bresource\b)/);
        const newResourceBlock = [];
        resourceBlock.forEach(item =>{
            const gatewaysArray = [];
            const locationArray = [];
            let nuevoContenido = item.replace(/gateways\s*{([^}]+)}/g, (_, gatewaysContent) => {
                gatewaysContent.split('\n')
                  .map(line => line.trim())
                  .filter(line => line !== '')
                  .map(line => {
                    line = line.replace(/type\s*=\s*"RANGE"/, '').replace(/value\s*=\s*"([^"]+)"/, '$1')
                    if(line !== undefined && line !== null && line !== '')
                        gatewaysArray.push(line);
                });
                return '';
              });
              nuevoContenido = nuevoContenido.replace(/dynamic_locations\s*{([^}]+)}/g, (_, locationContent) => {
                locationContent.split('\n')
                  .map(line => line.trim())
                  .filter(line => line !== '')
                  .map(line => {
                    line = line.replace(/country\s*=\s*"([^"]+)"/, '$1')
                    if(line !== undefined && line !== null && line !== '')
                        locationArray.push(line);
                });
                return '';
              });
              if(gatewaysArray.length !== 0 || locationArray.length !== 0){
                nuevoContenido = nuevoContenido.split('\n')
                    .map(line => line.trim())
                    .filter(line => line !== '').join('\n');
                const finalArray = [];
                nuevoContenido.split('\n').forEach((item,index,array)=>{
                    if(index == 0){
                        finalArray.push(item);
                        finalArray.push('');
                        if(gatewaysArray.length !== 0){
                            finalArray.push(`  gateways = ["${gatewaysArray.join('","')}"]`);
                            finalArray.push('');
                        }
                        if(locationArray.length !== 0){
                            finalArray.push(`  dynamic_locations = ["${locationArray.join('","')}"]`);
                            finalArray.push('');
                        }
                    }else{
                        if(array.length-1===index){
                            finalArray.push(`${item}\n`);
                        }else{
                            finalArray.push(`  ${item}`);
                        }
                    }
                })
                newResourceBlock.push(finalArray.join('\n'));
              }else{
                newResourceBlock.push(nuevoContenido);
              }
        });
        fs.writeFileSync(`${targetDir}/okta_network_zone/network_zone.tf`, newResourceBlock.join('\n'));
    }
}

const resourcesToParse = [
    'okta_app_auto_login',
    'okta_app_basic_auth',
    'okta_app_bookmark',
    'okta_app_oauth',
    'okta_app_saml',
    'okta_app_secure_password_store',
    'okta_app_swa',
    'okta_app_three_field',
    'okta_auth_server_claim',
    'okta_auth_server_policy',
    'okta_auth_server_policy_rule',
    'okta_auth_server_scope',
    'okta_group_rule',
    'okta_policy_mfa',
    'okta_policy_password',
    'okta_policy_rule_mfa',
    'okta_policy_rule_password',
    'okta_policy_rule_signon',
    'okta_policy_signon',
]

switch (option) {
    case "claim":
        cleanupClaims();
        break;
    case "network":
        cleanNetwork();
        break;
    default:
        updateProviders();
        cleanupClaims();
        cleanNetwork();
        cleanupSMS();
        cleanup(resourcesToParse);
        break;
}


