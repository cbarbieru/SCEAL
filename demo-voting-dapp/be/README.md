# Online Voting - Backend

## Intro
The backend is a Node.js/Express application that serves as the orchestration layer for the online voting system. It manages user authentication (JWT), MongoDB data persistence (elections, candidates, and votes), and integrates with Ethereum-compatible blockchains (OP Stack) via ethers.js. It handles the secure commit-reveal voting process, ensuring each vote is cryptographically verifiable on-chain.

## Deploy
Building the image and deploying it on the Kubernetes test bed (where `entrypoint.sh` deploys the contract and creates the users on start-up) is described in the [root README](../../README.md#4-demo-voting-dapp).

## Architecture notes

### Parallel Wallet Pool (Avoiding Nonce Exceptions)
To handle high volumes of concurrent voting transactions without encountering "nonce already used" exceptions or transaction queuing delays, the backend employs a **Parallel Wallet Pool** strategy found in `app/controllers/ethVote.interactions.js`.

- **Mechanism**: On startup, the backend initializes a pool of random wallets, **10** by default (`WALLET_POOL_SIZE`).
- **Prefinancing**: Each wallet is automatically checked for a minimum balance (e.g., 0.1 ETH) and funded by the `mainSigner` (configured via `PRIVATE_KEY`) if needed.
- **Round-Robin Execution**: When a vote is cast, the backend selects a wallet from the pool in a round-robin fashion to sign and send the transaction. This ensures that transactions are spread across multiple source accounts, allowing for parallel block inclusion and preventing bottlenecking on a single account's nonce.
