import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Auth/Login";
import Register from "@/pages/Auth/Register";
import ForgotPassword from "@/pages/Auth/ForgotPassword";
import ResetPassword from "@/pages/Auth/ResetPassword";
import UserDashboard from "@/pages/User/Dashboard";
import { UserProfile } from "@/pages/UserProfile";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MetadataProvider } from "./contexts/MetadataContext";
import { TimezoneProvider } from "./contexts/TimezoneContext";
import { PlaybackProvider } from "./contexts/PlaybackContext";
import Home from "./pages/Home";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/auth/login" component={Login} />
      <Route path="/auth/register" component={Register} />
      <Route path="/auth/forgot-password" component={ForgotPassword} />
      <Route path="/auth/reset-password" component={ResetPassword} />
      <Route path="/user/dashboard" component={UserDashboard} />
      <Route path="/user/profile" component={UserProfile} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <TimezoneProvider>
        <MetadataProvider>
          <PlaybackProvider>
            <ThemeProvider
              defaultTheme="light"
              // switchable
            >
              <TooltipProvider>
                <Toaster />
                {/* Player em iframe fixo - persiste durante navegação */}
                <iframe
                  src="/player.html"
                  style={{
                    position: 'fixed',
                    bottom: 20,
                    left: 20,
                    width: '360px',
                    height: '600px',
                    border: 'none',
                    borderRadius: '20px',
                    zIndex: 9999,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  }}
                  title="Rádio Social Plus - Player"
                />
                <Router />
              </TooltipProvider>
            </ThemeProvider>
          </PlaybackProvider>
        </MetadataProvider>
      </TimezoneProvider>
    </ErrorBoundary>
  );
}

export default App;
