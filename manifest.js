// Dependencies
var request = require("request");
var auth = require("./auth.json");
var mysql = require("mysql2");

// Global variables
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

// Create the mysql connection object
var connection = mysql.createConnection({
    host: auth.host,
    user: auth.user,
    password: auth.password,
    database: auth.database,
    port: auth.port
});

// Queries the Destiny 2 API to find the URL path for the 
// English JSON Manifest
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

// Finds and returns the entire Destiny 2 English
// JSON Manifest and returns it as a single JSON object
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
            else 
            {
                reject("Failed to find manifest");
            }
        });
    });
};

// Parses the Destiny 2 English JSON Manifest and places the 
// data into a MySQL database. A table is created for each
// top-level Definition group in the Manifest, then each
// object in a given group is added into that table as a record
// using the object's hash value as a key and the JSON contents
// as the 'value' field.
//
// In addition, a table is made to store the current Manifest
// URL path. This is used to check when to update the database.
var RebuildManifestDB = function (manifestPath, jsonManifest) 
{
    return new Promise((resolve, reject) => 
    {
        connection.connect(function (err) 
        {
            if (err) { reject("Connection to database failed"); }
        });

        // Update the path table with the most current Manifest URL path
        let insertPath = "update path set latest = \'" + manifestPath + "\'";
        connection.query(insertPath);

        for (let definition in jsonManifest) 
        {
            // Create a table corresponding to the name of each top-level group
            // if it doesn't already exist
            let table = definition.toString();
            let createTable = "create table if not exists " + table + " (hash BIGINT NOT NULL UNIQUE, value JSON, PRIMARY KEY(hash))";
            connection.query(createTable);

            // Delete any existing data in that table if that table already exists
            let deleteTableData = "delete from " + table;
            connection.query(deleteTableData);

            for (let hash in jsonManifest[table]) 
            {
                // Stringify each JSON object inside the top-level group and
                // escape any special characters
                let jsonValue = JSON.stringify(jsonManifest[table][hash]);
                let replacedJson = mysql_real_escape_string(jsonValue);

                // Insert each JSON object into its corresponding top-level table
                let addTableData = "insert into " + table + "(hash, value) values (" 
                                    + hash + ", \'" + replacedJson + "\')"; 

                connection.query(addTableData, function (error) 
                {
                    if (error) { console.log(addTableData); }
                });
            }
        }
        resolve("Rebuilding manifest database...");
    });
};

// Returns the Destiny 2 English JSON Manifest path
// that is stored in the database, or, if no path
// is currently stored, returns a string that will not
// match any live URL path
var FindManifestVersion = function () {
    return new Promise((resolve, reject) => 
    {
        connection.connect(function (err) 
        {
            if (err) { reject("Connection to database failed."); }
        });

        let pathQuery = "SELECT latest FROM path";
        let response = connection.promise().query(pathQuery,
            function (err, results, fields)
        {
            // Instead of rejecting if there is an error, resolve
            // with a string that will not match a live URL path
            if (err) { resolve("Error finding latest path."); }
            else { resolve(results[0]["latest"]); }
        });
    });
}

// Asynchronous driver method that uses the above functions
// to maintain the Destiny 2 JSON Manifest Database
var GetManifest = async function () 
{
    let currentPath = await FindManifestPath();
    let oldPath = await FindManifestVersion();

    if (oldPath.toString() === currentPath.toString()) 
    {
        return "Manifest is up to date";
    }
    else 
    {
        let manifest = await FindJsonManifest(currentPath);
        let built = await RebuildManifestDB(currentPath, manifest);
        return built;
    }
};

// Update the database
GetManifest().then(results => {
    console.log(results);
}).catch(message => {
    console.log(message.toString());
}).finally(() => {
    connection.end();
    console.log("Finished rebuilding manifest database");
});

// Export the usable GetManifest driver function
module.exports = 
{
    GetManifest
}


/* Helper methods */

// Takes a string as input and returns the same string
// with escpaed special characters
function mysql_real_escape_string(str) 
{
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
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
                // prepends a backslash to backslash, percent, and double/single quotes
                return "\\" + char; 
        }
    });
}
