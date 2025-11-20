import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrowserProvider } from 'ethers';
import type { Profile } from '@shared/schema';

interface WalletContextType {
  walletAddress: string | null;
  profile: Profile | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        alert('Please install MetaMask to use this application');
        setIsConnecting(false);
        return;
      }

      // Request accounts
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const address = accounts[0];

      // Get nonce for signature
      const nonceResponse = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      const { nonce } = await nonceResponse.json();

      // Request signature
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(nonce);

      // Verify signature and get/create profile
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          signature,
          message: nonce,
        }),
      });
      const { profile: userProfile } = await verifyResponse.json();

      setWalletAddress(address);
      setProfile(userProfile);
      localStorage.setItem('connectedWallet', address);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setProfile(null);
    localStorage.removeItem('connectedWallet');
  };

  // Auto-reconnect on page load
  useEffect(() => {
    const savedAddress = localStorage.getItem('connectedWallet');
    if (savedAddress && window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.includes(savedAddress)) {
            setWalletAddress(savedAddress);
            // Fetch profile
            fetch(`/api/profile/${savedAddress}`)
              .then((res) => res.json())
              .then((userProfile) => setProfile(userProfile))
              .catch(() => setWalletAddress(null));
          }
        })
        .catch(console.error);
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        profile,
        isConnected: !!walletAddress,
        isConnecting,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}
