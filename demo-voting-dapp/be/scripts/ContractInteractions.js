const { ethers, JsonRpcProvider } = require('ethers');
require('dotenv').config()

const apiURL = `${process.env.PLAYGROUND_API_URL}`;
console.log('API URL:' + apiURL);

const playgroundProvider = new JsonRpcProvider(apiURL);

// Signer
const signer = new ethers.Wallet(`${process.env.PRIVATE_KEY}`, playgroundProvider);

var contract = require("../app/artifacts/contracts/Vote.sol/Vote.json");

const voteContract = new ethers.Contract(`${process.env.VOTECONTRACT_ADDRESS}`, contract.abi, signer);

commit = async function (userElHash, candidateHash) {
    try {
        await voteContract.commit(userElHash, candidateHash);
    }
    catch (err) {
        console.log('Error in commit function: ' + err);
    }
}

reveal = async function (userElHash, candidate, secret) {
    try {
        await voteContract.reveal(userElHash, candidate, secret);
    }
    catch (err) {
        console.log('Error in reveal function: ' + err);
    }
}

getVote = async function (userElectionHash) {
    try {
        var candidateHash = await voteContract.getVote(userElectionHash);
        return candidateHash;
    }
    catch (err) {
        console.log('Error in getVote function: ' + err);

        if(err.code=="CALL_EXCEPTION" && err.reason=="Not yet commited"){
            return "No vote";
        }
    }
}

const getElection = async function () {
    try {
        var electionId = await voteContract.getElection();
        return electionId;
    }
    catch (err) {
        console.log('Error in getElection function: ' + err);
    }
}

async function main() {
    // const message = await auctionContract.getState();
    // console.log("The state is: " + message);
    // const tx=await auctionContract.start_auction();
    // await tx.wait();
    // const message2 = await auctionContract.getState();
    // console.log("The updated state is: " + message2);
    //await setElection("660922c007b02afcfa2ca648");
   // var electionId = await getElection();
   const userElHash=ethers.solidityPackedKeccak256(['string'],["6613f9e4230ac3fc605885de"+"660922c007b02afcfa2ca648"]);
   var response=await reveal(userElHash,"65f472ebf3059af2327c3b70","H0wcS6");

    console.log("reveal response: " + response);
    //  const tx=await voteContract.getVote(ethers.encodeBytes32String("lala"));
    //  console.log("vote: " + tx);

    // await tx.wait();
    // const message2 = await voteContract.getState();
}

main();

/*
Error in reveal function: Error: execution reverted: "Already commited and revealed" 
(action="estimateGas", data="0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001d416c726561647920636f6d6d6974656420616e642072657665616c6564000000", reason="Already commited and revealed", transaction={ "data": "0x3e92eac5b1f52bd0bad32f502a98c6fe079cef34808a75ce1b30f6bcea2c9552957266eb000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000183635663437326562663330353961663233323763336237300000000000000000000000000000000000000000000000000000000000000000000000000000000b483077635336c2a32e344e000000000000000000000000000000000000000000", "from": "0x3E71b0F1Bb49B8D516f0F57122039EA59E6F9336", "to": "0xbEE89573A7b555080bc7B0148F90ca3EB4F62bA4" },
invocation=null, revert={ "args": [ "Already commited and revealed" ], "name": "Error", "signature": "Error(string)" }, 
code=CALL_EXCEPTION, version=6.11.1)
*/

/*
Error in reveal function: Error: execution reverted: "Hash doesn't match"
 (action="estimateGas",
  data="0x08c379a0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000124861736820646f65736e2774206d617463680000000000000000000000000000", 
  reason="Hash doesn't match", 
  transaction={ "data": "0x3e92eac5106c738b84478bf117b0ddbb548209fc293455f1d5d070a4b738d73be9751398000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000018363566343732656266333035396166323332376333623730000000000000000000000000000000000000000000000000000000000000000000000000000000064830776353360000000000000000000000000000000000000000000000000000", "from": "0x3E71b0F1Bb49B8D516f0F57122039EA59E6F9336", "to": "0xbEE89573A7b555080bc7B0148F90ca3EB4F62bA4" }, invocation=null, revert={ "args": [ "Hash doesn't match" ], "name": "Error", "signature": "Error(string)" }, code=CALL_EXCEPTION, version=6.11.1)

*/