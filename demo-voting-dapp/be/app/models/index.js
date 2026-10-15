const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;

db.user = require("./user.model");
db.role = require("./role.model");
db.candidate = require("./candidate.model");
db.election = require("./election.model");
db.electionVote = require("./electionVote.model");

db.ROLES = ["user", "admin", "moderator"];
db.ELECTION_TYPES = ["presidential", "parliamentary", "europeanParliament", "local"];
db.ELECTION_FIND_OUT_MORE = {
    presidential: "https://ro.wikipedia.org/wiki/Alegeri_preziden%C8%9Biale_%C3%AEn_Rom%C3%A2nia,_2024",
    parliamentary: "https://ro.wikipedia.org/wiki/Alegeri_parlamentare_%C3%AEn_Rom%C3%A2nia,_2024",
    europeanParliament: "https://ro.wikipedia.org/wiki/Alegeri_pentru_Parlamentul_European_%C3%AEn_Rom%C3%A2nia,_2024",
    local: "https://ro.wikipedia.org/wiki/Alegeri_locale_%C3%AEn_Rom%C3%A2nia,_2024"
}

module.exports = db;
