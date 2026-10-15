# CLAUDE.md

Guidance for Claude Code working in this repository. See [README.md](README.md)
for the full architecture and SGX-host setup.

## What this is

A **transaction order guarantor (TOG)** for Optimism/L2, refactored so the
mempool **ordering runs inside an Intel SGX enclave** (Fortanix EDP) as the
smallest trusted unit. Clients submit raw txs **directly to the enclave** and the
builder reads back the raw txs and the enclave-computed ordering. There is
**deliberately no proxy in the transaction path** (censorship resistance):
clients query the builder directly for read-only `eth_*`.

**Two endpoints**: a **submit** endpoint (`:1546`, `send_raw_transaction`) and a
**read** endpoint (`:1547`, plaintext — `get_raw`/`get_best`/`get_public_key`).
The enclave signs `get_best` with a key generated at load (exposed via
`get_public_key`), so the builder verifies the ordering without TLS. The submit
endpoint is plaintext by default; build with **`--features tls`** to terminate
TLS in the enclave (self-signed cert; the client does NOT verify it yet — the
stub). Adding the SGX quote to that cert + client-side verification is what turns
it into real **RA-TLS** (future work). Do **not** re-add an Enclave-Manager path
unless asked.

This is a **Cargo virtual workspace** — there is no root package. Do not
reintroduce reth into the enclave path (its C deps — c-kzg, secp256k1-C, mdbx —
won't compile for `x86_64-fortanix-unknown-sgx`).

## Crates

- **crates/tog-proto** — length-prefixed JSON wire protocol (4 ops: send +
  get-raw/get-best/get-pubkey; `get_best` carries a signature). Pure, no C.
- **crates/tog-core** — the TCB: decode + signer recovery (`k256`) + gap-aware,
  replace-by-fee, tip-priority ordering + the ordering `Signer` (k256, key at
  load) + `verify_ordering`. Unit-tested. No chain-state access.
- **crates/tog-enclave** — SGX binary. No Tokio (blocking `std::net` +
  thread-per-conn). Two listeners (submit/read). `src/transport.rs` is the submit
  transport seam — plaintext, or TLS (mbedtls) behind feature `tls`.
- **crates/tog-client** — test/reference client; connects to the submit + read
  endpoints and verifies the signed ordering. TLS submit connector behind `tls`.

There is no `eth_*` proxy crate — reads go straight to the builder.

## Commands

```bash
cargo test -p tog-proto -p tog-core     # the logic that matters (verifiable on any host)
cargo build                             # whole workspace (host targets)
cargo run  -p tog-enclave               # submit :1546 + read :1547 (plaintext dev)
cargo run  -p tog-client -- demo        # end-to-end: send, signed get-best + verify
# TLS submit endpoint (mbedtls; needs cmake): add --features tls to enclave + client
cargo clippy && cargo fmt

# Enclave build (Linux SGX host, NIGHTLY — see README "Build-host setup"):
rustup target add x86_64-fortanix-unknown-sgx --toolchain nightly
cargo +nightly build --release -p tog-enclave --target x86_64-fortanix-unknown-sgx
```

## Constraints to remember

- **Apple-Silicon Macs cannot build for SGX or run enclaves** (no HW, no
  simulator). The plaintext dev path + `tog-core` tests work there.
- **Fortanix EDP requires Rust nightly.**
- Enclave config is **compile-time** (`option_env!`): `TOG_SUBMIT_BIND` (default
  `0.0.0.0:1546`), `TOG_READ_BIND` (default `0.0.0.0:1547`), `TOG_BASE_FEE`
  (default 0) are read at *build* time and baked in — a real EDP enclave does NOT
  inherit the host/container environment, so runtime env is silently ignored.
  Never add a runtime `env::var` in the enclave for behavior that must work on SGX.
- The enclave holds no chain state and an ephemeral pool (lost on restart;
  in-enclave time is untrusted).
