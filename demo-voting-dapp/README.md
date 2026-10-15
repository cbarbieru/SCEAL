# Online Voting System with Ethereum Integration

This project is a full-stack online voting application that ensures vote integrity using a **Commit-Reveal scheme** on an Ethereum-compatible blockchain. It consists of a Node.js/Express backend (`be/`) and a React/Vite frontend (`fe/`).

## Project Overview

- **Blockchain Layer**: Uses a Solidity smart contract (`Vote.sol`) deployed on an OP Stack-based playground. Votes are first "committed" (as a hash of the candidate and a secret) and later "revealed" to be counted.
- **Backend**: An Express.js server that manages user authentication (JWT + Cookies), election data (MongoDB/Mongoose), and orchestrates blockchain interactions. It features a transaction parallelization strategy using a pool of funded wallets (10 by default, `WALLET_POOL_SIZE`) to handle concurrent votes.
- **Frontend**: A modern React application built with Vite and Material UI (MUI), providing a dashboard for users to view elections, cast votes, and see results.

## Tech Stack

- **Frontend**: React, Vite, Material UI, ApexCharts, React Router, Axios.
- **Backend**: Node.js, Express, MongoDB (Mongoose), ethers.js, JWT, bcryptjs.
- **Blockchain**: Solidity, Hardhat, OpenZeppelin.
- **Infrastructure**: Docker support, Ethereum RPC (OP Stack).

To build the Docker images and deploy the app on the Kubernetes test bed, see the [root README](../README.md#4-demo-voting-dapp).

## Getting Started

### Prerequisites

- Node.js > 20
- MongoDB instance
- Access to an Ethereum RPC node (or local Hardhat node)

### Backend (`be/`)

1.  **Install dependencies**:
    ```bash
    cd be
    npm install
    ```
2.  **Configuration**: Create a `.env` file in the `be/` directory based on the usage in `hardhat.config.js` and `ethVote.interactions.js`.
    - `PLAYGROUND_API_URL`: RPC URL for the blockchain (also used by `hardhat.config.js`, defaults to `http://localhost:8545`).
    - `PRIVATE_KEY`: Main signer's private key.
    - `VOTECONTRACT_ADDRESS`: Address of the deployed `Vote.sol` contract (written to `.env` by the deploy script).
    - `MONGODB_URI`: Connection string for MongoDB (defaults to `mongodb://localhost:27017/voting_db`).
    - `COMMIT_REVEAL_SECRET`: Salt used for hashing votes.
    - `WALLET_POOL_SIZE` (optional, default 10): number of parallel sender wallets.
    - `NUM_USERS`, `OUTPUT_DIR`, `CREATE_USERS`, `SEED_ELECTION` (optional): used by `scripts/CreateUsers.js` / `entrypoint.sh`, see below.
3.  **Run Development Server**:
    ```bash
    npm run start-dev
    ```
4.  **Smart Contracts**:
    - Compile: `npx hardhat compile`
    - Deploy: `npm run deploy` (deploys to the 'playground' network)
    - Local Node: `npm run node`
5.  **Voters**: `node scripts/CreateUsers.js` creates `NUM_USERS` (default 501) users and the admin account, and writes the `userElHash;candidateHash` CSV used by the load test (plus a plaintext credentials CSV) to `OUTPUT_DIR` (default: this folder). It is idempotent. `node scripts/SeedTodayElection.js` creates the candidates and an election dated today (same ids as the voter hashes). In the Docker image `entrypoint.sh` runs the contract deployment and both scripts (`CREATE_USERS` / `SEED_ELECTION`, default `true`) before starting the server.

### Frontend (`fe/`)

1.  **Install dependencies**:
    ```bash
    cd fe
    npm install
    ```
2.  **Run Development Server**:
    ```bash
    npm run dev
    ```
3.  **Build for Production**:
    ```bash
    npm run build
    ```
    The built files will be located in `fe/dist` and are served by the backend in production mode.

## Architecture & Key Components

- **Commit-Reveal Flow**: 
    1.  User votes -> Backend computes `keccak256(candidateId + salt)`.
    2.  `commit(userElHash, candidateHash)` is called on the smart contract.
    3.  Vote is recorded in MongoDB as "committed".
    4.  Admin triggers Reveal -> Backend calls `reveal(userElHash, candidateId, salt)` for all votes.
- **Parallel Wallet Pool**: `ethVote.interactions.js` initializes `WALLET_POOL_SIZE` random wallets (default 10) and funds them from the `mainSigner`. This allows the backend to send that many transactions in parallel without hitting nonce issues or waiting for block confirmations sequentially.
- **Authentication**: Role-based access control (User, Admin, Moderator) implemented via `authJwt` middleware.

## Development Conventions

- **Surgical Updates**: When modifying the blockchain interaction layer, ensure the wallet pool logic remains intact.
- **Environment Variables**: Always check `be/.env` and `fe/` config before making changes to API endpoints or contract interactions.
- **Styling**: The frontend uses MUI (Material UI) with a custom theme located in `fe/src/theme/`.
- **API Routes**: Defined in `be/app/routes/`.
- **Database Models**: Defined in `be/app/models/`.
