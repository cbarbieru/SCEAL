#!/bin/sh
# Smoke test for the SGX test bed: brings up the tx-order-guarantor dev enclave
# + op-rbuilder via docker-compose, then runs the tog-client `demo` — it sends
# sample txs to the enclave's submit endpoint, reads back the signed ordering
# from the read endpoint, and verifies the signature. See
# test-bed/sgx/docker-compose.yml and test-bed/sgx/tx-order-guarantor/README.md
# ("Build & run" / "Test client") for what `demo` exercises.
#
# This uses the plaintext dev enclave (no SGX hardware needed). For the real
# SGX-backed build see test-bed/sgx/tx-order-guarantor/README.md ("Docker").
set -eu

COMPOSE_DIR="$(cd "$(dirname "$0")/../../test-bed/sgx" && pwd)"
cd "$COMPOSE_DIR"

docker compose up -d --build tog-enclave op-rbuilder

echo "Waiting for tog-enclave to come up..."
sleep 5

docker compose run --rm --build tog-client demo

docker compose down
