import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { useContractInfo } from '@/hooks/use-contract';
import { CONTRACT_ADDRESS } from '@shared/contract';

interface ContractInfoData {
  contractAddress: string;
  owner: string;
  platformFeePercentage: number;
  platformFeeRecipient: string;
}

export default function ContractInfo() {
  const { data: contractInfo, isLoading } = useContractInfo();

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Smart Contract Info</h3>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </Card>
    );
  }

  if (!contractInfo) {
    return null;
  }

  const info = contractInfo as ContractInfoData;

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Smart Contract Info</h3>
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Contract Address</span>
          <a
            href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1 font-mono text-xs"
          >
            {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Platform Fee</span>
          <span className="font-mono">{(info.platformFeePercentage / 100).toFixed(2)}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Network</span>
          <Badge variant="secondary">Sepolia Testnet</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Owner</span>
          <span className="font-mono text-xs">
            {info.owner.slice(0, 6)}...{info.owner.slice(-4)}
          </span>
        </div>
      </div>
    </Card>
  );
}
