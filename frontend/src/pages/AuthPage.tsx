import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { login, signup } from '../lib/authApi';
import { useAuthStore } from '../store/authStore';
import { GradientButton } from '../components/ui/GradientButton';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = isSignup
        ? await signup(email, password)
        : await login(email, password);
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-brand-dark px-4">
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 -z-10"
        animate={{
          background: [
            'radial-gradient(circle at 20% 30%, #A855F7, transparent 70%)',
            'radial-gradient(circle at 80% 70%, #EC4899, transparent 70%)',
            'radial-gradient(circle at 50% 50%, #3B82F6, transparent 70%)',
          ],
        }}
        transition={{ duration: 20, repeat: Infinity, repeatType: 'mirror' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
      >
        <motion.h1
          className="bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-3xl font-bold text-transparent"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
        >
          {isSignup ? 'Create Account' : 'Welcome Back'}
        </motion.h1>
        <p className="mt-1 text-sm text-gray-400">
          {isSignup ? 'Start your recovery journey today' : 'Continue your streak'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="relative">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-transparent focus:border-brand-purple focus:outline-none"
            />
            <label className="absolute left-4 top-2 text-xs text-gray-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm">
              Email
            </label>
          </div>
          <div className="relative">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-transparent focus:border-brand-purple focus:outline-none"
            />
            <label className="absolute left-4 top-2 text-xs text-gray-400">
              Password
            </label>
          </div>

          <GradientButton type="submit" className="w-full py-3.5">
            {isSignup ? 'Sign up' : 'Log in'}
          </GradientButton>
        </form>

        <button
          onClick={() => setIsSignup(!isSignup)}
          className="mt-4 w-full text-center text-sm text-gray-400 transition hover:text-white"
        >
          {isSignup
            ? 'Already have an account? Log in'
            : 'Need an account? Sign up'}
        </button>
      </motion.div>
    </div>
  );
}