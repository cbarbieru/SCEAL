require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config()

module.exports = {
	solidity: {
		version: "0.8.9",
		settings: {
			optimizer: {
				enabled: true
			}
		}
	},
	allowUnlimitedContractSize: true,
	networks: {
		hardhat: {},
		playground: {
			url: process.env.PLAYGROUND_API_URL || "http://localhost:8545",
			// Falls back to the public dev account #0 prefunded by builder-playground / the k8s genesis.
			accounts: [process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80']
		}
	},
	etherscan: {
		apiKey: `${process.env.ETHERSCAN_API_KEY}`
	},
	paths: {
		artifacts: './app/artifacts'
	}
}