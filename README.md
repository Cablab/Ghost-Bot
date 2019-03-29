# Ghost-bot
A Discord Bot for my Destiny 2 clan's Discord server.

## Using manifest.js
The Destiny 2 API apparently now has 2 different versions of their manifest. If you hit the standard https://www.bungie.net/Platform/Destiny2/Manifest/ path, the "mobileWorldContentPaths" object will give you paths to hit (in the respective languages) to download the manifest as a single zip file (though its extention will be .content, it is a zip file). Other guides mention to unzip this file, then use the sqlite3 file inside (again, it'll be listed as .content, but it is actually a .sqlite3 file after unzipping).

However, there now also exists a "jsonWorldContentPaths" object that will give you paths to hit (in the respective languages) to return the entire manifest as one single JSON object. 

My manifest.js file uses this second method, grabs the english JSON manifest object, runs it through JSON.stringify(), runs it through a method that escapes certain characters, then puts the data into a MySQL database. The database has a table for each top-level Definition in the manifest, and each table has records relating the hash value of an entity to its entire JSON object value.

To use this file the way I have it set up, you **MUST**:
- Have a local MySQL database setup
- Set the correct properties for your database in the mysql.createConnection()
- Have a table in the database you're using called "path" with field "latest"
- Have some record in the "path" table

The last two bullet points are necessary because this file is assuming that some version of the manifest is/was stored in the database previously, and path.latest stores the URL path from the "jsonWorldContentsPath" request when the database was last updated. If you want to force the database to update, just run a MySQL UPDATE to change the value in path.latest to some random string.
