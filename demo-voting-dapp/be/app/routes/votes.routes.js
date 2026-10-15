const controller = require("../controllers/votes.controller");
const { authJwt } = require("../middlewares");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });

    app.get("/api/votes", [authJwt.verifyToken], controller.getVotesOfUser);
    app.post("/api/elections/:id/vote", [authJwt.verifyToken], controller.electionVote);//route used by the FE for commiting
    app.post("/api/elections/vote", controller.voteForTests);//route used in tests for commiting
    app.post("/api/elections/:id/reveal", [authJwt.verifyToken, authJwt.isAdmin], controller.revealVotes)
};
