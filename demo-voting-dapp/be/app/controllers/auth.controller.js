const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const db = require("../models");
const {secret, expires_in: expiresIn} = require("../config/auth.config");
const {user: User, role: Role} = db;

exports.signup = async (req, res) => {
    const user = new User({
        personalIdentificationNumber: req.body.pin,
        password: bcrypt.hashSync(req.body.password, 8),
        name: req.body.name,
        email: req.body.email,
        region: req.body.region,
        city: req.body.city
    });

    await user.save();
    if (req.body.roles) {
        const roles = await Role.find(
            {
                name: {$in: req.body.roles},
            });

        user.roles = roles.map((role) => role._id);
        await user.save();
        res.send({message: "User was registered successfully!"});
    } else {
        const role = await Role.findOne({name: "user"});
        user.roles = [role._id];
        await user.save();
        res.send({message: "User was registered successfully!"});
    }
};

const wrongCredentials = (res) => {
    return res.status(401).send({
        accessToken: null,
        message: "Wrong credentials!"
    });
}

exports.signin = async (req, res) => {
    const user = await User.findOne({
        personalIdentificationNumber: req.body.pin,
    })
        .populate("roles", "-__v")
        .exec();

    if (!user) {
        return wrongCredentials(res);
    }

    const passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
    );

    if (!passwordIsValid) {
        return wrongCredentials(res);
    }

    const token = jwt.sign({ id: user.id },
        secret,
        {
            algorithm: 'HS256',
            allowInsecureKeySizes: true,
            expiresIn: expiresIn
        });

    const authorities = [];

    for (let i = 0; i < user.roles.length; i++) {
        authorities.push(user.roles[i].name.toLowerCase());
    }

    req.session.token = token;

    res.status(200).send({
        id: user._id,
        pin: user.personalIdentificationNumber,
        email: user.email,
        name: user.name,
        region: user.region,
        city: user.city,
        roles: authorities,
    });
};

exports.signout = async (req, res) => {
    try {
        req.session = null;
        return res.status(200).send({message: "You've been signed out!"});
    } catch (err) {
        this.next(err);
    }
};
