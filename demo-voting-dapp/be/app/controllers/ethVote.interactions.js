const { ethers, JsonRpcProvider } = require('ethers');
require('dotenv').config()

class EthersError extends Error {
    constructor(message) {
        super(message);
        this.name = "EthersError";
    }
}

class VoteInteraction {

    static instance;

    constructor(providerName) {
        var urls = new Map();

        urls["Playground"] = `${process.env.PLAYGROUND_API_URL}`;

        this.providerName = providerName;

        var apiURL = urls[providerName];
        console.log("api url:" + apiURL);

        this.provider = new JsonRpcProvider(apiURL);
        this.mainSigner = new ethers.Wallet(`${process.env.PRIVATE_KEY}`, this.provider);

        var contract = require("../../app/artifacts/contracts/Vote.sol/Vote.json");

        this.voteContract = new ethers.Contract(`${process.env.VOTECONTRACT_ADDRESS}`, contract.abi, this.mainSigner);

        this.wallets = [];
        this.walletIndex = 0;
        this.walletsInitialized = false;

        this.initWallets();
    }

    async initWallets() {
        const parsedSize = parseInt(process.env.WALLET_POOL_SIZE, 10);
        const poolSize = parsedSize >= 1 ? parsedSize : 10;
        console.log(`Initializing ${poolSize} parallel wallets...`);
        try {
            for (let i = 0; i < poolSize; i++) {
                const wallet = ethers.Wallet.createRandom().connect(this.provider);
                this.wallets.push(wallet);
            }

            for (let i = 0; i < this.wallets.length; i++) {
                const wallet = this.wallets[i];
                const balance = await this.provider.getBalance(wallet.address);
                if (balance < ethers.parseEther("0.1")) {
                    console.log(`Funding wallet ${i + 1}/${poolSize}: ${wallet.address} with 0.1 ETH`);
                    const tx = await this.mainSigner.sendTransaction({
                        to: wallet.address,
                        value: ethers.parseEther("0.1")
                    });
                    await tx.wait();
                }
            }
            this.walletsInitialized = true;
            console.log(`${poolSize} wallets funded and ready for parallel operations.`);
        } catch (err) {
            console.error("Error during parallel wallet initialization:", err);
        }
    }

    static getInstance(providerName) {
        if (!VoteInteraction.instance) {
            VoteInteraction.instance = new VoteInteraction(providerName);
        }
        return VoteInteraction.instance;
    }

    async ensureReady() {
        if (!this.walletsInitialized) {
            console.log("Waiting for parallel wallets to be ready...");
            while (!this.walletsInitialized) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }

    commit = async function (userElHash, candidateHash) {
        await this.ensureReady();

        const wallet = this.wallets[this.walletIndex];
        this.walletIndex = (this.walletIndex + 1) % this.wallets.length;

        try {
            await this.voteContract.connect(wallet).commit(userElHash, candidateHash);
        } catch (err) {

            console.log('Error in commit function: ' + err);

            var message = "Error code: " + err.code + "\n" + "Error message: ";

            if (err.shortMessage != null) {
                message += err.shortMessage;
            } else {
                message += err.message;
            }

            throw new EthersError(err.message);
        }
    }

    reveal = async function (userElHash, candidate, secret) {
        await this.ensureReady();

        const wallet = this.wallets[this.walletIndex];
        this.walletIndex = (this.walletIndex + 1) % this.wallets.length;

        try {
            await this.voteContract.connect(wallet).reveal(userElHash, candidate, secret);
        }
        catch (err) {
            console.log('Error in reveal function: ' + err);

            throw err;
        }
    }

    getVote = async function (userElectionHash) {
        try {
            var candidateHash = await this.voteContract.getVote(userElectionHash);
            return candidateHash;
        }
        catch (err) {
            console.log('Error in getVote function: ' + err);

            if (err.code == "CALL_EXCEPTION" && err.reason == "Not yet commited") {
                return "No vote";
            }
        }
    }
}

module.exports = {
    EthersError: EthersError,
    VoteInteraction: VoteInteraction
}