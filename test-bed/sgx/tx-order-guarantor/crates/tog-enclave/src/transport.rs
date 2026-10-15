//! Submit-endpoint transport.
//!
//! Default: **plaintext** (dev). With `--features tls`: **TLS terminated inside
//! the enclave** using a self-signed cert (mbedtls). The client does NOT verify
//! the cert yet — that's the stub at the transport layer; adding the SGX quote
//! to the cert + client-side quote verification is what turns this into RA-TLS.
//!
//! The *read* endpoint is always plaintext (see `main.rs`) — its integrity comes
//! from the enclave-signed ordering, not the transport. So only this submit
//! transport ever gets wrapped in TLS.

use std::net::TcpStream;

pub use imp::{SUBMIT_KIND, SubmitTransport};

// ── Plaintext (default) ─────────────────────────────────────────────────────
#[cfg(not(feature = "tls"))]
mod imp {
    use super::TcpStream;
    use std::io;

    pub const SUBMIT_KIND: &str = "PLAINTEXT — no TLS (dev)";
    pub type SubmitSession = TcpStream;

    pub struct SubmitTransport;

    impl SubmitTransport {
        pub fn init() -> Result<Self, Box<dyn std::error::Error>> {
            Ok(SubmitTransport)
        }
        pub fn accept(&self, stream: TcpStream) -> io::Result<SubmitSession> {
            Ok(stream)
        }
    }
}

// ── TLS via mbedtls (feature `tls`) ─────────────────────────────────────────
// ⚠ BEST-EFFORT, build on the Linux SGX box (needs cmake + the mbedtls C build;
// not compiled on the dev Mac). Self-signed cert + a non-verifying client =
// TLS-with-stub-attestation. The mbedtls **certificate builder** API is the part
// most likely to need adjusting to your mbedtls version (method names, the
// subject/issuer key borrows, `Time`/serial). The TLS handshake + `establish`
// shape is stable.
#[cfg(feature = "tls")]
mod imp {
    use super::TcpStream;
    use std::io;
    use std::sync::Arc;

    use mbedtls::pk::{EcGroupId, Pk};
    use mbedtls::rng::CtrDrbg;
    use mbedtls::ssl::config::{Endpoint, Preset, Transport as MbedTransport};
    use mbedtls::ssl::{Config, Context};
    use mbedtls::x509::Time;
    use mbedtls::x509::certificate::{Builder, Certificate};

    pub const SUBMIT_KIND: &str = "TLS self-signed (STUB — client does not verify)";
    pub type SubmitSession = Context<TcpStream>;

    pub struct SubmitTransport {
        config: Arc<Config>,
    }

    // Entropy: RDRAND inside the enclave, OS entropy on a normal host.
    #[cfg(target_env = "sgx")]
    fn ctr_drbg() -> Result<CtrDrbg, mbedtls::Error> {
        CtrDrbg::new(Arc::new(mbedtls::rng::Rdseed), None)
    }
    #[cfg(not(target_env = "sgx"))]
    fn ctr_drbg() -> Result<CtrDrbg, mbedtls::Error> {
        CtrDrbg::new(Arc::new(mbedtls::rng::OsEntropy::new()), None)
    }

    impl SubmitTransport {
        pub fn init() -> Result<Self, Box<dyn std::error::Error>> {
            let mut rng = ctr_drbg()?;
            // TLS cert key (separate from the ordering-signing key in tog-core).
            let mut key = Pk::generate_ec(&mut rng, EcGroupId::SecP256R1)?;
            // Self-signed: subject_key and issuer_key each need a distinct `&mut
            // Pk`, so duplicate the same key material into a second handle (DER,
            // no NUL needed) for the issuer slot.
            let key_der = key.write_private_der_vec()?;
            let mut issuer = Pk::from_private_key(&key_der, None)?;

            // Self-signed cert (validity wide/arbitrary — the client doesn't verify
            // it in the stub phase, and in-enclave time is untrusted). Emitted as
            // NUL-terminated PEM, parsed into the cert *list* push_cert expects.
            let cert_pem = {
                let mut builder = Builder::new();
                builder.subject_key(&mut key);
                builder.issuer_key(&mut issuer);
                builder.subject_with_nul("CN=tog-enclave\0")?;
                builder.issuer_with_nul("CN=tog-enclave\0")?;
                builder.validity(
                    Time::new(2020, 1, 1, 0, 0, 0).expect("valid time"),
                    Time::new(2050, 1, 1, 0, 0, 0).expect("valid time"),
                )?;
                builder.serial(&[1])?;
                // Set the signature hash, else the sig-algorithm OID can't be
                // resolved when writing the cert (mbedtls `OidNotFound`).
                builder.signature_hash(mbedtls::hash::Type::Sha256);
                builder.write_pem_string(&mut rng)?
            };
            let mut pem = cert_pem.into_bytes();
            pem.push(0); // mbedtls' PEM parser wants a NUL-terminated buffer
            let chain = Arc::new(Certificate::from_pem_multiple(&pem)?);

            let mut config = Config::new(Endpoint::Server, MbedTransport::Stream, Preset::Default);
            config.set_rng(Arc::new(ctr_drbg()?));
            config.push_cert(chain, Arc::new(key))?;
            Ok(SubmitTransport { config: Arc::new(config) })
        }

        pub fn accept(&self, stream: TcpStream) -> io::Result<SubmitSession> {
            // TLS terminates INSIDE the enclave; the runner only relays ciphertext.
            let mut ctx = Context::new(self.config.clone());
            ctx.establish(stream, None)
                .map_err(|e| io::Error::other(format!("tls handshake failed: {e}")))?;
            Ok(ctx)
        }
    }
}
