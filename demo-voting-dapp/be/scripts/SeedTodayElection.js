const db = require("../app/models");
const dbConfig = require("../app/config/db.config");

const Election = db.election;
const Candidate = db.candidate;

// Same election id hardcoded in CreateUsers.js so the generated hashes match.
const electionId = "65f5c57b1e3a3e801733b338";

// Candidate ids taken from CreateUsers.js:32-33
const candidateIds = [
    "65f472ebf3059af2327c3b70",
    "65f473f6f3059af2327c3b77",
    "6606c8c154ab41105a49bf85",
    "6606ca8a54ab41105a49bf88",
    "6606cb8254ab41105a49bf89",
    "6606cc6054ab41105a49bf8a",
    "6606cd9454ab41105a49bf8b",
    "6606cf1954ab41105a49bf8c",
    "6606d1f654ab41105a49bf8d",
];

// Minimal placeholder data so the FE candidate cards render.
const parties = ["Party A", "Party B", "Party C", "Party D", "Party E", "Party F", "Party G", "Party H", "Party I"];
const buildCandidate = (id, index) => ({
    _id: id,
    name: `Candidate ${index + 1}`,
    party: parties[index % parties.length],
    partyUrl: "https://en.wikipedia.org/wiki/Political_party",
    details: "Placeholder candidate created for local testing.",
    born: new Date("1970-01-01"),
    previousExperience: "Local politics",
    candidatedBefore: "no",
    candidatedOn: "-",
    studies: "University",
    // FE reads `profession` (singular); model field is `professions`. Set both.
    profession: "Politician",
    professions: "Politician",
});

const seedCandidates = async () => {
    const existing = await Candidate.find({ _id: { $in: candidateIds } }, "_id").lean().exec();
    const existingIds = new Set(existing.map((c) => c._id.toString()));

    const toCreate = candidateIds
        .map((id, i) => ({ id, i }))
        .filter(({ id }) => !existingIds.has(id))
        .map(({ id, i }) => buildCandidate(id, i));

    if (toCreate.length) {
        await Candidate.insertMany(toCreate);
        console.log(`Created ${toCreate.length} candidate(s).`);
    } else {
        console.log("All candidates already exist.");
    }
};

const todayMidnight = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
};

const seed = async () => {
    await seedCandidates();

    // Keep only candidate ids that actually exist, so populate() has real docs
    // and the vote buttons render in the FE.
    const existing = await Candidate.find({ _id: { $in: candidateIds } }, "_id").lean().exec();
    const existingIds = existing.map((c) => c._id.toString());

    const missing = candidateIds.filter((id) => !existingIds.includes(id));
    if (missing.length) {
        console.warn(`Warning: ${missing.length} candidate id(s) not found and will be skipped:`);
        console.warn(missing.join("\n"));
    }

    if (existingIds.length === 0) {
        console.warn("No matching candidates found — the election will have an empty candidate list (no vote buttons).");
    }

    const result = await Election.updateOne(
        { _id: electionId },
        {
            $set: {
                year: new Date().getFullYear(),
                type: "presidential",
                round: 1,
                city: "-",
                date: todayMidnight(),
                revealed: false,
                candidates: existingIds,
            },
        },
        { upsert: true }
    );

    if (result.upsertedCount) {
        console.log(`Created election ${electionId} with today's date.`);
    } else {
        console.log(`Updated election ${electionId} to today's date.`);
    }
    console.log(`Candidates wired up: ${existingIds.length}`);
};

db.mongoose
    .connect(dbConfig.URI)
    .then(async () => {
        console.log("Connected to MongoDB.");
        let exitCode = 0;
        try {
            await seed();
        } catch (err) {
            console.error("Seed error:", err);
            exitCode = 1;
        } finally {
            await db.mongoose.disconnect();
            process.exit(exitCode);
        }
    })
    .catch((err) => {
        console.error("Connection error", err);
        process.exit(1);
    });
