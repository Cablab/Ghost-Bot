/* Required List */
var request = require('request');
var auth = require('./auth.json');

/* GLOBAL VARIABLE */
const ROOT_PATH = "https://www.bungie.net/Platform";
const RACE_DEF = 'DestinyRaceDefinition';
const CLASS_DEF = 'DestinyClassDefinition';
const GENDER_DEF = 'DestinyGenderDefinition';

/* REQUEST HEADER WITH API KEY */
var requestHeader = {
    url: "",
    headers: 
    {
        'X-API-Key': auth.X_API_Key
    }
};

// Returns the destinyMembershipId for the specified user on the specified platform
var FindMemId = function (platformId, displayName) {
    return new Promise(resolve => {
        requestHeader["url"] = ROOT_PATH + '/Destiny2/SearchDestinyPlayer/'
            + platformId + '/' + displayName + '/';

        request(requestHeader, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                try {
                    let results = JSON.parse(body);
                    resolve(results["Response"][0]['membershipId']);
                }
                catch (err) {
                    resolve("Could not find that Guardian");
                }
            }
        });
    });
};

// Gets the specified user's characters on the specified platform
var FindCharacters = function (platformId, membershipId) {
    return new Promise(resolve => {
        requestHeader["url"] = ROOT_PATH + '/Destiny2/' + platformId
            + '/Profile/' + membershipId + '/?components=200';

        request(requestHeader, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                try {
                    let results = JSON.parse(body);

                    let characterData = results["Response"]["characters"]["data"];
                    let i = 0;
                    let characters = [];
                    for (let character in characterData) {
                        characters[i] = characterData[character];
                        i++;
                    }
                    resolve(characters);
                }
                catch (err) {
                    resolve("Could not find that Guardian");
                }
            }
        });
    });
};

// Returns what vendors are selling for the specified player on the given platform
var FindVendors = function (platformId, membershipId, characterId) {
    return new Promise(resolve => {
        requestHeader["url"] = ROOT_PATH + '/Destiny2/' + platformId + '/Profile/'
            + membershipId + '/Character/' + characterId + '/Vendors/'
            + '?components=VendorSales';

        request(requestHeader, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                try {
                    let results = JSON.parse(body);
                    resolve(results);
                }
                catch (err) {
                    resolve("Could not find that Guardian");
                }
            }
        });
    });
};

// Returns the json manifest response for an entity's hash value
var FindManifestHash = function (entityType, hashIdentifier) {
    return new Promise(resolve => {
        requestHeader["url"] = ROOT_PATH + '/Destiny2/Manifest/' + entityType + '/' + hashIdentifier + '/';

        request(requestHeader, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                let results = JSON.parse(body);
                resolve(results);
            }
        });
    });
};

// Uses the above API calls to return how many hours have been played
// across all characters for the specified user on the given platform
var GetHoursPlayed = async function (platformId, displayName) {
    try {
        let membershipId = await FindMemId(platformId, displayName);
        let characters = await FindCharacters(platformId, membershipId);

        return CalculateHours(characters);
    }
    catch (err) {
        return "Could not find that Guardian";
    }
};

// Uses the above API calls to return the current wares for every 
// vendor for the specified player on the given platform
var GetVendors = async function (platformId, displayName) {
    let membershipId = await FindMemId(platformId, displayName);
    let characters = await FindCharacters(platformId, membershipId);
    let characterId = await Object.keys(characters)[0].toString();

    // Getting vendors requires authentication!
    let vendorData = await FindVendors(platformId, membershipId, characterId);

    return vendorData;
};

// Returns character data with the de-hashed values for race, gender, and class
var GetCharactersWithDisplayNames = async function (platformId, displayName) {
    try {
        let membershipId = await FindMemId(platformId, displayName);
        let characters = await FindCharacters(platformId, membershipId);

        for (let character in characters) {
            let race = await FindManifestHash(RACE_DEF, characters[character]["raceHash"]);
            let gender = await FindManifestHash(GENDER_DEF, characters[character]["genderHash"]);
            let classType = await FindManifestHash(CLASS_DEF, characters[character]["classHash"]);

            characters[character]["race"] = race["Response"]["displayProperties"]["name"];
            characters[character]["gender"] = gender["Response"]["displayProperties"]["name"];
            characters[character]["class"] = classType["Response"]["displayProperties"]["name"];
        }

        return characters;
    }
    catch (err) {
        return "Could not find that Guardian";
    }
};

// Prints a detailed report of each character's race, gender, class, and hours
function PrintDetailedHours(characters) {
    let returnString = "```";
    let totalHours = 0;

    for (let character in characters) {
        let race = characters[character]["race"];
        let gender = characters[character]["gender"];
        let classType = characters[character]["class"];
        let hours = parseInt(characters[character]["minutesPlayedTotal"], 10) / 60;
        totalHours += hours;

        returnString += race + " " + gender + " " + classType + ": "
            + hours.toFixed(2) + " hours played.\n"
    }
    return returnString + "\nTotal: " + totalHours.toFixed(2) + " hours played.```";
}

// Export for easy use in bot.js
module.exports = {
    FindMemId,
    FindCharacters,
    GetHoursPlayed,
    FindVendors,
    GetVendors,
    FindManifestHash,
    GetCharactersWithDisplayNames,
    PrintDetailedHours
};

/* HELPER METHODS */

// Calculates the total number of hours played across all characters
function CalculateHours(characters) {
    let totalHours = 0;

    for (let i in characters) {
        totalHours += parseInt(characters[i]["minutesPlayedTotal"], 10);
    }

    return totalHours = totalHours / 60;
}