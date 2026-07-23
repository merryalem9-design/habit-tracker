import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import apiClient from "../lib/apiClient";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || "";
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Email missing. Please restart the process.");
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/auth/reset-password", { email, token, newPassword });
      toast.success("Password reset successful! Please log in.");
      navigate("/login");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || "Reset failed");
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8"
      >
        <h1 className="text-2xl font-bold text-white">Reset Password</h1>
        <p className="text-gray-400 mt-2">Enter the code sent to your email and your new password.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="text"
            placeholder="Reset code"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-brand-purple focus:outline-none"
            required
          />
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-brand-purple focus:outline-none"
            required
            minLength={8}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-r from-brand-purple to-brand-pink py-3 rounded-xl text-white font-semibold disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}