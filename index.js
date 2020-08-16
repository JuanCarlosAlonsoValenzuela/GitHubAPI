let request = require("request");
const { resolve, format } = require("path");

const organizationName = "isa-group";
const apiKey = '81a5475bf7ef97ddb4b0d30603af9b5c756540b9'
let totalCommits = 0;
let totalIssues = 0;

let basicInformation = function(orgName){
    return new Promise((resolve, reject) => {

        const options = {
            method: 'GET',
            uri: 'https://api.github.com/orgs/' + orgName,
            json: true,
            headers: {
                'user-agent': 'node.js',
                'Authorization': apiKey
            },

        }
        request(options,
        function(err, res, body){
            if(err){
                reject(err);
            }else{
                const info = {
                    name: body.name,
                    description: body.description,
                    link: body.blog,
                    public_repos: body.public_repos
                };
                resolve(info);
            }
        })
    })
};

let printBasicInformation = function(basicInformation){
    console.log("Nombre: " + basicInformation.name);
    console.log("Nombre: " + basicInformation.description);
    console.log("Enlace: " + basicInformation.link);
    console.log('\n');

    return Math.ceil(basicInformation.public_repos/100);
}

let getRepositories = async function(nPages){
    let baseUri = `https://api.github.com/orgs/${organizationName}/repos?per_page=100&page=`;
    let page = 1;
    let options = {
        method: 'GET',
        uri: '',
        json: true,
        headers: {
            'user-agent': 'node.js',
            'Authorization': apiKey
        }

    }

    let promises = [];
    do{
        // Actualizamos el valor de la uri
        options.uri = baseUri + page;

        // Creamos una promesa y la añadimos a la lista
        let promise = new Promise((resolve, reject) => {
            request(options, 
                function(err, res, body){
                    if(err){
                        reject(err);
                    }else{
                        resolve(formatRepositories(body));      // Devuelve los repositorios como un objeto con propiedades name y n_issues
                    }
            })
        });

        // Añadimos la promesa a la lista de promesas
        promises.push(promise);
        page++;

    }while(page<=nPages);

    let r = [];
    // Ejecutamos todas las promesas
    await Promise.all(promises).then((results) => {
        r = results.flat();
    }).catch((err) => {
        console.log(err);
    })

    return r;
}

function formatRepositories(body){
    let result = [];
    length = body.length;
    for(let i=0; i<length; i++){
        let repository = {
            name: body[i].name,
            issues: body[i].open_issues
        }
        totalIssues = totalIssues + repository.issues;
    result.push(repository); 
    }
    return result;
}

function printRepositories(repositories){
    length = repositories.length;
    console.log("Repositorios: (total:"+ length + ")");

    for(let i=0; i<length; i++){
        console.log("\t* " + repositories[i].name);
        console.log("\t\t- Número de issues abiertas: " + repositories[i].issues);
        console.log('\n');
    }
}

function execute(orgName){
    basicInformation(orgName).then(printBasicInformation).then(getRepositories).then(printRepositories).
        then(()=>{ 
            console.log("Número de Issues (abiertas) en todos los repositorios: " + totalIssues);
        });
    
}

execute(organizationName);

