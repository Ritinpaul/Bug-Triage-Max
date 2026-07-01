import { Routes, Route } from "react-router";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Issues from "./pages/Issues";
import BugDetail from "./pages/BugDetail";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import ReleaseNotes from "./pages/ReleaseNotes";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/issues/:id" element={<BugDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/release-notes" element={<ReleaseNotes />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
