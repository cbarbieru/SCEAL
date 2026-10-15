//! CLI for the enclave protocol.
//!
//!   tog-client [--submit H:P] [--read H:P] <command>
//!
//! Commands:
//!   send <0xRAWTX>   submit a raw transaction (submit endpoint), print its hash
//!   get-raw          drain + print the raw tx buffer (read endpoint)
//!   get-best         print the signed ordering + verify its signature
//!   get-pubkey       print the enclave's ordering-signing public key
//!   demo             send sample txs, then fetch + verify the ordering
//!
//! Submit defaults to `127.0.0.1:1546`, read to `127.0.0.1:1547`. With
//! `--features tls` the submit connection is TLS (cert NOT verified yet — stub).

use std::error::Error;
use std::io::{Read, Write};

use tog_client::{Client, connect_plain, sample_raw_tx, verify_signed_ordering};

struct Args {
    submit: String,
    read: String,
    rest: Vec<String>,
}

fn parse_args() -> Args {
    let mut submit = "127.0.0.1:1546".to_string();
    let mut read = "127.0.0.1:1547".to_string();
    let mut rest = Vec::new();

    let mut it = std::env::args().skip(1);
    while let Some(arg) = it.next() {
        match arg.as_str() {
            "--submit" => submit = it.next().unwrap_or(submit),
            "--read" => read = it.next().unwrap_or(read),
            "-h" | "--help" => {
                print_usage();
                std::process::exit(0);
            }
            _ => rest.push(arg),
        }
    }
    Args { submit, read, rest }
}

fn print_usage() {
    eprintln!(
        "usage: tog-client [--submit H:P] [--read H:P] <command>\n\
         commands: send <0xRAWTX> | get-raw | get-best | get-pubkey | demo"
    );
}

fn main() -> Result<(), Box<dyn Error>> {
    let args = parse_args();

    match args.rest.first().map(String::as_str) {
        Some("send") => {
            let raw = args.rest.get(1).ok_or("send requires a 0x-prefixed raw tx")?;
            // Submit endpoint: TLS with `--features tls`, plaintext otherwise.
            #[cfg(feature = "tls")]
            let mut submit = tog_client::connect_tls(&args.submit)?;
            #[cfg(not(feature = "tls"))]
            let mut submit = connect_plain(&args.submit)?;
            println!("{}", submit.send_raw_transaction(raw)?);
        }
        Some("get-raw") => {
            let mut read = connect_plain(&args.read)?;
            for t in read.get_raw_transactions()? {
                println!("{t}");
            }
        }
        Some("get-best") => {
            let mut read = connect_plain(&args.read)?;
            let ordering = read.get_best_transaction_hashes()?;
            let pubkey = read.get_public_key()?;
            for h in &ordering.hashes {
                println!("{h}");
            }
            let ok = verify_signed_ordering(&pubkey, &ordering);
            eprintln!("signature: {} (key {pubkey})", if ok { "VERIFIED ✓" } else { "INVALID ✗" });
        }
        Some("get-pubkey") => {
            let mut read = connect_plain(&args.read)?;
            println!("{}", read.get_public_key()?);
        }
        Some("demo") => {
            #[cfg(feature = "tls")]
            let mut submit = tog_client::connect_tls(&args.submit)?;
            #[cfg(not(feature = "tls"))]
            let mut submit = connect_plain(&args.submit)?;
            let mut read = connect_plain(&args.read)?;
            run_demo(&mut submit, &mut read)?;
        }
        _ => {
            print_usage();
            return Err("no command".into());
        }
    }
    Ok(())
}

fn run_demo<S: Read + Write>(
    submit: &mut Client<S>,
    read: &mut Client<std::net::TcpStream>,
) -> Result<(), Box<dyn Error>> {
    // Three distinct senders with different tips; expected best order is
    // tip-descending: 100, 50, 5.
    let samples = [(0x11u8, 0u64, 5u128), (0x22, 0, 100), (0x33, 0, 50)];
    println!("→ sending {} sample txs (submit endpoint)", samples.len());
    let mut sent = Vec::new();
    for (key, nonce, tip) in samples {
        let raw = sample_raw_tx(key, nonce, tip);
        let hash = submit.send_raw_transaction(&raw)?;
        println!("  tip={tip:>4}  {hash}");
        sent.push((tip, hash));
    }

    let pubkey = read.get_public_key()?;
    println!("\n→ enclave ordering key: {pubkey}");

    println!("\n→ get-best (expect tip-desc 100, 50, 5):");
    let ordering = read.get_best_transaction_hashes()?;
    for h in &ordering.hashes {
        let tip = sent.iter().find(|(_, hh)| hh == h).map(|(t, _)| *t);
        match tip {
            Some(t) => println!("  {h}  (tip={t})"),
            None => println!("  {h}"),
        }
    }
    let ok = verify_signed_ordering(&pubkey, &ordering);
    println!("  signature: {}", if ok { "VERIFIED ✓" } else { "INVALID ✗" });

    println!("\n→ get-raw (drains the buffer):");
    println!("  {} raw txs returned", read.get_raw_transactions()?.len());
    println!("  {} raw txs returned (second call, drained)", read.get_raw_transactions()?.len());
    Ok(())
}
