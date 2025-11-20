import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Deploy the ArkivRental smart contract to Mendoza testnet
 * This script compiles and deploys the contract, then saves the address
 */
async function deployRentalContract() {
  try {
    // Get private key from environment
    const privateKey = process.env.ARKIV_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('ARKIV_PRIVATE_KEY not found in environment variables');
    }

    // Connect to Mendoza testnet (Arkiv testnet)
    // Note: Update RPC URL based on actual Mendoza testnet endpoint
    const rpcUrl = process.env.MENDOZA_RPC_URL || 'https://mendoza-testnet-rpc.arkiv.network';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('Deploying from address:', wallet.address);

    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log('Wallet balance:', ethers.formatEther(balance), 'ETH');

    if (balance === 0n) {
      throw new Error('Insufficient balance. Please fund your wallet with testnet ETH');
    }

    // Read and compile the Solidity contract
    // Note: In production, you would use hardhat or foundry for compilation
    // For now, we'll use a pre-compiled ABI and bytecode approach
    console.log('\n📝 Reading contract source...');
    const contractPath = path.join(process.cwd(), 'contracts', 'ArkivRental.sol');
    const contractSource = fs.readFileSync(contractPath, 'utf8');

    console.log('\n⚠️  MANUAL COMPILATION REQUIRED:');
    console.log('Please compile the contract using one of these methods:');
    console.log('1. Use Remix IDE: https://remix.ethereum.org');
    console.log('2. Use solc compiler: npx solc --abi --bin contracts/ArkivRental.sol');
    console.log('3. Use Hardhat: npx hardhat compile');
    console.log('\nAfter compilation, update this script with the ABI and bytecode');
    console.log('Contract source location:', contractPath);

    // Placeholder for compiled contract
    // In a real deployment, you would load this from compiled artifacts
    const abi = [
      // This will be populated after compilation
      "function createRental(string rentalId, string catalogItemId, uint256 durationDays) payable",
      "function expireRental(string rentalId)",
      "function updateMimicTaskId(string rentalId, string mimicTaskId)",
      "function isRentalValid(string rentalId) view returns (bool)",
      "function getRental(string rentalId) view returns (tuple(address renter, string catalogItemId, uint256 expiresAt, uint256 paidAmount, uint256 durationDays, bool isActive, string mimicTaskId))",
      "function getPriceForDuration(uint256 durationDays) view returns (uint256)",
      "function withdrawFunds()",
      "function getBalance() view returns (uint256)",
      "function owner() view returns (address)",
      "function totalRentals() view returns (uint256)",
      "event RentalCreated(string indexed rentalId, address indexed renter, string catalogItemId, uint256 expiresAt, uint256 paidAmount, uint256 durationDays)",
      "event RentalExpired(string indexed rentalId, address indexed renter, string catalogItemId)",
      "event MimicTaskUpdated(string indexed rentalId, string mimicTaskId)"
    ];

    // Bytecode will be added after compilation
    const bytecode = process.env.RENTAL_CONTRACT_BYTECODE;
    if (!bytecode) {
      console.error('\n❌ Contract bytecode not found');
      console.log('Set RENTAL_CONTRACT_BYTECODE environment variable with compiled bytecode');
      process.exit(1);
    }

    console.log('\n🚀 Deploying ArkivRental contract...');
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    const contract = await factory.deploy();
    
    console.log('⏳ Waiting for deployment...');
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    console.log('\n✅ Contract deployed successfully!');
    console.log('Contract address:', contractAddress);
    console.log('Transaction hash:', contract.deploymentTransaction()?.hash);

    // Save contract address to .env file
    const envPath = path.join(process.cwd(), '.env.contract');
    fs.writeFileSync(
      envPath,
      `RENTAL_CONTRACT_ADDRESS=${contractAddress}\n`,
      { flag: 'w' }
    );
    console.log('\n📄 Contract address saved to .env.contract');

    // Save deployment info to JSON
    const deploymentInfo = {
      contractAddress,
      deploymentTime: new Date().toISOString(),
      deployerAddress: wallet.address,
      network: 'mendoza-testnet',
      txHash: contract.deploymentTransaction()?.hash,
      abi: abi
    };

    const deploymentPath = path.join(process.cwd(), 'deployment.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log('📄 Deployment info saved to deployment.json');

    // Verify initial state
    console.log('\n🔍 Verifying contract state...');
    const contractInstance = contract as any; // Type assertion for dynamic contract interface
    const owner = await contractInstance.owner();
    const totalRentals = await contractInstance.totalRentals();
    const price7Days = await contractInstance.getPriceForDuration(7);
    const price30Days = await contractInstance.getPriceForDuration(30);
    const price1Year = await contractInstance.getPriceForDuration(365);

    console.log('Owner:', owner);
    console.log('Total rentals:', totalRentals.toString());
    console.log('Price (7 days):', ethers.formatEther(price7Days), 'ETH');
    console.log('Price (30 days):', ethers.formatEther(price30Days), 'ETH');
    console.log('Price (1 year):', ethers.formatEther(price1Year), 'ETH');

    console.log('\n🎉 Deployment complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Set RENTAL_CONTRACT_ADDRESS in your environment variables');
    console.log('2. Configure Mimic protocol integration');
    console.log('3. Update backend to interact with the contract');

    return contractAddress;
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  }
}

// Run deployment if called directly
if (require.main === module) {
  deployRentalContract()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { deployRentalContract };
