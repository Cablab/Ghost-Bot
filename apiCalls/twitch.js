const request = require("request");
const auth = require("../auth.json");

const ROOT_PATH = "https://api.twitch.tv";

var requestHeader =
{
    url: "",
    headers: {
        'Client-ID': auth.client_id
    }
};

var FindUserID = function (username) {
    return new Promise((resolve, reject) => {
        requestHeader["url"] = ROOT_PATH + "/helix/users?login=" + username;

        request(requestHeader, function (error, response, body) {
            if (!error && response.statusCode == 200) 
            {
                let results = JSON.parse(body);

                if (results["data"].length === 0)
                {
                    reject("Twitch user does not exist.");
                }
                else
                {
                    resolve(results["data"][0]["id"]);
                }
            }
            else {
                reject("HTTP FindUserID request failed:\n" + error);
            }
        });
    });
};

var FindLatestVideo = function (userID) {
    return new Promise((resolve, reject) => {
        requestHeader["url"] = ROOT_PATH + "/helix/videos?user_id=" + userID + "&first=1";

        request(requestHeader, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                let results = JSON.parse(body);

                if (results["data"].length === 0)
                {
                    reject("Twitch user has no videos");
                }
                else
                {
                    resolve(results["data"][0]["url"]);
                }
            }
            else {
                reject("HTTP FindLatestVideo request failed:\n" + error);
            }
        });
    });
};


var GetLatestVideo = async function (username) {
    let userID = await FindUserID(username);
    let url = await FindLatestVideo(userID);
    return url;
};

module.exports = 
{
    GetLatestVideo
}