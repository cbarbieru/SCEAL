//! The SGX enclave: the smallest trusted unit.
//!
//! Two endpoints:
//!   * **submit** (`:1546`) — `send_raw_transaction`. TLS-terminated in the
//!     enclave with `--features tls` (self-signed, stub); plaintext otherwise.
//!   * **read** (`:1547`, always plaintext) — `get_raw_transactions`,
//!     `get_best_transaction_hashes` (signed), `get_public_key`. Integrity of the
//!     ordering comes from the enclave signature, so this endpoint needs no TLS.
//!
//! No Tokio/async — blocking `std::net`, one thread per connection (bounded by
//! the `threads` count in Cargo.toml's `[package.metadata.fortanix-sgx]`).

mod transport;

use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::{Arc, Mutex};
use std::thread;

use alloy_primitives::{B256, Bytes};
use tog_core::{Mempool, Signer};
use tog_proto::{Request, Response, read_frame, write_frame};

type SharedPool = Arc<Mutex<Mempool>>;

/// Which endpoint a connection arrived on — gates which ops are allowed.
#[derive(Clone, Copy, PartialEq)]
enum Endpoint {
    Submit,
    Read,
}

fn main() {
    // Compile-time config (EDP enclaves don't inherit the host env; see README).
    let submit_bind: &str = option_env!("TOG_SUBMIT_BIND").unwrap_or("0.0.0.0:1546");
    let read_bind: &str = option_env!("TOG_READ_BIND").unwrap_or("0.0.0.0:1547");
    let base_fee: u64 = option_env!("TOG_BASE_FEE").and_then(|v| v.parse().ok()).unwrap_or(0);

    let pool: SharedPool = Arc::new(Mutex::new(Mempool::new(base_fee, 7)));
    // Ordering-signing key — generated once at load, no rotation.
    let signer = Arc::new(Signer::generate());

    if cfg!(not(target_env = "sgx")) {
        eprintln!("⚠️  tog-enclave running OUTSIDE SGX (NOT attested) — dev only");
    }
    eprintln!("🔑 ordering public key {}", signer.public_key_hex());

    let submit_transport = Arc::new(
        transport::SubmitTransport::init()
            .unwrap_or_else(|e| panic!("submit transport init failed: {e}")),
    );
    let submit_listener = TcpListener::bind(submit_bind)
        .unwrap_or_else(|e| panic!("bind submit {submit_bind}: {e}"));
    let read_listener =
        TcpListener::bind(read_bind).unwrap_or_else(|e| panic!("bind read {read_bind}: {e}"));

    println!("🔒 submit endpoint [{}] on {submit_bind}", transport::SUBMIT_KIND);
    println!("📖 read endpoint [plaintext, signed ordering] on {read_bind} (base_fee={base_fee})");

    // Read endpoint on its own thread; the submit endpoint drives the main thread.
    {
        let pool = Arc::clone(&pool);
        let signer = Arc::clone(&signer);
        thread::spawn(move || {
            for incoming in read_listener.incoming() {
                match incoming {
                    Ok(stream) => {
                        let pool = Arc::clone(&pool);
                        let signer = Arc::clone(&signer);
                        thread::spawn(move || {
                            let _ = serve(stream, Endpoint::Read, &pool, &signer);
                        });
                    }
                    Err(e) => eprintln!("read accept error: {e}"),
                }
            }
        });
    }

    for incoming in submit_listener.incoming() {
        match incoming {
            Ok(stream) => {
                let pool = Arc::clone(&pool);
                let signer = Arc::clone(&signer);
                let transport = Arc::clone(&submit_transport);
                thread::spawn(move || match transport.accept(stream) {
                    Ok(session) => {
                        let _ = serve(session, Endpoint::Submit, &pool, &signer);
                    }
                    Err(e) => eprintln!("submit handshake failed: {e}"),
                });
            }
            Err(e) => eprintln!("submit accept error: {e}"),
        }
    }
}

fn serve<S: Read + Write>(
    mut session: S,
    endpoint: Endpoint,
    pool: &SharedPool,
    signer: &Signer,
) -> std::io::Result<()> {
    loop {
        // A clean EOF / closed connection ends the loop without noise.
        let req: Request = match read_frame(&mut session) {
            Ok(req) => req,
            Err(_) => return Ok(()),
        };
        let resp = dispatch(req, endpoint, pool, signer);
        if write_frame(&mut session, &resp).is_err() {
            return Ok(());
        }
    }
}

fn dispatch(req: Request, endpoint: Endpoint, pool: &SharedPool, signer: &Signer) -> Response {
    match (endpoint, req) {
        (Endpoint::Submit, Request::SendRawTransaction(hex_str)) => {
            let bytes = match decode_hex(&hex_str) {
                Ok(b) => b,
                Err(e) => return Response::Error(e),
            };
            let mut pool = pool.lock().expect("pool mutex poisoned");
            match pool.add_raw_transaction(bytes) {
                Ok(hash) => Response::Hash(hex0x(hash.as_slice())),
                Err(e) => Response::Error(e.to_string()),
            }
        }
        (Endpoint::Read, Request::GetRawTransactions) => {
            let raws = pool.lock().expect("pool mutex poisoned").drain_raw_transactions();
            Response::RawTransactions(raws.iter().map(|b| hex0x(b.as_ref())).collect())
        }
        (Endpoint::Read, Request::GetBestTransactionHashes) => {
            let hashes: Vec<B256> =
                pool.lock().expect("pool mutex poisoned").best_transaction_hashes();
            // Sign the ordering so the builder can verify it over plaintext.
            let signature = signer.sign_ordering(&hashes);
            let hashes = hashes.iter().map(|h| hex0x(h.as_slice())).collect();
            Response::BestTransactionHashes { hashes, signature }
        }
        (Endpoint::Read, Request::GetPublicKey) => Response::PublicKey(signer.public_key_hex()),
        // Op used on the wrong endpoint (send on read port, or a read on submit).
        _ => Response::Error("operation not available on this endpoint".to_string()),
    }
}

fn decode_hex(s: &str) -> Result<Bytes, String> {
    let s = s.strip_prefix("0x").unwrap_or(s);
    hex::decode(s).map(Bytes::from).map_err(|e| format!("invalid hex: {e}"))
}

fn hex0x(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(2 + bytes.len() * 2);
    s.push_str("0x");
    s.push_str(&hex::encode(bytes));
    s
}
