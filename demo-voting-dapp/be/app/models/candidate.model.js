const mongoose = require("mongoose");

const Candidate = mongoose.model(
    "Candidate",
    new mongoose.Schema({
        name: String,
        party: String,
        details: String,
        born: Date,
        previousExperience: String,
        candidatedBefore: String,
        candidatedOn: String,
        studies: String,
        professions: String,
        partyUrl: String
    })
);

module.exports = Candidate;
