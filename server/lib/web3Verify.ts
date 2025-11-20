import { ethers } from 'ethers';

/**
 * Web3 verification utilities for on-chain transaction validation
 */

const RPC_URL = process.env.MENDOZA_RPC_URL || 'https://mendoza-testnet-rpc.arkiv.network';

export interface TxVerificationResult {
  isValid: boolean;
  amount?: string;
  from?: string;
  to?: string;
  rentalId?: string;
  catalogItemId?: string;
  durationDays?: number;
  error?: string;
}

/**
 * Verify a rental payment transaction on-chain
 * Checks that:
 * 1. Transaction exists and is successful
 * 2. Transaction is to the rental contract
 * 3. Transaction value matches expected price
 * 4. Transaction emitted RentalCreated event with matching parameters
 */
export async function verifyRentalPaymentTx(
  txHash: string,
  expectedRentalId: string,
  expectedWallet: string,
  expectedContract: string,
  expectedDuration: number,
  expectedPrice: string
): Promise<TxVerificationResult> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      return {
        isValid: false,
        error: 'Transaction not found on-chain'
      };
    }

    // Check transaction success
    if (receipt.status !== 1) {
      return {
        isValid: false,
        error: 'Transaction failed on-chain'
      };
    }

    // Get transaction details
    const tx = await provider.getTransaction(txHash);
    
    if (!tx) {
      return {
        isValid: false,
        error: 'Transaction details not found'
      };
    }

    // Verify transaction is to the rental contract
    if (tx.to?.toLowerCase() !== expectedContract.toLowerCase()) {
      return {
        isValid: false,
        error: `Transaction sent to wrong address. Expected ${expectedContract}, got ${tx.to}`
      };
    }

    // Verify sender matches expected wallet
    if (tx.from.toLowerCase() !== expectedWallet.toLowerCase()) {
      return {
        isValid: false,
        error: `Transaction from wrong wallet. Expected ${expectedWallet}, got ${tx.from}`
      };
    }

    // Verify transaction value matches expected price
    const txValue = ethers.formatEther(tx.value);
    const priceDiff = Math.abs(parseFloat(txValue) - parseFloat(expectedPrice));
    
    if (priceDiff > 0.000001) { // Allow tiny difference for precision
      return {
        isValid: false,
        error: `Transaction value mismatch. Expected ${expectedPrice} ETH, got ${txValue} ETH`
      };
    }

    // Parse logs to find RentalCreated event
    // Event signature: RentalCreated(string indexed rentalId, address indexed renter, string catalogItemId, uint256 expiresAt, uint256 paidAmount, uint256 durationDays)
    const rentalCreatedTopic = ethers.id('RentalCreated(string,address,string,uint256,uint256,uint256)');
    
    const rentalCreatedLog = receipt.logs.find(log => 
      log.topics[0] === rentalCreatedTopic
    );

    if (!rentalCreatedLog) {
      return {
        isValid: false,
        error: 'RentalCreated event not found in transaction logs'
      };
    }

    // Decode event parameters
    // Note: Since rentalId and catalogItemId are strings, they are in the data field, not topics
    // Topics: [event signature, renter address]
    const renterFromEvent = '0x' + rentalCreatedLog.topics[1].slice(26); // Remove padding from indexed address

    if (renterFromEvent.toLowerCase() !== expectedWallet.toLowerCase()) {
      return {
        isValid: false,
        error: `Renter address mismatch in event. Expected ${expectedWallet}, got ${renterFromEvent}`
      };
    }

    // Decode data field (rentalId, catalogItemId, expiresAt, paidAmount, durationDays)
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const decodedData = abiCoder.decode(
      ['string', 'string', 'uint256', 'uint256', 'uint256'],
      rentalCreatedLog.data
    );

    const [rentalIdFromEvent, catalogItemIdFromEvent, , , durationDaysFromEvent] = decodedData;

    // Verify rentalId matches
    if (rentalIdFromEvent !== expectedRentalId) {
      return {
        isValid: false,
        error: `Rental ID mismatch in event. Expected ${expectedRentalId}, got ${rentalIdFromEvent}`
      };
    }

    // Verify duration matches
    if (Number(durationDaysFromEvent) !== expectedDuration) {
      return {
        isValid: false,
        error: `Duration mismatch in event. Expected ${expectedDuration}, got ${durationDaysFromEvent}`
      };
    }

    // All checks passed!
    return {
      isValid: true,
      amount: txValue,
      from: tx.from,
      to: tx.to || '',
      rentalId: rentalIdFromEvent,
      catalogItemId: catalogItemIdFromEvent,
      durationDays: Number(durationDaysFromEvent)
    };
  } catch (error: any) {
    console.error('Error verifying transaction:', error);
    return {
      isValid: false,
      error: `Verification failed: ${error.message}`
    };
  }
}

/**
 * Check transaction confirmation count
 */
export async function getConfirmationCount(txHash: string): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      return 0;
    }

    const currentBlock = await provider.getBlockNumber();
    return currentBlock - receipt.blockNumber + 1;
  } catch (error) {
    console.error('Error getting confirmation count:', error);
    return 0;
  }
}

/**
 * Derive function selector from function signature
 */
export function getFunctionSelector(functionSignature: string): string {
  return ethers.id(functionSignature).substring(0, 10);
}

/**
 * Verify webhook signature (for Mimic webhooks)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = ethers.keccak256(
    ethers.toUtf8Bytes(payload + secret)
  );
  return signature === expectedSignature;
}
