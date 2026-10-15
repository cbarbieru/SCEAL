//! Enclave ordering signature.
//!
//! The enclave generates a secp256k1 keypair **once at load** (no rotation) and
//! signs the ordering returned by `get_best_transaction_hashes`. Consumers (the
//! builder) fetch the public key via `get_public_key` and verify the signature —
//! so the read endpoint can stay plaintext: integrity comes from the signature,
//! not the transport.
//!
//! Trust note: a signature only helps if the public key is authentic. In the end
//! state the key is bound to the enclave's attestation (its hash goes in the
//! quote's `report_data`), so a verifier that has checked the quote knows the
//! genuine key. Until attestation lands, the exposed key is *not* yet
//! authenticated — same bootstrap as the (stub) TLS key.

use alloy_primitives::{B256, hex, keccak256};
use k256::ecdsa::signature::hazmat::{PrehashSigner, PrehashVerifier};
use k256::ecdsa::{Signature, SigningKey, VerifyingKey};

/// Domain tag so an ordering signature can't be reused as some other signature.
const DOMAIN: &[u8] = b"tog-ordering-v1\n";

/// keccak256(DOMAIN || concat(32-byte hashes)) — the message both sign and
/// verify operate on, so they can never disagree on the encoding.
fn ordering_digest(hashes: &[B256]) -> [u8; 32] {
    let mut buf = Vec::with_capacity(DOMAIN.len() + hashes.len() * 32);
    buf.extend_from_slice(DOMAIN);
    for h in hashes {
        buf.extend_from_slice(h.as_slice());
    }
    keccak256(buf).0
}

fn strip0x(s: &str) -> &str {
    s.strip_prefix("0x").unwrap_or(s)
}

/// The enclave's ordering-signing key.
pub struct Signer {
    key: SigningKey,
}

impl Signer {
    /// Generate a fresh key at enclave load (RDRAND-backed `getrandom` on SGX).
    pub fn generate() -> Self {
        Self { key: SigningKey::random(&mut rand_core::OsRng) }
    }

    /// Compressed SEC1 public key as `0x`-hex — served by `get_public_key`.
    pub fn public_key_hex(&self) -> String {
        let sec1 = self.key.verifying_key().to_sec1_bytes(); // compressed
        format!("0x{}", hex::encode(sec1))
    }

    /// ECDSA signature (`0x`-hex, 64-byte r‖s) over the ordering digest.
    pub fn sign_ordering(&self, hashes: &[B256]) -> String {
        let digest = ordering_digest(hashes);
        let sig: Signature = self.key.sign_prehash(&digest).expect("sign_prehash");
        format!("0x{}", hex::encode(sig.to_bytes()))
    }
}

/// Verify an ordering signature against a SEC1 public key (both `0x`-hex).
/// Returns `false` on any parse or verification failure. Used by the builder /
/// `tog-client`; shares [`ordering_digest`] with the signer so they agree.
pub fn verify_ordering(public_key_hex: &str, hashes: &[B256], signature_hex: &str) -> bool {
    let Ok(pk_bytes) = hex::decode(strip0x(public_key_hex)) else { return false };
    let Ok(sig_bytes) = hex::decode(strip0x(signature_hex)) else { return false };
    let Ok(vk) = VerifyingKey::from_sec1_bytes(&pk_bytes) else { return false };
    let Ok(sig) = Signature::from_slice(&sig_bytes) else { return false };
    vk.verify_prehash(&ordering_digest(hashes), &sig).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sign_then_verify_roundtrips() {
        let signer = Signer::generate();
        let pk = signer.public_key_hex();
        let hashes = vec![B256::repeat_byte(1), B256::repeat_byte(2)];
        let sig = signer.sign_ordering(&hashes);
        assert!(verify_ordering(&pk, &hashes, &sig));
    }

    #[test]
    fn tampered_ordering_fails() {
        let signer = Signer::generate();
        let pk = signer.public_key_hex();
        let hashes = vec![B256::repeat_byte(1), B256::repeat_byte(2)];
        let sig = signer.sign_ordering(&hashes);
        // reordered → different digest → must not verify
        let tampered = vec![B256::repeat_byte(2), B256::repeat_byte(1)];
        assert!(!verify_ordering(&pk, &tampered, &sig));
    }

    #[test]
    fn wrong_key_fails() {
        let a = Signer::generate();
        let b = Signer::generate();
        let hashes = vec![B256::repeat_byte(9)];
        let sig = a.sign_ordering(&hashes);
        assert!(!verify_ordering(&b.public_key_hex(), &hashes, &sig));
    }
}
