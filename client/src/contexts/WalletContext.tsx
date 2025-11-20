import { createContext, useContext, ReactNode } from 'react';
import { useAuth, useWallet as useCrossmintWallet } from '@crossmint/client-sdk-react-ui';
import type { Profile } from '@shared/schema';
import { useState, useEffect } from 'react';

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
  const { login, logout, user, jwt } = useAuth();
  const { wallet, status: walletStatus } = useCrossmintWallet();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const walletAddress = wallet?.address || null;
  const isConnected = !!walletAddress;

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      await login();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    logout();
    setProfile(null);
  };

  useEffect(() => {
    if (walletAddress && jwt) {
      fetch(`/api/profile/${walletAddress}`)
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          return null;
        })
        .then((userProfile) => {
          if (userProfile) {
            setProfile(userProfile);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch profile:', err);
        });
    } else {
      setProfile(null);
    }
  }, [walletAddress, jwt]);

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        profile,
        isConnected,
        isConnecting: isConnecting || walletStatus === 'in-progress',
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
