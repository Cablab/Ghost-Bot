/* Required List */
var request = require("request");
var auth = require('./auth.json');
var mysql = require("mysql2");

/* GLOBAL VARIABLE */
const ROOT_PATH = "https://www.bungie.net/Platform";
const RACE_DEF = 'DestinyRaceDefinition';
const CLASS_DEF = 'DestinyClassDefinition';
const GENDER_DEF = 'DestinyGenderDefinition';

/* REQUEST HEADER WITH API KEY */
var requestHeader =
{
    url: "",
    headers: {
        'X-API-Key': auth.X_API_Key
    }
};

// Create a mysql pool connection
const pool = mysql.createPool(
{
    host: auth.host,
    user: auth.user,
    password: auth.password,
    database: auth.database,
    port: auth.port,
    waitForConnections: true,
    connectionLimit: 10,
});

// Resolves a promise with the destinyMembershipId for the specified 
// user on the specified platform. Rejects the promise if user DNE
var FindMemId = function (platformId, displayName) 
{
    return new Promise((resolve, reject) => 
    {
        requestHeader["url"] = ROOT_PATH + '/Destiny2/SearchDestinyPlayer/'
            + platformId + '/' + displayName + '/';

        request(requestHeader, function (error, response, body) 
        {
            if (!error && response.statusCode == 200) 
            {
                let results = JSON.parse(body);

                if (results["Response"].length === 0) 
                {
                    reject("FindMemId rejected the Promise");
                }
                else 
                {
                    resolve(results["Response"][0]['membershipId']);
                }
            }
        });
    });
};

// Resolves a promise with the specified user's characters on the specified 
// platform. Rejects the promise if the user DNE
var FindCharacters = function (platformId, membershipId) 
{
    return new Promise((resolve, reject) => 
    {
        requestHeader["url"] = ROOT_PATH + '/Destiny2/' + platformId
            + '/Profile/' + membershipId + '/?components=200';

        request(requestHeader, function (error, response, body) 
        {
            if (!error && response.statusCode == 200) 
            {
                let results = JSON.parse(body);

                if (results["Response"] === undefined) 
                {
                    reject("FindCharacters rejected the Promise");
                }
                else 
                {
                    let characterData = results["Response"]["characters"]["data"];
                    let i = 0;
                    let characters = [];
                    for (let character in characterData) 
                    {
                        characters[i] = characterData[character];
                        i++;
                    }
                    resolve(characters);
                }
            }
        });
    });
};

// Resolves a promise with what vendors are selling for the specified player
// on the given platform. Rejects the promise if the user or character DNE
var FindVendors = function (platformId, membershipId, characterId) 
{
    return new Promise((resolve, reject) => 
    {
        requestHeader["url"] = ROOT_PATH + '/Destiny2/' + platformId + '/Profile/'
            + membershipId + '/Character/' + characterId + '/Vendors/'
            + '?components=VendorSales';

        request(requestHeader, function (error, response, body) 
        {
            if (!error && response.statusCode == 200) 
            {
                let results = JSON.parse(body);

                if (results["Response"] === undefined) 
                {
                    reject("FindVendors rejected the Promise");
                }
                else 
                {
                    resolve(results);
                }
            }
        });
    });
};

// Resolves a promise with the manifest data for a hashed value. Rejects
// the promise if the entity type or hashed value DNE
var FindManifestHash = function (entityType, hashIdentifier) 
{
    return new Promise((resolve, reject) => 
    {
        let query = "SELECT value FROM " + entityType + " WHERE hash = " + hashIdentifier;

        pool.promise().query(query, function (error, results) 
        {
            if (error) 
            { 
                reject("Query failed:\n" + error); 
            }
            else 
            {
                resolve(results[0].value.displayProperties.name);
            }
        });
    });
};

// Uses the above API calls to return how many hours have been played
// across all characters for the specified user on the given platform
var GetHoursPlayed = async function (platformId, displayName) 
{
    let membershipId = await FindMemId(platformId, displayName);
    let characters = await FindCharacters(platformId, membershipId);

    return CalculateHours(characters);
};

// Uses the above API calls to return the current wares for every 
// vendor for the specified player on the given platform
var GetVendors = async function (platformId, displayName) 
{
    let membershipId = await FindMemId(platformId, displayName);
    let characters = await FindCharacters(platformId, membershipId);
    let characterId = await Object.keys(characters)[0].toString();

    // Getting vendors requires authentication!
    let vendorData = await FindVendors(platformId, membershipId, characterId);

    return vendorData;
};

// Returns character data with the de-hashed values for race, gender, and class
var GetCharactersWithDisplayNames = async function (platformId, displayName) 
{
    let membershipId = await FindMemId(platformId, displayName);
    let characters = await FindCharacters(platformId, membershipId);

    for (let character in characters) 
    {
        characters[character]["race"] = await FindManifestHash(RACE_DEF, characters[character]["raceHash"]);
        characters[character]["gender"] = await FindManifestHash(GENDER_DEF, characters[character]["genderHash"]);
        characters[character]["class"] = await FindManifestHash(CLASS_DEF, characters[character]["classHash"]);
    }

    return characters;
};

module.exports =
{
    FindMemId,
    FindCharacters,
    GetHoursPlayed,
    FindVendors,
    GetVendors,
    FindManifestHash,
    GetCharactersWithDisplayNames,
    PrintDetailedHours,
};


/* HELPER METHODS */

// Calculates the total number of hours played across all characters
function CalculateHours(characters) 
{
    let totalHours = 0;

    for (let i in characters) 
    {
        totalHours += parseInt(characters[i]["minutesPlayedTotal"], 10);
    }

    return totalHours = totalHours / 60;
}

// Prints the race, gender, class, and hours played for each character
// in the passed array. Finally, prints the total hours played.
function PrintDetailedHours(characters) 
{
    let totalHours = 0;
    let returnString = "```"

    for (let character in characters) 
    {
        let race = characters[character]["race"];
        let gender = characters[character]["gender"];
        let classType = characters[character]["class"];
        let hours = parseInt(characters[character]["minutesPlayedTotal"], 10) / 60;
        totalHours += hours;

        returnString += race + " " + gender + " " + classType + ": "
            + hours.toFixed(2) + " hours played.\n";
    }

    return returnString += "\nTotal: " + totalHours.toFixed(2) + " hours played.```";
}
