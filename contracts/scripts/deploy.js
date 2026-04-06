const hre = require("hardhat");

async function main() {

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();

  // Deploy VotingSystem contract
  const VotingSystem = await hre.ethers.getContractFactory("VotingSystem");
  
  const votingSystem = await VotingSystem.deploy();
  await votingSystem.waitForDeployment();

  const contractAddress = await votingSystem.getAddress();
  // Get contract version
  const version = await votingSystem.version();
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    process.exit(1);
  });

