const { ethers } = require("ethers");

async function run() {
    console.log("Connecting...");
    const provider = new ethers.JsonRpcProvider("http://localhost:8545");
    const network = await provider.getNetwork();
    console.log("Connected to chain:", network.chainId.toString());
}

run().catch(console.error);
