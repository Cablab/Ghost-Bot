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
            if (!error && response.statusCode == 200) {
                let results = JSON.parse(body);
                resolve(results["data"][0]["id"]);
            }
            else {
                reject("HTTP request failed:\n" + error);
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
                let data =
                {
                    "title": results["data"][0]["title"],
                    "url": results["data"][0]["url"]
                }
                resolve(data);
            }
            else {
                reject("HTTP request failed:\n" + error);
            }
        });
    });
};


var GetLatestVideo = async function (username) {
    let userID = await FindUserID(username);
    let videoData = await FindLatestVideo(userID);
    return videoData;
};

module.exports = 
{
    GetLatestVideo
}