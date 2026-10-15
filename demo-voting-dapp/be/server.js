const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieSession = require("cookie-session");
require('dotenv').config()


const app = express();

// var corsOptions = {
//     origin: "http://localhost:3030",
//     credentials: true,
//     allowedHeaders: [
//       "Set-Cookie",
//       "Content-Type",
//       "Access-Control-Allow-Origin",
//       "Access-Control-Allow-Credentials",
//     ],
// };

// app.use(cors(corsOptions));

// parse requests of content-type - application/json
app.use(express.json());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

app.use(
    cookieSession({
        name: "online-voting-session",
        keys: ["SOME_RANDOM_SECRET"], // should use as secret environment variable
        httpOnly: true
    })
);
const fs = require('fs');
const feDistPath = path.resolve(__dirname, '../fe/dist');
const feIndexHtml = path.join(feDistPath, 'index.html');

// Have Node serve the files for our built React app
if (fs.existsSync(feDistPath)) {
    app.use(express.static(feDistPath));
}

const db = require("./app/models");
const dbConfig = require("./app/config/db.config");
const Role = db.role;

db.mongoose
    .connect(dbConfig.URI)
    .then(() => {
        console.log("Successfully connect to MongoDB.");
        initial();
    })
    .catch(err => {
        console.error("Connection error", err);
        process.exit();
    });

// simple route
// app.get("/", (req, res) => {
//     res.json({ message: "Welcome to the online voting application." });
// });
// routes
require('./app/routes/auth.routes')(app);
require('./app/routes/user.routes')(app);
require('./app/routes/election.routes')(app);
require('./app/routes/votes.routes')(app);

// All other GET requests not handled before will return our React app
if (fs.existsSync(feIndexHtml)) {
    app.get('*', (req, res) => {
        res.sendFile(feIndexHtml);
    });
} else {
    app.get('*', (req, res) => {
        res.status(404).json({ message: "Frontend files not found and API route not matched." });
    });
}

// set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});

async function initial() {
    let count = await Role.estimatedDocumentCount().exec();
    if (count === 0) {
        db.ROLES.forEach((role) => {
            new Role({
                name: role
            }).save()
                .then(() => console.log(`added '${role}' to roles collection`))
                .catch((err) => console.log("error", err));
        });
    }
}