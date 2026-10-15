const mongoose = require("mongoose");

const Election = mongoose.model(
    "Election",
    new mongoose.Schema({
        year: Number,
        type: String,
        round: Number,
        city: String,
        date: Date,
        revealed: { type: mongoose.Schema.Types.Boolean },
        candidates: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Candidate"
            }
        ]
    })
);

module.exports = Election;
