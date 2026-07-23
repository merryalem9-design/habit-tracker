import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import apiClient from "../lib/apiClient";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post("/auth/request-reset", { email });
      toast.success("Reset code sent to your email");
      navigate("/reset-password", { state: { email } });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || "Something went wrong");
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
        <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
        <p className="text-gray-400 mt-2">Enter your email to receive a reset code.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-brand-purple focus:outline-none"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-r from-brand-purple to-brand-pink py-3 rounded-xl text-white font-semibold disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Code"}
          </button>
        </form>
        <button
          onClick={() => navigate("/login")}
          className="mt-4 text-sm text-gray-400 hover:text-white transition"
        >
          Back to login
        </button>
      </motion.div>
    </div>
  );
}