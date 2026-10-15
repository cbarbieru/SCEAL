# SGX Test Bed

`op-rbuilder` is a separate git repository, linked in here as a submodule.
`tx-order-guarantor` is vendored directly in this repo (no separate git history).
See the root [README](../../README.md#32-sgx) and each project's own
`README.md`/`CLAUDE.md` for the architecture.

`docker-compose.yml` here starts the three pieces at this directory's root:

- **tog-enclave** — the transaction-order-guarantor, built from
  `tx-order-guarantor/Dockerfile.enclave-dev` (no SGX hardware required; see
  `tx-order-guarantor/README.md` for the real SGX build).
- **op-rbuilder** — the block builder, built from `op-rbuilder/Dockerfile`,
  wired to the enclave's read endpoint via `--tx-order-guarantor.addr`.
- **tog-client** — a one-shot reference client (`Dockerfile.client`, added
  alongside `tx-order-guarantor`'s own Dockerfiles) used to smoke-test the
  enclave.

```bash
docker compose up -d --build tog-enclave op-rbuilder
docker compose run --rm tog-client demo
docker compose down
```

See `test-cases/smoke-order-guarantor` at the repo root for a scripted version of
this smoke test.
