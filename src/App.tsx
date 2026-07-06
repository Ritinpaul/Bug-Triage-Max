import { Routes, Route } from "react-router";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Issues from "./pages/Issues";
import BugDetail from "./pages/BugDetail";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import ReleaseNotes from "./pages/ReleaseNotes";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import Docs from "./pages/Docs";
import Integrations from "./pages/Integrations";
import Changelog from "./pages/Changelog";
import { Toaster } from "sonner";

export default function App() {
  return (
    <>
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Docs routes */}
      <Route path="/docs" element={<Docs />} />
      <Route path="/docs/:section" element={<Docs />} />
      <Route path="/docs/:section/:subsection" element={<Docs />} />
      
      {/* Changelog route */}
      <Route path="/changelog" element={<Changelog />} />

      {/* Protected app routes — unauthenticated users are redirected to /login */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/issues/:id" element={<BugDetail />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/release-notes" element={<ReleaseNotes />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    <Toaster position="top-right" richColors />
    </>
  );
}
