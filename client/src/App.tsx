import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/contexts/WalletContext";
import Browse from "@/pages/Browse";
import Library from "@/pages/Library";
import TrackDetail from "@/pages/TrackDetail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Browse} />
      <Route path="/library" component={Library} />
      <Route path="/track/:id" component={TrackDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;
