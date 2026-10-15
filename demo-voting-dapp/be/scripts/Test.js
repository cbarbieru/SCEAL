const { ethers } = require('ethers');

async function main() {
	// const c='65f472ebf3059af2327c3b70';
    // const salt='H0wcS6£.4N';

    const hash=ethers.solidityPackedKeccak256(['string'],["65eb1ea5694b2dfa0d3f76a1"+"660922c007b02afcfa2ca648"]);

    console.log('hash:'+hash);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});