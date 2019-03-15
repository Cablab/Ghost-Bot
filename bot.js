var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var apiCalls = require('./apiCalls.js');

const INVALID_GUARDIAN = "Could not find that Guardian";

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

// Start bot
bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

// Receive messages
bot.on('message', function (user, userID, channelID, message, evt) {

    // Listen for messages that will start with `!`
    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];
       
        //args = args.splice(1);
        switch(cmd) {
            // !ping
            case 'ping':
                bot.sendMessage({
                    to: channelID,
                    message: 'Pong!'
                });
            break;
            
            // !hours
            case 'hours':
                // Switch based on platform
                switch(args[1])
                {
                    // !hours psn [displayName]
                    case 'psn':
                        apiCalls.GetCharactersWithDisplayNames("TigerPsn", args[2]).then((characters) => {
                            bot.sendMessage({
                                to: channelID,
                                message: apiCalls.PrintDetailedHours(characters)
                            });
                        }).catch(() => {
                            bot.sendMessage({
                                to: channelID,
                                message: INVALID_GUARDIAN
                            });
                        });
                    break;

                    // !hours pc [displayName#XXXX]
                    case 'pc':
                        apiCalls.GetCharactersWithDisplayNames("TigerBlizzard", encodeURIComponent(args[2])).then((characters) => {
                            bot.sendMessage({
                                to: channelID,
                                message: apiCalls.PrintDetailedHours(characters)
                            });
                        }).catch(() => {
                            bot.sendMessage({
                                to: channelID,
                                message: INVALID_GUARDIAN
                            });
                        });
                    break;

                    // !hours xbox [displayName]
                    case 'xbox':
                        apiCalls.GetCharactersWithDisplayNames("TigerXbox", args[2]).then((characters) => {
                            bot.sendMessage({
                                to: channelID,
                                message: apiCalls.PrintDetailedHours(characters)
                            });
                        }).catch(() => {
                            bot.sendMessage({
                                to: channelID,
                                message: INVALID_GUARDIAN
                            });
                        });
                    break;
                }
            break;

            // Any new commands go here
        }
    }
});
