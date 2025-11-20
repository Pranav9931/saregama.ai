import { ethers } from 'ethers';

/**
 * Rental Contract Interface
 * Provides methods to interact with the deployed ArkivRental smart contract
 */

const RENTAL_CONTRACT_ADDRESS = process.env.RENTAL_CONTRACT_ADDRESS;

// ABI for the rental contract (matches ArkivRental.sol)
const RENTAL_CONTRACT_ABI = [
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

export interface RentalPricingTier {
  durationDays: number;
  priceEth: string;
  label: string;
}

export const RENTAL_PRICING_TIERS: RentalPricingTier[] = [
  { durationDays: 7, priceEth: '0.0001', label: '7 Days' },
  { durationDays: 30, priceEth: '0.0003', label: '30 Days' },
  { durationDays: 365, priceEth: '0.0005', label: '1 Year' }
];

export class RentalContractClient {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private wallet?: ethers.Wallet;

  constructor() {
    const rpcUrl = process.env.MENDOZA_RPC_URL || 'https://mendoza-testnet-rpc.arkiv.network';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    if (!RENTAL_CONTRACT_ADDRESS) {
      console.warn('⚠️  RENTAL_CONTRACT_ADDRESS not set - contract interactions will fail');
    }

    this.contract = new ethers.Contract(
      RENTAL_CONTRACT_ADDRESS || ethers.ZeroAddress,
      RENTAL_CONTRACT_ABI,
      this.provider
    );

    // Initialize wallet for admin operations
    const privateKey = process.env.ARKIV_PRIVATE_KEY;
    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
    }
  }

  /**
   * Get the contract address
   */
  getContractAddress(): string {
    return RENTAL_CONTRACT_ADDRESS || '';
  }

  /**
   * Get pricing for a specific duration
   */
  async getPriceForDuration(durationDays: number): Promise<string> {
    if (!RENTAL_CONTRACT_ADDRESS) {
      // Return mock prices if contract not deployed
      const tier = RENTAL_PRICING_TIERS.find(t => t.durationDays === durationDays);
      return tier?.priceEth || '0';
    }

    try {
      const priceWei = await this.contract.getPriceForDuration(durationDays);
      return ethers.formatEther(priceWei);
    } catch (error) {
      console.error('Error getting price from contract:', error);
      const tier = RENTAL_PRICING_TIERS.find(t => t.durationDays === durationDays);
      return tier?.priceEth || '0';
    }
  }

  /**
   * Get all pricing tiers
   */
  async getAllPricingTiers(): Promise<RentalPricingTier[]> {
    return RENTAL_PRICING_TIERS;
  }

  /**
   * Check if a rental is valid on-chain
   */
  async isRentalValid(rentalId: string): Promise<boolean> {
    if (!RENTAL_CONTRACT_ADDRESS) {
      return false;
    }

    try {
      return await this.contract.isRentalValid(rentalId);
    } catch (error) {
      console.error('Error checking rental validity:', error);
      return false;
    }
  }

  /**
   * Get rental details from contract
   */
  async getRentalFromContract(rentalId: string): Promise<any> {
    if (!RENTAL_CONTRACT_ADDRESS) {
      return null;
    }

    try {
      const rental = await this.contract.getRental(rentalId);
      return {
        renter: rental.renter,
        catalogItemId: rental.catalogItemId,
        expiresAt: new Date(Number(rental.expiresAt) * 1000),
        paidAmount: ethers.formatEther(rental.paidAmount),
        durationDays: Number(rental.durationDays),
        isActive: rental.isActive,
        mimicTaskId: rental.mimicTaskId
      };
    } catch (error) {
      console.error('Error getting rental from contract:', error);
      return null;
    }
  }

  /**
   * Update Mimic task ID for a rental (admin only)
   */
  async updateMimicTaskId(rentalId: string, mimicTaskId: string): Promise<boolean> {
    if (!RENTAL_CONTRACT_ADDRESS || !this.wallet) {
      console.warn('Cannot update Mimic task ID: contract not deployed or wallet not configured');
      return false;
    }

    try {
      const contractWithSigner = this.contract.connect(this.wallet) as any;
      const tx = await contractWithSigner.updateMimicTaskId(rentalId, mimicTaskId);
      await tx.wait();
      console.log(`✅ Updated Mimic task ID for rental ${rentalId}: ${mimicTaskId}`);
      return true;
    } catch (error) {
      console.error('Error updating Mimic task ID:', error);
      return false;
    }
  }

  /**
   * Expire a rental manually (admin only)
   */
  async expireRental(rentalId: string): Promise<boolean> {
    if (!RENTAL_CONTRACT_ADDRESS || !this.wallet) {
      console.warn('Cannot expire rental: contract not deployed or wallet not configured');
      return false;
    }

    try {
      const contractWithSigner = this.contract.connect(this.wallet) as any;
      const tx = await contractWithSigner.expireRental(rentalId);
      await tx.wait();
      console.log(`✅ Expired rental ${rentalId}`);
      return true;
    } catch (error) {
      console.error('Error expiring rental:', error);
      return false;
    }
  }

  /**
   * Get contract balance (admin only)
   */
  async getContractBalance(): Promise<string> {
    if (!RENTAL_CONTRACT_ADDRESS) {
      return '0';
    }

    try {
      const balance = await this.contract.getBalance();
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting contract balance:', error);
      return '0';
    }
  }

  /**
   * Withdraw funds from contract (admin only)
   */
  async withdrawFunds(): Promise<boolean> {
    if (!RENTAL_CONTRACT_ADDRESS || !this.wallet) {
      console.warn('Cannot withdraw funds: contract not deployed or wallet not configured');
      return false;
    }

    try {
      const contractWithSigner = this.contract.connect(this.wallet) as any;
      const tx = await contractWithSigner.withdrawFunds();
      await tx.wait();
      console.log('✅ Withdrew funds from rental contract');
      return true;
    } catch (error) {
      console.error('Error withdrawing funds:', error);
      return false;
    }
  }
}

// Export singleton instance
export const rentalContractClient = new RentalContractClient();
