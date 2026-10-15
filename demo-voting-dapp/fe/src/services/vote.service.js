import axios from "axios";

const API_URL = "/api";

const electionVote = (electionId, candidateId) => {
    return axios.post(`${API_URL}/elections/${electionId}/vote`, { candidateId }).then(response => response.data);
};

const getVotes = () => {
    return axios.get(`${API_URL}/votes`).then(response => response.data);
};

const revealVotes = (electionId) => {
    return axios.post(`${API_URL}/elections/${electionId}/reveal`).then(response => response.data);
}

const VoteService = {
    getVotes,
    electionVote,
    revealVotes
}

export default VoteService;