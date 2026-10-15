const controller = require("../controllers/election.controller");
const {authJwt} = require("../middlewares");

module.exports = function(app) {
    app.use(function(req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });

    app.get("/api/allElections", controller.allElections);
    app.get("/api/elections/:id", controller.getElectionById);
};
