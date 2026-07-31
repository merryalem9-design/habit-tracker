import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { login } from "../lib/authApi";
import apiClient from "../lib/apiClient";
import { useAuthStore } from "../store/authStore";
import { GradientButton } from "../components/ui/GradientButton";
import toast from "react-hot-toast";

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignup) {
        // Step 1: Signup
        const { data } = await apiClient.post("/auth/signup", { email, password });
        setIsVerifying(true);
        if (data.verificationCode) {
          toast.success(`Test Code: ${data.verificationCode}`, { duration: 6000 });
        } else {
          toast.success("Account created! Please check your email for the verification code.");
        }
      } else {
        // Step 3: Login
        const data = await login(email, password);

        // --- Check if a streak was broken while they were away ---
        if (data.streakBroken && data.brokenHabitNames.length > 0) {
          toast.custom((t) => (
            <div
              className="bg-brand-card border border-red-500/50 rounded-2xl p-5 shadow-2xl max-w-sm backdrop-blur-md relative z-999"              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-red-400 text-lg">Streak Broken! 💔</h3>
              <p className="text-gray-300 text-sm mt-1 leading-relaxed">
                Your streak for <strong className="text-white">{data.brokenHabitNames.join(', ')}</strong> was broken because you missed a day. 
                <br />
                <span className="text-gray-400">You can start over fresh today!</span>
              </p>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="mt-4 w-full bg-brand-purple hover:bg-brand-purple/80 py-2.5 rounded-xl text-white text-sm font-semibold transition"
              >
                Got it, start fresh
              </button>
            </div>
          ), { duration: 7000, position: 'bottom-center' });
        }
        // --- End streak check ---

        setAuth(data.user, data.accessToken, data.refreshToken);
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.data.code === "ACCOUNT_NOT_VERIFIED") {
          setIsSignup(true);
          setIsVerifying(true);
          toast.error("You must verify your account first.");
        } else {
          toast.error(err.response?.data?.error || "Authentication failed");
        }
      } else {
        toast.error("An unexpected error occurred");
      }
    }
  };

  const handleVerify = async () => {
    try {
      const { data } = await apiClient.post("/auth/verify", { email, code: verificationCode });
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate("/dashboard");
      toast.success("Account verified! Welcome!");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || "Verification failed");
      }
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      const { data } = await apiClient.post("/auth/send-verification", { email });
      if (data.verificationCode) {
        toast.success(`New Code sent: ${data.verificationCode}`, { duration: 6000 });
      } else {
        toast.success("New verification code sent to your email.");
      }
    } catch {
      toast.error("Failed to resend code");
    } finally {
      setIsResending(false);
    }
  };

  // --- RENDER VERIFICATION VIEW ---
  if (isVerifying) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-brand-dark px-4">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
          <h1 className="text-2xl font-bold text-white">Verify Email</h1>
          <p className="mt-1 text-sm text-gray-400">Enter the 6-digit code sent to {email}</p>
          
          <div className="mt-6 space-y-4">
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white text-center text-2xl tracking-widest placeholder-gray-500 focus:border-brand-purple focus:outline-none"
              maxLength={6}
            />
            
            <GradientButton onClick={handleVerify} className="w-full py-3.5">
              Verify Account
            </GradientButton>

            <div className="flex justify-between text-sm mt-2">
              <button onClick={() => { setIsVerifying(false); setIsSignup(false); }} className="text-gray-400 hover:text-white transition">
                Back to Login
              </button>
              <button onClick={handleResendCode} disabled={isResending} className="text-brand-purple hover:text-brand-pink transition disabled:opacity-50">
                {isResending ? "Sending..." : "Resend Code"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- RENDER LOGIN/SIGNUP VIEW ---
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-brand-dark px-4">
      <motion.div className="absolute inset-0 -z-10" animate={{ background: ["radial-gradient(circle at 20% 30%, #A855F7, transparent 70%)", "radial-gradient(circle at 80% 70%, #EC4899, transparent 70%)", "radial-gradient(circle at 50% 50%, #3B82F6, transparent 70%)"] }} transition={{ duration: 20, repeat: Infinity, repeatType: "mirror" }} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 25 }} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
        <motion.h1 className="bg-linear-to-r from-brand-purple to-brand-pink bg-clip-text text-3xl font-bold text-transparent" initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>{isSignup ? "Create Account" : "Welcome Back"}</motion.h1>
        <p className="mt-1 text-sm text-gray-400">{isSignup ? "Start your recovery journey today" : "Continue your streak"}</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="relative">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-transparent focus:border-brand-purple focus:outline-none" />
            <label className="absolute left-4 top-2 text-xs text-gray-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm">Email</label>
          </div>
          <div className="relative">
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-transparent focus:border-brand-purple focus:outline-none" />
            <label className="absolute left-4 top-2 text-xs text-gray-400">Password</label>
          </div>
          <GradientButton type="submit" className="w-full py-3.5">{isSignup ? "Sign up" : "Log in"}</GradientButton>
        </form>
        <div className="mt-4 flex flex-col items-center gap-2">
          <button onClick={() => setIsSignup(!isSignup)} className="w-full text-center text-sm text-gray-400 transition hover:text-white">{isSignup ? "Already have an account? Log in" : "Need an account? Sign up"}</button>
          {!isSignup && <button onClick={() => navigate("/forgot-password")} className="text-sm text-brand-purple hover:text-brand-pink transition">Forgot password?</button>}
        </div>
      </motion.div>
    </div>
  );
}