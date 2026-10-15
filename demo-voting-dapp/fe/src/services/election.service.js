import axios from "axios";

const API_URL = "/api";

const getAllElections = () => {
  return axios.get(`${API_URL}/allElections`).then(response => response.data);
};

const getElectionById = (id) => {
  return axios.get(`${API_URL}/elections/${id}`).then(response => response.data);
};


const ElectionService = {
  getAllElections: getAllElections,
  electionById: getElectionById
}

export default ElectionService;