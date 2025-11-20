import { ethers, BrowserProvider, Contract } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, SEPOLIA_CHAIN_ID } from "@shared/contract";

export class FrontendContractClient {
  private provider: BrowserProvider | null = null;
  private contract: Contract | null = null;
  private crossmintWallet: any | null = null;

  setCrossmintWallet(wallet: any) {
    this.crossmintWallet = wallet;
  }

  async connect() {
    // If Crossmint wallet is available, use it (preferred)
    if (this.crossmintWallet) {
      console.log("Using Crossmint wallet for transactions");
      return;
    }

    // Fallback to MetaMask if available
    if (typeof window.ethereum !== "undefined") {
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
        console.error("MetaMask connection error:", error);
        throw error;
      }
    } else {
      throw new Error("No wallet available. Please log in with Crossmint or install MetaMask.");
    }
  }

  async purchaseRental(catalogItemId: string, priceWei: string, walletAddress: string) {
    // Use Crossmint wallet if available
    if (this.crossmintWallet) {
      try {
        console.log("Using Crossmint wallet for transactions");
        
        // Create a custom ethers provider using the Crossmint wallet's signer
        if (!this.crossmintWallet.signer) {
          throw new Error("Crossmint wallet signer not available");
        }

        // Create contract instance with Crossmint wallet's signer
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.crossmintWallet.signer);
        
        console.log("Contract instance created, calling purchaseRental");

        // Call purchaseRental - this will trigger Crossmint's approval UI
        const tx = await contract.purchaseRental(catalogItemId, {
          value: priceWei,
        });

        console.log("Transaction sent:", tx.hash);

        return {
          txHash: tx.hash,
          receipt: null,
        };
      } catch (error: any) {
        console.error("Crossmint transaction error:", error);
        
        // Parse error messages
        if (error.message?.includes("user rejected") || error.message?.includes("User rejected")) {
          throw new Error("User rejected the transaction");
        } else if (error.message?.includes("insufficient funds")) {
          throw new Error("Insufficient funds in wallet");
        }
        
        throw new Error(`Transaction failed: ${error.message || 'Unknown error'}`);
      }
    }

    // Fallback to MetaMask
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
