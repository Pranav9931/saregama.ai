import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CrossmintProvider, CrossmintAuthProvider } from "@crossmint/client-sdk-react-ui";
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
    console.error('VITE_CROSSMINT_CLIENT_API_KEY environment variable is not set');
  }

  return (
    <QueryClientProvider client={queryClient}>
      <CrossmintProvider apiKey={crossmintApiKey}>
        <CrossmintAuthProvider
          loginMethods={["email", "google", "twitter"]}
        >
          <WalletProvider>
            <ChunkFetchProvider>
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </ChunkFetchProvider>
          </WalletProvider>
        </CrossmintAuthProvider>
      </CrossmintProvider>
    </QueryClientProvider>
  );
}

export default App;
