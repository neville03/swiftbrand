import { Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/Landing";
import { AuthPage } from "./pages/Auth";
import { OnboardingPage } from "./pages/Onboarding";
import { DashboardPage } from "./pages/Dashboard";
import { BrandFoundationPage } from "./pages/BrandFoundation";
import { NewPostPage } from "./pages/NewPost";
import { InsightsPage } from "./pages/Insights";
import { IdeaBankPage } from "./pages/IdeaBank";
import { ContentCalendarPage } from "./pages/ContentCalendar";
import { MediaLibraryPage } from "./pages/MediaLibrary";
import { BrandKitPage } from "./pages/BrandKit";
import { CalendlyEventsPage } from "./pages/CalendlyEvents";
import { UnifiedInboxPage } from "./pages/UnifiedInbox";
import { OpportunityTracker } from "./pages/OpportunityTracker";
import { AIStrategyChatPage } from "./pages/AIStrategyChat";
import { OrganizationTeamPage } from "./pages/OrganizationTeam";
import { SettingsPage } from "./pages/Settings";
import { LinkedInCallbackPage } from "./pages/LinkedInCallback";
import { PublicProfilePage } from "./pages/PublicProfilePage";
import { SharedProjectView } from "./pages/SharedProjectView";
import { ProtectedRoute } from "./components/ProtectedRoute";

function protect(el: React.ReactNode) {
  return <ProtectedRoute>{el}</ProtectedRoute>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/u/:username" element={<PublicProfilePage />} />
      <Route path="/shared/:token" element={<SharedProjectView />} />
      <Route path="/onboarding" element={protect(<OnboardingPage />)} />
      <Route path="/dashboard" element={protect(<DashboardPage />)} />
      <Route path="/brand-foundation" element={protect(<BrandFoundationPage />)} />
      <Route path="/new" element={protect(<NewPostPage />)} />
      <Route path="/insights" element={protect(<InsightsPage />)} />
      <Route path="/ideas" element={protect(<IdeaBankPage />)} />
      <Route path="/calendar" element={protect(<ContentCalendarPage />)} />
      <Route path="/media" element={protect(<MediaLibraryPage />)} />
      <Route path="/brand-kit" element={protect(<BrandKitPage />)} />
      <Route path="/calendly" element={protect(<CalendlyEventsPage />)} />
      <Route path="/inbox" element={protect(<UnifiedInboxPage />)} />
      <Route path="/opportunities" element={protect(<OpportunityTracker />)} />
      <Route path="/strategy-chat" element={protect(<AIStrategyChatPage />)} />
      <Route path="/organization" element={protect(<OrganizationTeamPage />)} />
      <Route path="/settings" element={protect(<SettingsPage />)} />
      <Route path="/auth/callback/linkedin" element={protect(<LinkedInCallbackPage />)} />
    </Routes>
  );
}
