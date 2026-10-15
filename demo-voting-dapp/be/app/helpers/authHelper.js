const db = require("../models");

const User = db.user;
const Role = db.role;

exports.userHasRole=async function userHasRole(userId, role) {
    const user = await User.findById(userId).exec();
    const roles = await Role.find({_id: {$in: user.roles}}).exec();

    for (let i = 0; i < roles.length; i++) {
        if (roles[i].name === role) {
            return true;
        }
    }
    return false;
}