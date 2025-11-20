import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, SEPOLIA_CHAIN_ID } from "@shared/contract";

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";

export class ContractClient {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.provider);
  }

  async addCatalogItem(
    catalogItemId: string,
    artistAddress: string,
    priceWei: string,
    rentalDurationDays: number,
    signerPrivateKey: string
  ) {
    const wallet = new ethers.Wallet(signerPrivateKey, this.provider);
    const contractWithSigner = this.contract.connect(wallet) as any;

    const tx = await contractWithSigner.addCatalogItem(
      catalogItemId,
      artistAddress,
      priceWei,
      rentalDurationDays
    );

    const receipt = await tx.wait();
    return receipt;
  }

  async updateCatalogItem(
    catalogItemId: string,
    newPriceWei: string,
    newRentalDurationDays: number,
    isActive: boolean,
    signerPrivateKey: string
  ) {
    const wallet = new ethers.Wallet(signerPrivateKey, this.provider);
    const contractWithSigner = this.contract.connect(wallet) as any;

    const tx = await contractWithSigner.updateCatalogItem(
      catalogItemId,
      newPriceWei,
      newRentalDurationDays,
      isActive
    );

    const receipt = await tx.wait();
    return receipt;
  }

  async getCatalogItem(catalogItemId: string) {
    const item = await this.contract.getCatalogItem(catalogItemId);
    return {
      catalogItemId: item.catalogItemId,
      artistAddress: item.artistAddress,
      priceWei: item.priceWei.toString(),
      rentalDurationDays: Number(item.rentalDurationDays),
      isActive: item.isActive,
      totalRentals: Number(item.totalRentals),
      totalEarnings: item.totalEarnings.toString(),
    };
  }

  async getRental(rentalId: string) {
    const rental = await this.contract.getRental(rentalId);
    return {
      catalogItemId: rental.catalogItemId,
      renter: rental.renter,
      paidAmount: rental.paidAmount.toString(),
      rentalStartTime: Number(rental.rentalStartTime),
      rentalEndTime: Number(rental.rentalEndTime),
      isActive: rental.isActive,
    };
  }

  async getUserRentals(userAddress: string) {
    const rentalIds = await this.contract.getUserRentals(userAddress);
    return rentalIds.map((id: any) => id.toString());
  }

  async isRentalActive(rentalId: string) {
    return await this.contract.isRentalActive(rentalId);
  }

  async getRentalStatus(rentalId: string) {
    const status = await this.contract.getRentalStatus(rentalId);
    return {
      exists: status.exists,
      isActive: status.isActive,
      isExpired: status.isExpired,
      timeRemaining: Number(status.timeRemaining),
    };
  }

  async getOwner() {
    return await this.contract.owner();
  }

  async getPlatformFeePercentage() {
    const fee = await this.contract.platformFeePercentage();
    return Number(fee);
  }

  async getPlatformFeeRecipient() {
    return await this.contract.platformFeeRecipient();
  }

  getContractAddress() {
    return CONTRACT_ADDRESS;
  }

  getProvider() {
    return this.provider;
  }

  getContract() {
    return this.contract;
  }
}

export const contractClient = new ContractClient();
