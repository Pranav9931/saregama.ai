import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { frontendContractClient } from "@/lib/contract";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/contexts/WalletContext";

export function useContractPurchaseRental() {
  const { toast } = useToast();
  const { crossmintWallet, walletAddress } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);

  // Set the Crossmint wallet on the contract client when available
  useEffect(() => {
    if (crossmintWallet) {
      frontendContractClient.setCrossmintWallet(crossmintWallet);
    }
  }, [crossmintWallet]);

  return useMutation({
    mutationFn: async ({ catalogItemId, priceWei }: { catalogItemId: string; priceWei: string }) => {
      setIsConnecting(true);
      try {
        await frontendContractClient.connect();
      } catch (error: any) {
        setIsConnecting(false);
        if (error.message?.includes("Please switch to Sepolia")) {
          toast({
            title: "Wrong Network",
            description: "Please switch to Sepolia network in MetaMask",
            variant: "destructive",
          });
        }
        throw error;
      }
      setIsConnecting(false);

      // Use Crossmint wallet address if available, otherwise try MetaMask
      const userWalletAddress = walletAddress || (window as any).ethereum?.selectedAddress;
      if (!userWalletAddress) {
        throw new Error("Failed to get wallet address");
      }

      const result = await frontendContractClient.purchaseRental(catalogItemId, priceWei, userWalletAddress);

      return { ...result, walletAddress: userWalletAddress };
    },
    onSuccess: async (data, variables) => {
      toast({
        title: "Transaction Submitted!",
        description: "Waiting for blockchain confirmation...",
      });

      if (data.txHash && data.walletAddress) {
        // Poll for transaction confirmation
        let attempts = 0;
        const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max
        
        const pollForConfirmation = async (): Promise<boolean> => {
          try {
            const response = await apiRequest("POST", "/api/contract/rentals/verify", {
              txHash: data.txHash,
              walletAddress: data.walletAddress,
              catalogItemId: variables.catalogItemId,
            });

            toast({
              title: "Rental Confirmed!",
              description: "Your rental has been verified and is now active",
            });

            queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
            queryClient.invalidateQueries({ queryKey: ["/api/contract/rentals"] });
            return true;
          } catch (error: any) {
            attempts++;
            const errorMessage = error.error || error.message || "Verification failed";
            
            // If transaction not found or not confirmed yet, keep polling
            if ((errorMessage.includes("not found") || errorMessage.includes("not confirmed")) && attempts < maxAttempts) {
              console.log(`Waiting for confirmation... (attempt ${attempts}/${maxAttempts})`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
              return pollForConfirmation();
            }
            
            // Other errors or max attempts reached
            console.error("Failed to verify rental:", error);
            toast({
              title: "Verification Failed",
              description: errorMessage.includes("not found") 
                ? "Transaction is taking longer than expected. Please check your rentals in a few minutes."
                : "Transaction succeeded but verification failed. Please contact support.",
              variant: "destructive",
              duration: 8000,
            });
            return false;
          }
        };

        await pollForConfirmation();
      }
    },
    onError: (error: any) => {
      console.error("Purchase rental error:", error);
      
      if (error.message?.includes("user rejected") || error.message?.includes("User rejected")) {
        toast({
          title: "Transaction Cancelled",
          description: "You cancelled the transaction",
          variant: "destructive",
        });
      } else if (error.message?.includes("insufficient funds")) {
        toast({
          title: "Insufficient Funds",
          description: "You don't have enough Sepolia ETH for this transaction. Your Crossmint wallet needs to be funded.",
          variant: "destructive",
          duration: 8000,
        });
      } else if (error.message?.includes("Sepolia")) {
        toast({
          title: "Wrong Network",
          description: "Please ensure you're on Sepolia network",
          variant: "destructive",
          duration: 8000,
        });
      } else {
        toast({
          title: "Purchase Failed",
          description: error.message || "Failed to purchase rental. Please check console for details.",
          variant: "destructive",
          duration: 6000,
        });
      }
    },
  });
}

export function useContractCatalogItem(catalogItemId: string | null) {
  return useQuery({
    queryKey: ["/api/contract/catalog", catalogItemId],
    enabled: !!catalogItemId,
    retry: false,
    staleTime: 60000,
  });
}

export function useContractUserRentals(walletAddress: string | null) {
  return useQuery({
    queryKey: ["/api/contract/rentals", walletAddress],
    enabled: !!walletAddress,
    retry: false,
    staleTime: 30000,
  });
}

export function useContractRentalStatus(rentalId: string | null) {
  return useQuery({
    queryKey: ["/api/contract/rental", rentalId, "status"],
    enabled: !!rentalId,
    retry: false,
    refetchInterval: 10000,
  });
}

export function useContractInfo() {
  return useQuery({
    queryKey: ["/api/contract/info"],
    staleTime: Infinity,
  });
}
