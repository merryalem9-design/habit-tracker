import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import GroupFeedPage from "./pages/GroupFeedPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ChatListPage from "./pages/ChatListPage";
import ChatPage from "./pages/ChatPage";
import DistractPage from "./pages/DistractPage";
import ProfilePage from "./pages/ProfilePage";
import Layout from "./components/Layout";
import "./App.css";

function AppContent() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Auth routes (no layout) */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes with Layout (bottom nav) */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatListPage />} />
          <Route path="/chat/:conversationId" element={<ChatPage />} />
          <Route path="/distract" element={<DistractPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Group feed (no bottom nav – uses its own header) */}
        <Route
          path="/groups/:groupId"
          element={
            <ProtectedRoute>
              <GroupFeedPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "#1E293B",
            color: "#F8FAFC",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
          },
        }}
      />
      <AppContent />
    </BrowserRouter>
  );
}

export default App;