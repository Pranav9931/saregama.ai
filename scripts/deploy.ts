import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import solc from 'solc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🚀 Starting ArkivRental contract deployment...\n');

  // Load environment variables
  const privateKey = process.env.ARKIV_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('ARKIV_PRIVATE_KEY environment variable not set');
  }

  // Use Sepolia testnet for initial deployment
  // This is a standard Ethereum testnet that's reliable for development
  const networkName = 'sepolia';
  const rpcUrl = 'https://ethereum-sepolia-rpc.publicnode.com';
  const chainId = 11155111;
  
  console.log(`📡 Deploying to ${networkName} testnet`);
  console.log('🔗 RPC URL:', rpcUrl);
  console.log('🆔 Chain ID:', chainId);
  console.log('');
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('👛 Deployer address:', wallet.address);

  // Check balance
  try {
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Balance:', ethers.formatEther(balance), 'ETH\n');

    if (balance === 0n) {
      console.log(`⚠️  Warning: Your wallet has no ${networkName.toUpperCase()} ETH.`);
      console.log('Get testnet ETH from a faucet:');
      console.log('- https://sepoliafaucet.com');
      console.log('- https://www.alchemy.com/faucets/ethereum-sepolia');
      console.log('- https://faucet.quicknode.com/ethereum/sepolia');
      console.log('\nSend to:', wallet.address);
      console.log('');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Failed to check balance:', error.message);
    throw error;
  }

  // Read contract source code
  const contractPath = path.join(__dirname, '../contracts/ArkivRental.sol');
  const contractSource = fs.readFileSync(contractPath, 'utf8');

  console.log('📄 Contract source loaded');
  console.log('🔨 Compiling contract...\n');

  // Compile the contract using solc
  const input = {
    language: 'Solidity',
    sources: {
      'ArkivRental.sol': {
        content: contractSource,
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'],
        },
      },
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter((e: any) => e.severity === 'error');
    if (errors.length > 0) {
      console.error('❌ Compilation errors:');
      errors.forEach((error: any) => console.error(error.formattedMessage));
      process.exit(1);
    }
    const warnings = output.errors.filter((e: any) => e.severity === 'warning');
    if (warnings.length > 0) {
      console.log('⚠️  Compilation warnings:');
      warnings.forEach((warning: any) => console.log(warning.message));
      console.log('');
    }
  }

  const contract = output.contracts['ArkivRental.sol'].ArkivRental;
  const abi = contract.abi;
  const bytecode = '0x' + contract.evm.bytecode.object;

  console.log('✅ Contract compiled successfully');
  console.log('📊 Bytecode size:', Math.round(bytecode.length / 2), 'bytes');
  console.log('📦 Deploying contract...\n');

  // Deploy contract
  try {
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    
    console.log('🔍 Estimating gas...');
    const gasEstimate = await provider.estimateGas({
      data: bytecode,
      from: wallet.address,
    });
    console.log('⛽ Estimated gas:', gasEstimate.toString());
    
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice!;
    console.log('💸 Gas price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei');
    
    const estimatedCost = gasEstimate * gasPrice;
    console.log('💵 Estimated cost:', ethers.formatEther(estimatedCost), 'ETH\n');
    
    console.log('🚀 Sending deployment transaction...');
    const deployedContract = await factory.deploy();
    
    const txHash = deployedContract.deploymentTransaction()?.hash;
    console.log('📝 Transaction hash:', txHash);
    console.log('⏳ Waiting for confirmation...\n');
    
    await deployedContract.waitForDeployment();
    
    const contractAddress = await deployedContract.getAddress();
    
    console.log('\n✅ Contract deployed successfully!');
    console.log('📍 Contract address:', contractAddress);
    console.log('\n🔍 View on Etherscan:');
    console.log(`https://sepolia.etherscan.io/address/${contractAddress}`);
    
    // Verify deployment
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
      throw new Error('Contract deployment failed - no code at address');
    }
    console.log('✅ Contract code verified on-chain');
    
    // Save deployment info
    const deploymentInfo = {
      address: contractAddress,
      network: networkName,
      chainId: chainId,
      rpcUrl: rpcUrl,
      deployer: wallet.address,
      deployedAt: new Date().toISOString(),
      txHash: txHash,
      explorerUrl: `https://sepolia.etherscan.io/address/${contractAddress}`,
      abi: abi,
    };
    
    const infoPath = path.join(__dirname, '../contracts/deployment.json');
    fs.writeFileSync(infoPath, JSON.stringify(deploymentInfo, null, 2));
    console.log('\n💾 Deployment info saved to: contracts/deployment.json');
    
    console.log('\n📝 Next steps:');
    console.log('1. Set the environment variable in Replit:');
    console.log(`   RENTAL_CONTRACT_ADDRESS=${contractAddress}`);
    console.log('\n2. Update RentalPayment component chain ID from 10000 to 11155111 (Sepolia)');
    console.log('\n3. Restart your application');
    console.log('\n4. Test the rental flow end-to-end');
    console.log('\n5. Later, you can deploy to Mendoza testnet if needed');
    
    return contractAddress;
    
  } catch (error: any) {
    console.error('\n❌ Deployment failed:', error.message);
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log('\n💡 Get more Sepolia ETH from faucets listed above');
    } else {
      console.log('\n🐛 Full error:', error);
    }
    process.exit(1);
  }
}

main()
  .then((address) => {
    console.log('\n✨ Deployment complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
