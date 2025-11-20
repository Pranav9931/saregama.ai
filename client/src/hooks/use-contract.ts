import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { frontendContractClient } from "@/lib/contract";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useContractPurchaseRental() {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

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

      const result = await frontendContractClient.purchaseRental(catalogItemId, priceWei);
      
      const walletAddress = (window as any).ethereum?.selectedAddress;
      if (!walletAddress) {
        throw new Error("Failed to get wallet address");
      }

      return { ...result, walletAddress };
    },
    onSuccess: async (data, variables) => {
      toast({
        title: "Rental Purchased!",
        description: `Transaction: ${data.txHash.slice(0, 10)}...`,
      });

      if (data.txHash && data.walletAddress) {
        try {
          await apiRequest("POST", "/api/contract/rentals/verify", {
            txHash: data.txHash,
            walletAddress: data.walletAddress,
            catalogItemId: variables.catalogItemId,
          });

          queryClient.invalidateQueries({ queryKey: ["/api/rentals"] });
          queryClient.invalidateQueries({ queryKey: ["/api/contract/rentals"] });
        } catch (error) {
          console.error("Failed to verify rental:", error);
          toast({
            title: "Verification Warning",
            description: "Transaction succeeded but rental verification failed. Please contact support.",
            variant: "destructive",
          });
        }
      }
    },
    onError: (error: any) => {
      console.error("Purchase rental error:", error);
      
      if (error.message?.includes("user rejected")) {
        toast({
          title: "Transaction Cancelled",
          description: "You cancelled the transaction",
          variant: "destructive",
        });
      } else if (error.message?.includes("insufficient funds")) {
        toast({
          title: "Insufficient Funds",
          description: "You don't have enough ETH for this transaction",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Purchase Failed",
          description: error.message || "Failed to purchase rental",
          variant: "destructive",
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
