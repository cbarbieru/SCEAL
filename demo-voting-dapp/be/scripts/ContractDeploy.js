const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
	const Contract = await hre.ethers.getContractFactory("Vote");
	const contract = await Contract.deploy();

	await contract.waitForDeployment();

	const address = await contract.getAddress();
	console.log("Vote deployed to:", address);

	// Use the root .env file
	const envPath = path.join(__dirname, '../.env');
	
	let envContent = '';
	if (fs.existsSync(envPath)) {
		envContent = fs.readFileSync(envPath, 'utf8');
	}

	// Replace existing VOTECONTRACT_ADDRESS or append if not found
	const regex = /^VOTECONTRACT_ADDRESS=.*$/m;
	if (regex.test(envContent)) {
		envContent = envContent.replace(regex, `VOTECONTRACT_ADDRESS=${address}`);
	} else {
		envContent += `\nVOTECONTRACT_ADDRESS=${address}\n`;
	}

	fs.writeFileSync(envPath, envContent);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});