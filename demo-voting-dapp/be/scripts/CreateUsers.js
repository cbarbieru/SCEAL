require("dotenv").config();
const path = require("path");
const fs = require("fs");
const db = require("../app/models");
const { user: User, role: Role } = db;
const citiesByRegion = require('./orase-dupa-judet.min.json');
const randomString = require("randomstring");
const randomEmail = require("random-email");
const { uniqueNamesGenerator, starWars } = require("unique-names-generator");
const { ethers } = require('ethers');
const bcrypt = require("bcryptjs");

const dbConfig = require("../app/config/db.config");

const regions = Object.keys(citiesByRegion);
const noOfRegions = regions.length;

// Configuration (env), defaults match the previous hardcoded behaviour.
const NUM_USERS = parseInt(process.env.NUM_USERS || "501", 10);
// Where the CSVs are written; in k8s this is the host dir shared with the JMeter pod.
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.resolve(__dirname, "../..");
const PROVIDER = "playground";

const candidates = ['65f472ebf3059af2327c3b70', '65f473f6f3059af2327c3b77', '6606c8c154ab41105a49bf85', '6606ca8a54ab41105a49bf88', '6606cb8254ab41105a49bf89',
    '6606cc6054ab41105a49bf8a', '6606cd9454ab41105a49bf8b', '6606cf1954ab41105a49bf8c', '6606d1f654ab41105a49bf8d'];
const electionId = '65f5c57b1e3a3e801733b338';
// Must equal the BE's COMMIT_REVEAL_SECRET so the generated candidate hashes can be revealed.
const salt = process.env.COMMIT_REVEAL_SECRET || 'H0wcS6£.4N';

const randomNumber = function (minimum, maximum) {
    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

const connectWithRetry = async function (attempts = 12, delayMs = 5000) {
    for (let i = 1; i <= attempts; i++) {
        try {
            await db.mongoose.connect(dbConfig.URI);
            console.log("Successfully connect to MongoDB.");
            return;
        } catch (err) {
            console.error(`MongoDB connection failed (attempt ${i}/${attempts}): ${err.message}`);
            if (i === attempts) throw err;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
}

// Roles are normally created by server.js on first start, which runs after this script.
const ensureRoles = async function () {
    for (const name of db.ROLES) {
        if (!(await Role.exists({ name }))) {
            await new Role({ name }).save();
            console.log(`added '${name}' to roles collection`);
        }
    }
}

const generateUser = async function (role) {
    var pin = randomString.generate({
        charset: ['numeric'],
        length: 12
    });

    var password = randomString.generate({
        charset: ['numeric', '!', 'abcd'],
        length: 10
    });

    var name = uniqueNamesGenerator({
        dictionaries: [starWars],
        length: 1,
    });

    var email = randomEmail();
    var regionIndex = randomNumber(0, noOfRegions - 1);
    var region = regions[regionIndex];
    var cityIndex = randomNumber(0, citiesByRegion[region].length - 1);
    var city = citiesByRegion[region][cityIndex];

    const user = new User({
        personalIdentificationNumber: pin,
        password: bcrypt.hashSync(password, 8),
        name: name,
        email: email,
        region: region,
        city: city
    });

    user.roles = [role._id];
    var newUser = await user.save();

    return { id: newUser._id, pin: pin, password: password };
}

const generateHashes = async function (role) {
    const candidateId = candidates[randomNumber(0, 8)];
    var user = await generateUser(role);

    const userElHash = ethers.solidityPackedKeccak256(['string'], [user.id + electionId]);
    const candidateHash = ethers.solidityPackedKeccak256(['string', 'string'], [candidateId, salt]);

    return {
        csvLine: userElHash + ";" + candidateHash,
        noHashLine: "User id: " + user.id.toString() + ";" +
            "Pin: " + user.pin + ";" +
            "Pass: " + user.password + ";" +
            "Election id: " + electionId + ";" +
            "Candidate id: " + candidateId + ";" +
            "Salt: " + salt + ";" +
            "UserElHash: " + userElHash + ";" +
            "Candidate hash: " + candidateHash
    };
}

const generateUsers = async function (noOfUsers) {
    const role = await Role.findOne({ name: "user" });
    const csvLines = [];
    const noHashLines = [];

    for (var i = 0; i < noOfUsers; i++) {
        const { csvLine, noHashLine } = await generateHashes(role);
        csvLines.push(csvLine);
        noHashLines.push(noHashLine);
    }

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    // writeFile (not append) so a re-run never produces a corrupted, doubled CSV.
    fs.writeFileSync(csvPath(), csvLines.join("\n"));
    fs.writeFileSync(path.join(OUTPUT_DIR, `${PROVIDER}-no-hash-users-${noOfUsers}.csv`), noHashLines.join("\n"));
    console.log(`Created ${noOfUsers} users, CSVs written to ${OUTPUT_DIR}`);
}

const csvPath = function () {
    return path.join(OUTPUT_DIR, `${PROVIDER}-users-${NUM_USERS}.csv`);
}

const generateAdmin = async function () {
    const pin = "user-novotepin";
    if (await User.exists({ personalIdentificationNumber: pin })) {
        console.log("Admin user already exists.");
        return;
    }

    const adminRole = await Role.findOne({ name: "admin" });

    const user = new User({
        personalIdentificationNumber: pin,
        password: bcrypt.hashSync("snitel123", 8),
        name: "user-novotepin",
        email: "usernovote@onlinevoting.com",
        region: "-",
        city: "-"
    });

    user.roles = [adminRole._id];
    await user.save();
    console.log("Created admin user.");
}

const main = async function () {
    await connectWithRetry();
    await ensureRoles();

    // Idempotent: a BE restart must not duplicate voters (the CSV hashes embed the user ids).
    const userRole = await Role.findOne({ name: "user" });
    const existingUsers = await User.countDocuments({ roles: userRole._id });
    if (fs.existsSync(csvPath()) && existingUsers >= NUM_USERS) {
        console.log(`Found ${existingUsers} users and ${csvPath()}, skipping user creation.`);
    } else {
        await generateUsers(NUM_USERS);
    }

    await generateAdmin();
}

main()
    .then(async () => {
        await db.mongoose.disconnect();
        process.exit(0);
    })
    .catch(async (err) => {
        console.error("CreateUsers failed:", err);
        await db.mongoose.disconnect().catch(() => { });
        process.exit(1);
    });
