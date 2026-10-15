//! Client for the enclave's framed protocol.
//!
//! [`Client`] is generic over any `Read + Write` connection. The enclave has two
//! endpoints: a **submit** endpoint (`send_raw_transaction`) and a **read**
//! endpoint (`get_*`). Connect to each separately:
//!   * [`connect_plain`] — plain TCP (read endpoint, and submit endpoint in dev).
//!   * [`connect_tls`] — (feature `tls`) mbedtls client to the TLS submit
//!     endpoint. **Does not verify the cert yet** (stub); a real verifier checks
//!     the enclave's quote.
//!
//! The ordering from [`Client::get_best_transaction_hashes`] is signed; verify it
//! with [`verify_signed_ordering`] against [`Client::get_public_key`].

use std::fmt;
use std::io::{Read, Write};
use std::net::TcpStream;
use std::time::Duration;

use alloy_primitives::B256;
use tog_proto::{Request, Response, read_frame, write_frame};

/// The enclave-computed ordering plus its signature.
#[derive(Debug, Clone)]
pub struct SignedOrdering {
    pub hashes: Vec<String>,
    pub signature: String,
}

/// A connected client. Each method is one request/response round trip; the
/// connection stays open across calls.
pub struct Client<S> {
    conn: S,
}

impl<S: Read + Write> Client<S> {
    pub fn new(conn: S) -> Self {
        Self { conn }
    }

    /// `eth_sendRawTransaction` — returns the assigned tx hash (`0x…`).
    /// Use on a **submit** connection.
    pub fn send_raw_transaction(&mut self, raw_hex: &str) -> Result<String, ClientError> {
        match self.call(Request::SendRawTransaction(raw_hex.to_string()))? {
            Response::Hash(h) => Ok(h),
            Response::Error(e) => Err(ClientError::Server(e)),
            other => Err(ClientError::Unexpected(format!("{other:?}"))),
        }
    }

    /// `tog_getRawTransactions` — drains and returns the raw tx buffer (read endpoint).
    pub fn get_raw_transactions(&mut self) -> Result<Vec<String>, ClientError> {
        match self.call(Request::GetRawTransactions)? {
            Response::RawTransactions(v) => Ok(v),
            Response::Error(e) => Err(ClientError::Server(e)),
            other => Err(ClientError::Unexpected(format!("{other:?}"))),
        }
    }

    /// `tog_getBestTransactionHashes` — the signed ordering (read endpoint).
    pub fn get_best_transaction_hashes(&mut self) -> Result<SignedOrdering, ClientError> {
        match self.call(Request::GetBestTransactionHashes)? {
            Response::BestTransactionHashes { hashes, signature } => {
                Ok(SignedOrdering { hashes, signature })
            }
            Response::Error(e) => Err(ClientError::Server(e)),
            other => Err(ClientError::Unexpected(format!("{other:?}"))),
        }
    }

    /// `tog_getPublicKey` — the enclave's ordering-signing public key (read endpoint).
    pub fn get_public_key(&mut self) -> Result<String, ClientError> {
        match self.call(Request::GetPublicKey)? {
            Response::PublicKey(k) => Ok(k),
            Response::Error(e) => Err(ClientError::Server(e)),
            other => Err(ClientError::Unexpected(format!("{other:?}"))),
        }
    }

    fn call(&mut self, req: Request) -> Result<Response, ClientError> {
        write_frame(&mut self.conn, &req)?;
        Ok(read_frame(&mut self.conn)?)
    }
}

/// Verify a signed ordering against the enclave's public key (both via the read
/// endpoint). Shares `tog_core`'s signing logic, so it can never disagree on the
/// message encoding. Returns `false` on any parse/verify failure.
pub fn verify_signed_ordering(public_key_hex: &str, ordering: &SignedOrdering) -> bool {
    let hashes: Result<Vec<B256>, _> = ordering.hashes.iter().map(|h| h.parse::<B256>()).collect();
    match hashes {
        Ok(hashes) => tog_core::verify_ordering(public_key_hex, &hashes, &ordering.signature),
        Err(_) => false,
    }
}

