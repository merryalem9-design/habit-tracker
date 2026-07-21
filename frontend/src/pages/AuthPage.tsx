import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { login, signup } from "../lib/authApi";
import { useAuthStore } from "../store/authStore";

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.login);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = isSignup ? await signup(email, password) : await login(email, password);
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate("/dashboard");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || "Something went wrong");
      } else {
        setError("An unexpected error occurred");
      }
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto" }}>
      <h1>{isSignup ? "Create account" : "Log in"}</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 8 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          style={{ display: "block", width: "100%", marginBottom: 12, padding: 8 }}
        />
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" style={{ width: "100%", padding: 10 }}>
          {isSignup ? "Sign up" : "Log in"}
        </button>
      </form>
      <button
        onClick={() => setIsSignup(!isSignup)}
        style={{ marginTop: 12, background: "none", border: "none", color: "blue", cursor: "pointer" }}
      >
        {isSignup ? "Already have an account? Log in" : "Need an account? Sign up"}
      </button>
    </div>
  );
}