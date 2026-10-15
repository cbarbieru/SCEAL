const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const authHelper=require('../helpers/authHelper.js');
const { TokenExpiredError } = jwt;

const catchError = (err, res) => {
    if (err instanceof TokenExpiredError) {
        return res.status(401).send({ message: "Unauthorized! Access Token was expired!" });
    }

    return res.sendStatus(401).send({ message: "Unauthorized!" });
}

verifyToken = (req, res, next) => {
    let token = req.session.token;

    if (!token) {
        return res.status(403).send({ message: "No token provided!" });
    }

    jwt.verify(token,
        config.secret, {},
        (err, decoded) => {
            if (err) {
                return catchError(err, res);
            }
            req.userId = decoded.id;
            next();
        });
};

isAdmin = async (req, res, next) => {
    const hasRole = await authHelper.userHasRole(req.userId, "admin");

    if (hasRole) {
        next();
    } else {
        res.status(403).send({message: "Requires Admin Role!"});
    }
};

getUserIdIfLoggedIn = (req) => {
    return new Promise(function(resolve, reject) {
        let token = req.session.token;

        if (!token) {
            resolve(undefined);
        }

        jwt.verify(token,
            config.secret, {},
            (err, decoded) => {
                if (err) {
                    reject(err);
                }
                resolve(decoded.id);
            });
    });
};

const authJwt = {
    verifyToken,
    isAdmin,
    getUserIdIfLoggedIn
};
module.exports = authJwt;