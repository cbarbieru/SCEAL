const mongoose = require("mongoose");

const User = mongoose.model(
    "User",
    new mongoose.Schema({
        personalIdentificationNumber: String,
        password: String,
        email: String,
        name: String,
        city: String,
        region: String,
        roles: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Role"
            }
        ]
    })
);

module.exports = User;
