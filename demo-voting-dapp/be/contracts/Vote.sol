// SPDX-License-Identifier: MITs
pragma solidity ^0.8.9;

contract Vote {
    struct Commit {
        bytes32 voteHash;
        uint256 commitTime;
        bool revealed;
    }

    address private owner;

    modifier onlyByTheOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    mapping(bytes32 => Commit) commits;

    constructor() {
        owner = msg.sender;
    }

    function commit(
        bytes32 userElHash,
        bytes32 candidateHash
    ) public {

        Commit storage storedCommit = commits[userElHash];

        require(storedCommit.commitTime == 0, "Already committed");

        storedCommit.voteHash = candidateHash;
        storedCommit.commitTime = block.timestamp;
        storedCommit.revealed = false;
    }

    function reveal(
        bytes32 userElHash,
        string memory candidate,
        string memory secret
    ) public {

        Commit storage storedCommit = commits[userElHash];

        require(storedCommit.commitTime != 0, "Not committed yet");

        require(
            storedCommit.commitTime < block.timestamp,
            "Cannot commit and reveal in the same block"
        );

        require(!storedCommit.revealed, "Already commited and revealed");

        bytes32 formedHash = keccak256(
            abi.encodePacked(candidate, secret)
        );

        require(formedHash == storedCommit.voteHash, "Hash doesn't match");

        storedCommit.revealed = true;
    }

    function getVote(
        bytes32 userElHash
    ) public view returns (bytes32, uint256, bool) {

        Commit storage storedCommit = commits[userElHash];
        
        require(storedCommit.commitTime != 0, "Not yet commited");//no vote
        
        return (storedCommit.voteHash, storedCommit.commitTime, storedCommit.revealed);
    }
}
