import { ethers, BrowserProvider, Contract } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, SEPOLIA_CHAIN_ID } from "@shared/contract";

export class FrontendContractClient {
  private provider: BrowserProvider | null = null;
  private contract: Contract | null = null;

  async connect() {
    if (typeof window.ethereum === "undefined") {
      throw new Error("MetaMask is not installed");
    }

    this.provider = new ethers.BrowserProvider(window.ethereum as any);
    
    const network = await this.provider.getNetwork();
    if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
      throw new Error(`Please switch to Sepolia network. Current chain ID: ${network.chainId}`);
    }

    const signer = await this.provider.getSigner();
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  }

  async purchaseRental(catalogItemId: string, priceWei: string) {
    if (!this.contract) {
      await this.connect();
    }

    if (!this.contract) {
      throw new Error("Contract not connected");
    }

    const tx = await this.contract.purchaseRental(catalogItemId, {
      value: priceWei,
    });

    const receipt = await tx.wait();
    
    const rentalPurchasedEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract!.interface.parseLog(log);
        return parsed?.name === "RentalPurchased";
      } catch {
        return false;
      }
    });

    if (rentalPurchasedEvent) {
      const parsed = this.contract.interface.parseLog(rentalPurchasedEvent);
      return {
        rentalId: parsed?.args[0],
        txHash: receipt.hash,
        receipt,
      };
    }

    return {
      txHash: receipt.hash,
      receipt,
    };
  }

  async getCatalogItem(catalogItemId: string) {
    if (!this.contract) {
      await this.connect();
    }

    if (!this.contract) {
      throw new Error("Contract not connected");
    }

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

  async getUserRentals(userAddress: string) {
    if (!this.contract) {
      await this.connect();
    }

    if (!this.contract) {
      throw new Error("Contract not connected");
    }

    const rentalIds = await this.contract.getUserRentals(userAddress);
    return rentalIds.map((id: any) => id.toString());
  }

  async getRental(rentalId: string) {
    if (!this.contract) {
      await this.connect();
    }

    if (!this.contract) {
      throw new Error("Contract not connected");
    }

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

  async isRentalActive(rentalId: string) {
    if (!this.contract) {
      await this.connect();
    }

    if (!this.contract) {
      throw new Error("Contract not connected");
    }

    return await this.contract.isRentalActive(rentalId);
  }

  async getRentalStatus(rentalId: string) {
    if (!this.contract) {
      await this.connect();
    }

    if (!this.contract) {
      throw new Error("Contract not connected");
    }

    const status = await this.contract.getRentalStatus(rentalId);
    return {
      exists: status.exists,
      isActive: status.isActive,
      isExpired: status.isExpired,
      timeRemaining: Number(status.timeRemaining),
    };
  }

  getContractAddress() {
    return CONTRACT_ADDRESS;
  }
}

export const frontendContractClient = new FrontendContractClient();