/// Connect over plain TCP, retrying briefly so a just-started dev enclave is
/// caught without manual timing.
pub fn connect_plain(addr: &str) -> std::io::Result<Client<TcpStream>> {
    let mut last = None;
    for _ in 0..50 {
        match TcpStream::connect(addr) {
            Ok(s) => return Ok(Client::new(s)),
            Err(e) => {
                last = Some(e);
                std::thread::sleep(Duration::from_millis(100));
            }
        }
    }
    Err(last.expect("at least one attempt"))
}

#[cfg(feature = "tls")]
pub use tls::connect_tls;

#[cfg(feature = "tls")]
mod tls {
    //! ⚠ BEST-EFFORT, build where mbedtls builds (needs cmake). Connects to the
    //! enclave's TLS submit endpoint with **`AuthMode::None`** — it does NOT
    //! verify the cert (the stub). A real verifier checks the enclave's quote.
    use super::{Client, ClientError};
    use std::net::TcpStream;
    use std::sync::Arc;

    use mbedtls::rng::{CtrDrbg, OsEntropy};
    use mbedtls::ssl::config::{AuthMode, Endpoint, Preset, Transport as MbedTransport};
    use mbedtls::ssl::{Config, Context};

    pub fn connect_tls(addr: &str) -> Result<Client<Context<TcpStream>>, ClientError> {
        let rng = Arc::new(
            CtrDrbg::new(Arc::new(OsEntropy::new()), None).map_err(|e| ClientError::Tls(e.to_string()))?,
        );
        let mut config = Config::new(Endpoint::Client, MbedTransport::Stream, Preset::Default);
        config.set_rng(rng);
        // STUB: accept any server cert (no attestation yet).
        config.set_authmode(AuthMode::None);

        let stream = TcpStream::connect(addr)?;
        let mut ctx = Context::new(Arc::new(config));
        ctx.establish(stream, None).map_err(|e| ClientError::Tls(e.to_string()))?;
        Ok(Client::new(ctx))
    }
}

/// Build a signed EIP-1559 transaction as the `0x`-prefixed 2718 bytes a client
/// would submit. `key_byte` selects a deterministic signer (distinct senders),
/// `priority_fee` drives the tip ordering.
pub fn sample_raw_tx(key_byte: u8, nonce: u64, priority_fee: u128) -> String {
    use alloy_consensus::{SignableTransaction, TxEip1559, TxEnvelope};
    use alloy_eips::eip2718::Encodable2718;
    use alloy_primitives::{Address, TxKind, U256, hex};
    use alloy_signer::SignerSync;
    use alloy_signer_local::PrivateKeySigner;

    let signer = PrivateKeySigner::from_bytes(&B256::repeat_byte(key_byte)).expect("valid key");
    let tx = TxEip1559 {
        chain_id: 10,
        nonce,
        gas_limit: 21_000,
        max_fee_per_gas: priority_fee + 1_000_000_000,
        max_priority_fee_per_gas: priority_fee,
        to: TxKind::Call(Address::repeat_byte(0xab)),
        value: U256::ZERO,
        access_list: Default::default(),
        input: Default::default(),
    };
    let sig = signer.sign_hash_sync(&tx.signature_hash()).expect("sign");
    let env: TxEnvelope = tx.into_signed(sig).into();
    format!("0x{}", hex::encode(env.encoded_2718()))
}

#[derive(Debug)]
pub enum ClientError {
    Io(std::io::Error),
    Proto(tog_proto::ProtoError),
    /// The enclave returned a handled error (bad hex, decode/recovery, wrong endpoint).
    Server(String),
    /// TLS/handshake failure (feature `tls`).
    #[allow(dead_code)]
    Tls(String),
    Unexpected(String),
}

impl fmt::Display for ClientError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ClientError::Io(e) => write!(f, "io: {e}"),
            ClientError::Proto(e) => write!(f, "protocol: {e}"),
            ClientError::Server(e) => write!(f, "enclave error: {e}"),
            ClientError::Tls(e) => write!(f, "tls: {e}"),
            ClientError::Unexpected(e) => write!(f, "unexpected response: {e}"),
        }
    }
}

impl std::error::Error for ClientError {}

impl From<std::io::Error> for ClientError {
    fn from(e: std::io::Error) -> Self {
        ClientError::Io(e)
    }
}

impl From<tog_proto::ProtoError> for ClientError {
    fn from(e: tog_proto::ProtoError) -> Self {
        ClientError::Proto(e)
    }
}
