import { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import apiClient from "../lib/apiClient";
import toast from "react-hot-toast";

interface DistractResult {
  suggestionType: string;
  logId: string;
  content?: { text: string; source: string | null; category: string };
  nearbyPlace?: { name: string; address: string; types: string[] } | null;
  pingBuddy?: { sent: boolean; groupId?: string };
}

export default function DistractPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DistractResult | null>(null);
  const [feedback, setFeedback] = useState("");

  const triggerDistract = async () => {
    setLoading(true);
    setResult(null);
    setFeedback("");
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      if (navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => { lat = pos.coords.latitude; lng = pos.coords.longitude; resolve(); },
            () => resolve(),
            { timeout: 3000 }
          );
        });
      }
      const { data } = await apiClient.post("/distract-me", { lat, lng });
      setResult(data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.error || "Failed to get suggestion");
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const sendFeedback = async (helped: boolean) => {
    if (!result) return;
    try {
      await apiClient.post("/distract-me/feedback", { logId: result.logId, helped });
      setFeedback(helped ? "💙 Glad it helped!" : "🔄 Trying again...");
      if (!helped) setTimeout(triggerDistract, 1000);
    } catch {
      toast.error("Feedback failed");
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark px-4 pt-6">
      <h1 className="text-2xl font-bold text-white mb-4">Distract Me</h1>
      <button
        onClick={triggerDistract}
        disabled={loading}
        className="w-full bg-linear-to-r from-brand-purple to-brand-pink py-3 rounded-xl text-white font-semibold disabled:opacity-50"
      >
        {loading ? "Loading..." : "Get a suggestion"}
      </button>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-6"
        >
          {result.content && (
            <blockquote className="text-white italic">“{result.content.text}”</blockquote>
          )}
          {result.nearbyPlace && (
            <div>
              <p className="text-white font-semibold">📍 {result.nearbyPlace.name}</p>
              <p className="text-gray-400 text-sm">{result.nearbyPlace.address}</p>
            </div>
          )}
          {result.pingBuddy && (
            <p className="text-white">
              {result.pingBuddy.sent ? "💙 Support ping sent to your group" : "Join a group to ping buddies"}
            </p>
          )}
          {!feedback && (
            <div className="flex gap-3 mt-4">
              <button onClick={() => sendFeedback(true)} className="flex-1 bg-emerald-500/20 py-2 rounded-xl text-emerald-400">
                Helped
              </button>
              <button onClick={() => sendFeedback(false)} className="flex-1 bg-blue-500/20 py-2 rounded-xl text-blue-400">
                Try again
              </button>
            </div>
          )}
          {feedback && <p className="text-center text-gray-300 mt-3">{feedback}</p>}
        </motion.div>
      )}
    </div>
  );
}