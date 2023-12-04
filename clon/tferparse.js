const fs = require('fs');
const process = require('process');


//get resource directory list
const targetDir = process.argv[2];
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


const providerfile = 'terraform {\n\trequired_providers {\n\t\tokta = {\n\t\t\tsource = "okta/okta"\n\t\t}\n\t}\n}'

//process each directory
function updateProviders (){
    console.log('Updating provider files');
    directories.forEach(dir => {
        fs.writeFileSync(`${targetDir}/${dir.name}/provider.tf`, providerfile);
    });
}

//add modules to main.tf
function addModules(dependencies) {
    console.log('Adding modules to main.tf');
    let modulestr = '';
    directories.forEach(dir => {
        let deps = ''
        let variables = ''
        let variables_module = '';
        if(dependencies[dir.name]) {
            if(dependencies[dir.name].deps){
                deps = `depends_on = [`;
                dependencies[dir.name].deps.forEach(dependency => {
                    deps += `module.${dependency}, `;
                });
                deps = `${deps.substring(0,deps.length-2)}]\n`;
            }
            if(dependencies[dir.name].variables){
                dependencies[dir.name].variables.forEach(variable => {
                    variables += `${variable.split('.')[2]} = ${variable}\n`;
                    variables_module += 
`variable "${variable.split('.')[2]}" {
    default = ""
}\n\n`;
                });
            }
        };
        modulestr += 
`
module "${dir.name}" {
    source = "./${targetDir}/${dir.name}"
    ${variables}
    ${deps}
}`;
        if(variables_module !== ''){
            fs.writeFileSync(`${targetDir}/${dir.name}/variables.tf`,variables_module);
        }
    });
    fs.writeFileSync('main.tf', maintf+modulestr);
}

//create a respurce map for substitution given the resource name
function getMap(resource) {
    console.log(`Getting references to ${resource} resources`);
    let fileContent = getFileContent(`${targetDir}/${resource}/terraform.tfstate`);
    if(!fileContent) return {};
    removeTfState(resource);
    let resourceStateFile = JSON.parse(fileContent);
    let map = {};
    for (let [key, value] of Object.entries(resourceStateFile.modules[0].resources)) {
        //if(!key.startsWith(`${resource}.`)) continue;
        map[value.primary.id] = {
            tfname: key.replace(`${value.type}.`, ''),
            oktaname: value.primary.attributes.name,
            tftype: value.type
        };
    }
    return map;
}

//get resource maps
function getMaps(idsources) {
    let maps = {};
    idsources.forEach(source => {
        maps[source] = getMap(source);
    });
    return maps;
}

//remove some attributes from app respurces
function cleanup(resourceFile) {
    console.log('Removing user and client_id references')
    resourceFile = resourceFile.replace(/users\s*{[^}]*}/g, '');         //remove users block
    resourceFile = resourceFile.replace(/\s*client_id\s*=\s*"[^"]*"/g, ''); //remove client_id
    resourceFile = resourceFile.replace(/"\s*\${/g, '"$$${');  //escape $ in interpolation
    return resourceFile;
}

//parse all resources in a list
function parseResources(resources, maps) {
    let dependencyMap = {};
    resources.forEach(resource => {
        const filename = resource.replace('okta_', '');
        let resourceFile = getFileContent(`${targetDir}/${resource}/${filename}.tf`);
        if(!resourceFile) return;
        console.log(`Parsing ${resource}`);
        removeTfState(resource);
        if(resource.startsWith('okta_app')) resourceFile = cleanup(resourceFile);
        //let datastr = '';
        for(let[moduleName, map] of Object.entries(maps)) {
            for (let [key, value] of Object.entries(map)) {
                if(!resourceFile.includes(key)) continue;
                //datastr += `data "${value.tftype}" "${value.tfname}" {\n\tname = "${value.oktaname}"\n}\n\n`;
                //resourceFile = resourceFile.replaceAll(`"${key}"`, `data.${value.tftype}.${value.tfname}.id`);
                resourceFile = resourceFile.replaceAll(`"${key}"`, `var.${value.tftype}_${value.tfname}_id`);
                const searchregex = new RegExp(`"${key}\\\\"`, 'g');
                resourceFile = resourceFile.replaceAll(searchregex, `"\$\{var.${value.tftype}_${value.tfname}_id\}\\"`);
                if(!dependencyMap[resource]) dependencyMap[resource] = {variables:[],deps:[]};
                if(!dependencyMap[resource].deps.includes(moduleName)) dependencyMap[resource].deps.push(moduleName);
                if(!dependencyMap[resource].variables.includes(`module.${moduleName}.${value.tftype}_${value.tfname}_id`)) dependencyMap[resource].variables.push(`module.${moduleName}.${value.tftype}_${value.tfname}_id`);
            }
        }
        //fs.writeFileSync(`${targetDir}/${resource}/${filename}.tf`, datastr+resourceFile);
        fs.writeFileSync(`${targetDir}/${resource}/${filename}.tf`, resourceFile);
    });
    return dependencyMap;
}

function removeTfState(resource){
    try{
        fs.accessSync(`${targetDir}/${resource}/terraform.tfstate`);
        fs.unlinkSync(`${targetDir}/${resource}/terraform.tfstate`);
    }catch(err){}
}

//source of ids which will be replaced later when parsing (dependencies)
const idsources = [
    'okta_group',
    'okta_auth_server',
    'okta_auth_server_policy',
    'okta_policy_mfa',
    'okta_policy_password',
    'okta_policy_signon',
];

//resources which will have hardcoded reference ids replaced with data sources (dependants)
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

updateProviders();
const maps = getMaps(idsources);
const dependencies = parseResources(resourcesToParse, maps);
console.log(dependencies);
addModules(dependencies);












