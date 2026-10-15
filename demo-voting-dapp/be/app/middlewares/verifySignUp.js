const db = require("../models");
const ROLES = db.ROLES;
const User = db.user;

checkDuplicatePINOrEmail = async (req, res, next) => {
    const userByPIN = await User.findOne({
        personalIdentificationNumber: req.body.pin
    }).exec();

    if (userByPIN) {
        res.status(400).send({message: "Failed! Personal Identification Number is already in use!"});
        return;
    }

    // Email
    const userByEmail = await User.findOne({
        email: req.body.email
    }).exec();


    if (userByEmail) {
        res.status(400).send({message: "Failed! Email is already in use!"});
        return;
    }

    next();
};

checkRolesExisted = (req, res, next) => {
    if (req.body.roles) {
        for (let i = 0; i < req.body.roles.length; i++) {
            if (!ROLES.includes(req.body.roles[i])) {
                res.status(400).send({
                    message: `Failed! Role ${req.body.roles[i]} does not exist!`
                });
                return;
            }
        }
    }

    next();
};

const verifySignUp = {
    checkDuplicatePINOrEmail,
    checkRolesExisted
};

module.exports = verifySignUp;
