import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting deployment of ArkivMusicRental contract...\n");

  // Get deployment parameters from environment or use defaults
  const platformFeePercentage = process.env.PLATFORM_FEE_PERCENTAGE 
    ? parseInt(process.env.PLATFORM_FEE_PERCENTAGE) 
    : 500; // 5% default
  
  const platformFeeRecipient = process.env.PLATFORM_FEE_RECIPIENT 
    || (await ethers.getSigners())[0].address; // Default to deployer

  console.log("📋 Deployment Configuration:");
  console.log("   Platform Fee: %s (%s%)", platformFeePercentage, platformFeePercentage / 100);
  console.log("   Fee Recipient:", platformFeeRecipient);
  console.log();

  // Deploy the contract
  console.log("📦 Deploying ArkivMusicRental contract...");
  const ArkivMusicRental = await ethers.getContractFactory("ArkivMusicRental");
  const contract = await ArkivMusicRental.deploy(
    platformFeePercentage,
    platformFeeRecipient
  );

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log("✅ ArkivMusicRental deployed to:", contractAddress);
  console.log();

  // Display next steps
  console.log("🎉 Deployment successful!\n");
  console.log("📝 Next Steps:");
  console.log("   1. Add this to your .env file:");
  console.log(`      VITE_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`      VITE_CHAIN_ID=${(await ethers.provider.getNetwork()).chainId}`);
  console.log();
  console.log("   2. Verify the contract (optional):");
  console.log(`      npx hardhat verify --network <network-name> ${contractAddress} ${platformFeePercentage} ${platformFeeRecipient}`);
  console.log();
  console.log("   3. Add catalog items using the contract owner functions");
  console.log();

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    contractAddress,
    platformFeePercentage,
    platformFeeRecipient,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deploymentTime: new Date().toISOString(),
    deployer: (await ethers.getSigners())[0].address,
  };

  fs.writeFileSync(
    'deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("💾 Deployment info saved to deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
