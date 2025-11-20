import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Wallet, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import WalletButton from '@/components/WalletButton';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { nanoid } from 'nanoid';
import { ethers } from 'ethers';

interface PricingTier {
  durationDays: number;
  priceEth: string;
  label: string;
  popular?: boolean;
}

interface PricingResponse {
  contractAddress: string;
  tiers: PricingTier[];
}

interface RentalPaymentProps {
  catalogItemId: string;
  onSuccess?: () => void;
}

export default function RentalPayment({ catalogItemId, onSuccess }: RentalPaymentProps) {
  const { walletAddress, isConnected } = useWallet();
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [paymentStep, setPaymentStep] = useState<'select' | 'paying' | 'verifying' | 'complete'>('select');
  const [txHash, setTxHash] = useState<string>('');

  // Fetch pricing tiers and contract address from backend
  const { data: pricingData, isLoading: loadingPricing } = useQuery<PricingResponse>({
    queryKey: ['/api/rentals/pricing'],
    staleTime: 60000,
  });

  const paymentMutation = useMutation({
    mutationFn: async (tier: PricingTier) => {
      if (!walletAddress || !isConnected) {
        throw new Error('Wallet not connected');
      }

      if (!pricingData?.contractAddress) {
        throw new Error('Rental contract not deployed. Please contact support.');
      }

      setPaymentStep('paying');

      // Get MetaMask provider
      if (!window.ethereum) {
        throw new Error('MetaMask not installed. Please install MetaMask to continue.');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Check and switch to Mendoza network if needed
      const MENDOZA_CHAIN_ID = '0x2710'; // 10000 in hex
      const network = await provider.getNetwork();
      
      if (network.chainId.toString() !== '10000') {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: MENDOZA_CHAIN_ID }],
          });
        } catch (switchError: any) {
          // Chain not added to MetaMask, try adding it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: MENDOZA_CHAIN_ID,
                  chainName: 'Arkiv Mendoza Testnet',
                  rpcUrls: ['https://mendoza-testnet-rpc.arkiv.network'],
                  nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                  blockExplorerUrls: ['https://explorer.arkiv.network'],
                }],
              });
            } catch (addError) {
              throw new Error('Failed to add Mendoza network to MetaMask');
            }
          } else if (switchError.code === 4001) {
            setPaymentStep('select');
            throw new Error('Network switch cancelled. Please switch to Mendoza network in MetaMask and try again.');
          } else {
            throw switchError;
          }
        }
      }
      
      // Re-get provider after network switch to ensure we're on correct network
      const updatedProvider = new ethers.BrowserProvider(window.ethereum);

      const signer = await updatedProvider.getSigner();
      const contractAddress = pricingData.contractAddress;

      // Generate unique rental ID
      const rentalId = nanoid();

      // Encode function call: createRental(string rentalId, string catalogItemId, uint256 durationDays)
      const iface = new ethers.Interface([
        'function createRental(string rentalId, string catalogItemId, uint256 durationDays) payable'
      ]);
      
      const data = iface.encodeFunctionData('createRental', [
        rentalId,
        catalogItemId,
        tier.durationDays
      ]);

      // Send transaction via MetaMask
      let tx;
      try {
        tx = await signer.sendTransaction({
          to: contractAddress,
          value: ethers.parseEther(tier.priceEth),
          data,
        });
      } catch (txError: any) {
        if (txError.code === 4001 || txError.code === 'ACTION_REJECTED') {
          throw new Error('Transaction cancelled by user');
        }
        throw new Error(txError.message || 'Transaction failed');
      }

      toast({
        title: 'Transaction Sent',
        description: 'Waiting for blockchain confirmation...',
      });

      setPaymentStep('verifying');
      
      // Wait for transaction confirmation
      const receipt = await tx.wait(1);
      
      if (!receipt || receipt.status !== 1) {
        throw new Error('Transaction failed on blockchain');
      }

      setTxHash(receipt.hash);

      // Verify payment on backend and create rental
      const response = await fetch('/api/rentals/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rentalId,
          walletAddress,
          catalogItemId,
          txHash: receipt.hash,
          durationDays: tier.durationDays,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.details || 'Payment verification failed');
      }

      const responseData = await response.json();

      return responseData;
    },
    onSuccess: () => {
      setPaymentStep('complete');
      queryClient.invalidateQueries({ queryKey: ['/api/rentals'] });
      toast({
        title: 'Rental Successful!',
        description: 'Track has been added to your library',
      });
      
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    },
    onError: (error: any) => {
      setPaymentStep('select');
      setSelectedTier(null);
      
      const errorMessage = error.message || 'Something went wrong. Please try again.';
      const isUserCancelled = errorMessage.includes('cancelled') || errorMessage.includes('rejected');
      
      toast({
        title: isUserCancelled ? 'Transaction Cancelled' : 'Payment Failed',
        description: errorMessage,
        variant: isUserCancelled ? 'default' : 'destructive',
      });
    },
  });

  const handlePay = async (tier: PricingTier) => {
    setSelectedTier(tier);
    await paymentMutation.mutateAsync(tier);
  };

  if (loadingPricing) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading pricing...</p>
        </div>
      </Card>
    );
  }

  if (!pricingData?.tiers || pricingData.tiers.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h3 className="font-semibold text-lg mb-2">Rental Unavailable</h3>
          <p className="text-sm text-muted-foreground">
            Pricing information is not available. Please try again later.
          </p>
        </div>
      </Card>
    );
  }

  const pricingTiers = pricingData.tiers;

  if (paymentStep === 'complete') {
    return (
      <Card className="p-6">
        <div className="text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h3 className="font-semibold text-xl mb-2">Rental Complete!</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your rental has been activated and the track is now in your library
          </p>
          {txHash && (
            <a
              href={`https://explorer.arkiv.network/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline font-mono"
              data-testid="link-transaction"
            >
              View Transaction: {txHash.substring(0, 10)}...
            </a>
          )}
        </div>
      </Card>
    );
  }

  if (paymentStep === 'paying' || paymentStep === 'verifying') {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
          <h3 className="font-semibold text-lg mb-2">
            {paymentStep === 'paying' ? 'Processing Payment...' : 'Verifying Transaction...'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {paymentStep === 'paying' 
              ? 'Please confirm the transaction in MetaMask' 
              : 'Waiting for blockchain confirmation...'}
          </p>
          {selectedTier && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">{selectedTier.label}</span>
              <span className="text-sm font-mono font-semibold">{selectedTier.priceEth} ETH</span>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="font-semibold text-lg mb-1">Rent this Track</h3>
        <p className="text-sm text-muted-foreground">
          {isConnected 
            ? 'Choose your rental period and pay with ETH' 
            : 'Connect your wallet to rent this track'}
        </p>
      </div>

      {!isConnected ? (
        <Card className="p-6">
          <div className="text-center">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Connect your wallet to view pricing and rent this track
            </p>
            <WalletButton />
          </div>
        </Card>
      ) : (
        <>
      <div className="grid gap-4">
        {pricingTiers.map((tier) => (
          <Card
            key={tier.durationDays}
            className={`p-4 cursor-pointer transition-all hover-elevate ${
              tier.popular ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => !paymentMutation.isPending && handlePay(tier)}
            data-testid={`card-pricing-tier-${tier.durationDays}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">{tier.label}</span>
              </div>
              {tier.popular && (
                <Badge variant="default" className="text-xs" data-testid="badge-popular">
                  Popular
                </Badge>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold font-mono" data-testid={`text-price-${tier.durationDays}`}>
                {tier.priceEth} ETH
              </div>
              <Button
                size="sm"
                disabled={paymentMutation.isPending}
                data-testid={`button-rent-${tier.durationDays}`}
              >
                {paymentMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Rent Now'
                )}
              </Button>
            </div>

            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wallet className="w-3 h-3" />
                <span>Stored on Arkiv • Automatic expiration</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 p-4 bg-muted rounded-md">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Payments are processed on Arkiv blockchain (Mendoza testnet).
            Your rental will automatically expire after the selected period.
          </p>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
