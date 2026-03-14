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
import { RadioPlayerV2 } from "./components/RadioPlayerV2";
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
                {/* Player persiste durante navegação */}
                <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
                  <RadioPlayerV2 />
                </div>
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
