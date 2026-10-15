#!/bin/sh
set -e

# The L2 may still be coming up when this pod starts, so retry the deploy for ~5 minutes.
# ContractDeploy.js awaits waitForDeployment() (tx mined), so the contract is usable as
# soon as it returns - no extra sleep is needed before the next step.
echo "Deploying contract to playground (${PLAYGROUND_API_URL:-http://localhost:8545})..."
attempt=1
until npx hardhat run ./scripts/ContractDeploy.js --network playground; do
    if [ "$attempt" -ge 60 ]; then
        echo "Contract deployment failed after $attempt attempts, giving up." >&2
        exit 1
    fi
    echo "Deployment failed (attempt $attempt), retrying in 5s..."
    attempt=$((attempt + 1))
    sleep 5
done

# Create the voters (needs MongoDB, not the chain) and write the JMeter CSVs to $OUTPUT_DIR.
if [ "${CREATE_USERS:-true}" = "true" ]; then
    echo "Creating users..."
    node ./scripts/CreateUsers.js
fi

# Create/refresh today's election and its candidates (same ids the voter hashes are generated for).
if [ "${SEED_ELECTION:-true}" = "true" ]; then
    echo "Seeding today's election..."
    node ./scripts/SeedTodayElection.js
fi

echo "Starting backend server..."
exec node server.js
