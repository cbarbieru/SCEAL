const db = require("../models");
const { ethers } = require('ethers');
require('dotenv').config()
const { EthersError, VoteInteraction } = require("./ethVote.interactions.js");
const Election = db.election;
const ElectionVote = db.electionVote;

const defaultProvider = `${process.env.CURRENT_PROVIDER}`;
const salt = `${process.env.COMMIT_REVEAL_SECRET}`;
const voteInteraction = VoteInteraction.getInstance(defaultProvider);

const isToday = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();

    return date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();
}

const voteRetAnswer = (status, message) => {
    return { status: status, message: message };
}

const findCandidateUsingChainHash = (hashFromChain, election) => {

    const foundCandidate = election.candidates
        .map(candidate => candidate._id.toString())
        .filter(id => ethers.solidityPackedKeccak256(['string', 'string'], [id, salt]) === hashFromChain);

    if (foundCandidate.length !== 1) {
        throw Error("Candidate saved in blockchain not found in election candidates");
    }
    return foundCandidate[0];
}

const vote = async function (electionId, candidateId, userId) {
    const election = await Election.findOne({ _id: electionId }).populate("candidates").lean().exec();

    if (!isToday(election.date)) {
        return voteRetAnswer(403, "You cannot vote in an election that's not today!");
    }

    const now = new Date();
    const utc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds());

    const electionVote = new ElectionVote({
        date: new Date(utc),
        user: userId,
        election: electionId,
        candidateVoted: candidateId
    });

    const userElHash = ethers.solidityPackedKeccak256(['string'], [userId + electionId]);
    const candidateHash = ethers.solidityPackedKeccak256(['string', 'string'], [candidateId, salt]);

    const alreadyVotedMsg = 'You have already voted for this election!';

    try {
        var userVoteInEth = await voteInteraction.getVote(userElHash);
        var userAlreadyVoted = userVoteInEth != "No vote";

        if (userAlreadyVoted) {
            // if vote is not saved in db, retry saving it
            const vote = await ElectionVote.findOne({ user: userId, election: electionId }).exec();
            if (!vote) {
                const candidateHashSavedInChain = userVoteInEth[0];
                const candidateIdFromChain = findCandidateUsingChainHash(candidateHashSavedInChain, election);
                const chainSavedElectionVote = new ElectionVote({
                    date: new Date(utc),
                    user: userId,
                    election: electionId,
                    candidateVoted: candidateIdFromChain
                });
                await chainSavedElectionVote.save();
            }
            return voteRetAnswer(403, alreadyVotedMsg);
        }

        await voteInteraction.commit(userElHash, candidateHash);
        await electionVote.save();

    } catch (err) {

        if (err && err.code !== 11000) {
            console.log(err);
            console.log(err.code);
            return voteRetAnswer(500, 'Another error showed up');
        }

        //duplicate key
        if (err && err.code === 11000) {
            return voteRetAnswer(403, alreadyVotedMsg);
        }
    }

    return voteRetAnswer(200, "Vote saved!");
}

//called from the FE
exports.electionVote = async (req, res) => {
    const electionId = req.params['id'];
    const candidateId = req.body.candidateId;
    const userId = req.userId;

    var voteRetAnswer = await vote(electionId, candidateId, userId);

    res.status(voteRetAnswer.status).send(voteRetAnswer.message);
};

//for testing
exports.voteForTests = async (req, res) => {
    const candidateHash = req.body.candidateHash;
    const userElHash = req.body.userElHash;

    try {

        await voteInteraction.commit(userElHash, candidateHash);

        res.status(200).send("Vote commited!");

    } catch (err) {

        if (err) {
            if (err instanceof EthersError) {
                var message = "An ethers.js specific error occured.\n " + err.message;
                res.status(513).send(message);
            }

            else {
                var message = "An error occured.\n" + err.message;
                res.status(500).send(message);
            }

            return;
        }
    }
}

exports.revealVotes = async (req, res) => {
    const electionId = req.params['id'];

    const votes = await ElectionVote.find({ election: electionId })
        .populate("candidateVoted")
        .populate("election")
        .lean().exec();

    const possibleRevealErrors = ["Not committed yet", "Cannot commit and reveal in the same block", "Already commited and revealed"];

    for (var i = 0; i < votes.length; i++) {

        try {
            var currVote = votes[i];
            var userId = currVote.user.toString();

            const userElHash = ethers.solidityPackedKeccak256(['string'], [userId + electionId]);
            var candidateId = currVote.candidateVoted._id.toString();

            await voteInteraction.reveal(userElHash, candidateId, salt);

        } catch (err) {
            if (err) {
                if (err.code && err.code == "CALL_EXCEPTION" && !possibleRevealErrors.includes(err.reason)) {
                    console.log('Something happened while trying to reveal ' + err);
                    console.log("Retry revealing vote for user id " + userId + " and election: " + electionId);

                    await voteInteraction.reveal(userElHash, candidateId, salt);//retry reveal
                }

                if (err.code && err.code == "CALL_EXCEPTION" && err.reason == "Already commited and revealed") {
                    console.log("Vote already commited and revealed for user id " + userId + " and election: " + electionId);
                }
            }
        }
    }

    await Election.updateOne({ _id: electionId }, { revealed: true });

    res.status(200).send("Votes revealed!");
}

exports.getVotesOfUser = async (req, res) => {
    const userId = req.userId;

    const votes = await ElectionVote.find({ user: userId })
        .populate("candidateVoted")
        .populate("election")
        .lean().exec();
    res.status(200).send(votes);
};