const mongoose = require("mongoose");


const ElectionVoteSchema = new mongoose.Schema({
    date: Date,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    election: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Election"
    },
    candidateVoted: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Candidate"
    },
});

ElectionVoteSchema.index({ user: 1, election: 1 }, { unique: true })

const ElectionVote = mongoose.model("ElectionVote", ElectionVoteSchema);

module.exports = ElectionVote;
