const db = require("../models");
const User = db.user;

exports.allAccess = (req, res) => {
    res.status(200).send("Public Content.");
};

exports.loggedIn = (req, res) => {
    res.status(200).send("User is logged in.");
};

exports.accountDetails = async (req, res) => {
    const user = await User.findById(req.userId).exec();
    res.status(200).send(user);
};

exports.userBoard = (req, res) => {
    res.status(200).send("User Content.");
};

exports.adminBoard = (req, res) => {
    res.status(200).send("Admin Content.");
};

exports.moderatorBoard = (req, res) => {
    res.status(200).send("Moderator Content.");
};
