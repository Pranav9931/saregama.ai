import { ethers, BrowserProvider, Contract } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, SEPOLIA_CHAIN_ID } from "@shared/contract";

export class FrontendContractClient {
  private provider: BrowserProvider | null = null;
  private contract: Contract | null = null;

  async connect() {
    if (typeof window.ethereum === "undefined") {
      throw new Error("MetaMask is required for on-chain transactions. Please install MetaMask browser extension to rent tracks.");
    }

    try {
      this.provider = new ethers.BrowserProvider(window.ethereum as any);
      
      const network = await this.provider.getNetwork();
      if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
        try {
          await (window.ethereum as any).request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}` }],
          });
          
          this.provider = new ethers.BrowserProvider(window.ethereum as any);
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await (window.ethereum as any).request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: `0x${SEPOLIA_CHAIN_ID.toString(16)}`,
                  chainName: 'Sepolia Testnet',
                  nativeCurrency: {
                    name: 'Sepolia ETH',
                    symbol: 'ETH',
                    decimals: 18
                  },
                  rpcUrls: ['https://sepolia.infura.io/v3/'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io/']
                }],
              });
              
              this.provider = new ethers.BrowserProvider(window.ethereum as any);
            } catch (addError) {
              throw new Error("Failed to add Sepolia network to MetaMask");
            }
          } else {
            throw new Error("Please switch to Sepolia network in MetaMask");
          }
        }
      }

      const signer = await this.provider.getSigner();
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    } catch (error: any) {
      console.error("Contract connection error:", error);
      throw error;
    }
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
