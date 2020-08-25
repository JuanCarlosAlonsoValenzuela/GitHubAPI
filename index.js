let request = require("request");
const { resolve, format } = require("path");
const { Resolver } = require("dns");

const organizationName = "isa-group";
const apiKey = 'xxxxxxxxxxxxxxxxxxxxxxxxxxx'
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
            issues: body[i].open_issues,
            commits: `https://api.github.com/repos/${organizationName}/${body[i].name}/commits?page=`
        }
        totalIssues = totalIssues + repository.issues;
    result.push(repository); 
    }
    return result;
}

async function getCommits(repositories){
    let promises = [];
    
    length = repositories.length;
    for(let i=0; i<length; i++){
        let promise = new Promise((resolve, reject) => {
            request(
                {
                    uri: repositories[i].commits + 1,
                    json: true,
                    method: 'GET',
                    headers:{
                        'user-agent': 'node.js',
                        'Authorization' : 'Bearer ' + apiKey,
                        'cliend_id': 'JuanCarlosAlonsoValenzuela',
                    }
                },
                function(err, res, body){
                    if(err){
                        reject(err);
                    }else{
                        if(res.headers.link){
                            // Obtaining the last page containing elements
                            let lastPage = String(res.headers.link.split(',')[1].match(/=\d{1,}>/g));
                            lastPage = lastPage.substring(1, lastPage.length -1);

                            resolve(getLastPage(repositories[i].commits, lastPage));
                        }else{
                            let res = body.length;
                            if(isNaN(res)){
                                resolve("The repository is empty");
                            }else{
                                totalCommits = totalCommits + res;
                                resolve(res);
                            }
                        }
                        
                    }
                }
            )
        })
        promises.push(promise);
    }

    await Promise.all(promises).then((results) => {
        for(let i = 0; i<length; i++){
            repositories[i].commits = results[i];
        }
    })
    .catch((err) =>{
        console.log(err);
    });

    return repositories;
}

function getLastPage(uri, lastPage){
    return new Promise((resolve, reject) =>{
        request(
            {
                uri: uri + lastPage,
                json: true,
                method: 'GET',
                headers:{
                    'user-agent': 'node.js',
                    'Authorization' : 'Bearer ' + apiKey,
                    'cliend_id': 'JuanCarlosAlonsoValenzuela',
                }
            }, function(err, res, body){
                if(err){
                    reject(err);
                }else{
                    let res = (lastPage - 1)*30 + body.length;
                    totalCommits = totalCommits + res;
                    resolve(res);
                }
            })
    })
}

function printRepositories(repositories){
    length = repositories.length;
    console.log("Repositorios: (total:"+ length + ")");

    for(let i=0; i<length; i++){
        console.log("\t* " + repositories[i].name);
        console.log("\t\t- Número de issues abiertas: " + repositories[i].issues);
        console.log("\t\t- Número de commits: " + repositories[i].commits);
        console.log('\n');
    }
}

function execute(orgName){
    basicInformation(orgName).then(printBasicInformation).then(getRepositories).then(getCommits)
    .then(printRepositories)
        .then(()=>{ 
            console.log("Número de Issues (abiertas) en todos los repositorios: " + totalIssues);
            console.log("Número de commits en todos los repositorios: " + totalCommits);
            console.log('\n');
        });
}

execute(organizationName);

