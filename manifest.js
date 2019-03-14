var request = require("request");
var auth = require("./auth.json");
var mysql = require("mysql2");

const ROOT_PATH = "https://www.bungie.net/Platform";
const BASE_URL = "https://www.bungie.net"

/* REQUEST HEADER WITH API KEY */
var requestHeader =
{
    url: "",
    headers: {
        'X-API-Key': auth.X_API_Key
    }
};

var connection = mysql.createConnection({
    host: auth.host,
    user: auth.user,
    password: auth.password,
    database: auth.database,
    port: auth.port
});

// SIMPLE CONNECTION TEST
// connection.connect(function(err) {
//     if (err) { console.log(err.toString()); }
//     else { console.log("Connected!"); }
// });

// connection.query("SELECT * FROM path", function(error, results, fields) {
//     if (error) console.log(error.toString());
//     else (console.log(results[0].latest));
// });

// connection.end();



var FindManifestPath = function () 
{
    return new Promise((resolve, reject) => 
    {
        requestHeader["url"] = ROOT_PATH + "/Destiny2/Manifest/";

        request(requestHeader, function (error, response, body) 
        {
            if (!error && response.statusCode == 200) 
            {
                let results = JSON.parse(body);

                if (results["Response"] === undefined) 
                {
                    reject("FindManifestPath rejected the Promise");
                }
                else 
                {
                    //resolve(results["Response"]["mobileWorldContentPaths"]["en"]); // The zipped sqlite3 version of the english manifest
                    resolve(results["Response"]["jsonWorldContentPaths"]["en"]);
                }
            }
        });
    });
};

var FindJsonManifest = function (path) 
{
    return new Promise((resolve, reject) => 
    {
        requestHeader["url"] = BASE_URL + path;

        request(requestHeader, function (error, response, body) 
        {
            if (!error && response.statusCode == 200) 
            {
                let results = JSON.parse(body);
                resolve(results);
            }
            // else 
            // {
            //     reject("Failed to find manifest");
            // }
        });
    });
};

var RebuildManifestDB = function (jsonManifest) 
{
    return new Promise((resolve, reject) => 
    {
        connection.connect(function (err) 
        {
            if (err) { reject("Connection to database failed"); }
        });

        for (let definition in jsonManifest) 
        {
            let table = definition.toString();
            let createTable = "create table if not exists " + table + " (hash BIGINT NOT NULL UNIQUE, value JSON, PRIMARY KEY(hash))";
            connection.query(createTable);

            let deleteTableData = "delete from " + table;
            connection.query(deleteTableData);

            for (let hash in jsonManifest[table]) 
            {
                let jsonValue = JSON.stringify(jsonManifest[table][hash]);
                let replacedJson = mysql_real_escape_string(jsonValue);

                let addTableData = "insert into " + table + "(hash, value) values (" 
                                    + hash + ", \'" + replacedJson + "\')"; 

                connection.query(addTableData, function (error) 
                {
                    if (error) { console.log(addTableData); }
                });
            }

            // console.log(jsonManifest["DestinySandboxPerkDefinition"]);

            // console.log("\"" + table + "\"");
            // console.log(table);
        }
        resolve("Database built");
    });
};

var GetManifest = async function () 
{
    let path = await FindManifestPath();
    let manifest = await FindJsonManifest(path);
    let built = await RebuildManifestDB(manifest);

    return built;
};


GetManifest().then(results => {
    console.log(results);
}).catch(message => {
    console.log(message.toString());
}).finally(() => {
    connection.end();
});

function mysql_real_escape_string(str) 
{
    return str.replace(/[\0\x08\x09\x1a\n\r'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\" + char; // prepends a backslash to backslash, percent,
            // and double/single quotes
        }
    });
}











// async function CreateManifestDB(jsonManifest)
// {

//     let connected = await ConnectToManifestDB();
//     if (!connected)
//     {
//         return "Connection failed.";
//     }

//     for (let table in jsonManifest)
//     {
//         console.log(table);
//     }


//     connection.end();
// }


// function ConnectToManifestDB()
// {
//     connection.connect(function(err) {
//         if (err) 
//         { 
//             console.log(err.toString());
//             return false;
//         }
//         else 
//         { 
//             return true;
//         }
//     });
// }