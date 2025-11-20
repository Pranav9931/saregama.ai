import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CrossmintProvider, CrossmintAuthProvider, CrossmintWalletProvider } from "@crossmint/client-sdk-react-ui";
import { WalletProvider } from "@/contexts/WalletContext";
import { ChunkFetchProvider } from "@/contexts/ChunkFetchContext";
import Browse from "@/pages/Browse";
import Library from "@/pages/Library";
import TrackDetail from "@/pages/TrackDetail";
import Uploads from "@/pages/Uploads";
import Visualizer from "@/pages/Visualizer";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Browse} />
      <Route path="/library" component={Library} />
      <Route path="/uploads" component={Uploads} />
      <Route path="/track/:id" component={TrackDetail} />
      <Route path="/visualizer/:rentalId" component={Visualizer} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const crossmintApiKey = import.meta.env.VITE_CROSSMINT_CLIENT_API_KEY;

  if (!crossmintApiKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold mb-4 text-foreground">Configuration Required</h1>
          <p className="text-muted-foreground mb-4">
            The Crossmint API key is not configured. Please add 
            <code className="px-2 py-1 mx-1 bg-muted rounded">VITE_CROSSMINT_CLIENT_API_KEY</code> 
            to your environment secrets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <CrossmintProvider apiKey={crossmintApiKey}>
        <CrossmintAuthProvider
          loginMethods={["email", "google", "twitter"]}
        >
          <CrossmintWalletProvider
            createOnLogin={{
              chain: "ethereum-sepolia",
              signer: { type: "email" },
            }}
          >
            <WalletProvider>
              <ChunkFetchProvider>
                <TooltipProvider>
                  <Toaster />
                  <Router />
                </TooltipProvider>
              </ChunkFetchProvider>
            </WalletProvider>
          </CrossmintWalletProvider>
        </CrossmintAuthProvider>
      </CrossmintProvider>
    </QueryClientProvider>
  );
}

export default App;
