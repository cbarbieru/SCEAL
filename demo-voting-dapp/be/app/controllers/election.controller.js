const { authJwt } = require("../middlewares");
const db = require("../models");
const authHelper = require('../helpers/authHelper');
require('dotenv').config()
const Election = db.election;
const ElectionVote = db.electionVote;
const ELECTION_FIND_OUT_MORE = db.ELECTION_FIND_OUT_MORE;

const withoutTime = fullDate => {
    const date = new Date(fullDate);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
};

const isToday = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();

    return date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();
}

const getAge = (born) => {
    const today = new Date();
    const birthDate = new Date(born);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

exports.allElections = async (req, res) => {
    const elections = await Election.find().sort('-date').populate("candidates", "-__v").exec();

    const today = withoutTime(new Date());

    const futureElections = elections.filter((election) => withoutTime(election.date) > today).sort((x, y) => withoutTime(x.date) - withoutTime(y.date));
    const todaysElections = elections.filter((election) => withoutTime(election.date) === today);

    const typedElections = {
        future: futureElections,
        today: todaysElections,
        findOutMore: ELECTION_FIND_OUT_MORE
    };

    res.status(200).send(typedElections);
};

exports.getElectionById = async (req, res) => {
    const userId = await authJwt.getUserIdIfLoggedIn(req);
   
    const election = await Election.findOne({ _id: req.params['id'] }).populate("candidates").lean().exec();
    election.candidates = election.candidates.map(({ born, ...candidate }) => ({
        ...candidate,
        born: born,
        age: getAge(born)
    }));

    let candidateIdVoted = undefined;
    if (userId) {
        const electionVoteForUser = await ElectionVote.findOne({ user: userId, election: election._id }).lean().exec();
        if (electionVoteForUser) {
            candidateIdVoted = electionVoteForUser.candidateVoted._id;
        }
    }

    if (election.revealed) {
        const totalVotesOfElection = await ElectionVote.countDocuments({ election: election._id });

        for (var i = 0; i < election.candidates.length; i++) {
            var noVotes = await ElectionVote.countDocuments({ election: election._id, candidateVoted: election.candidates[i]._id }).exec();
            election.candidates[i].percentage = noVotes * 100 / totalVotesOfElection;
        }
    }

    res.status(200).send({ ...election, candidateIdVoted: candidateIdVoted });
};