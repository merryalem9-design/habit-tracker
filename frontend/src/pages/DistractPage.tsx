import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import apiClient from "../lib/apiClient";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

type DistractType = "quote" | "coffee" | "ping_buddy" | "support_group";

interface DistractResult {
  suggestionType: DistractType;
  logId: string;
  content?: { text: string; source: string | null; category: string };
  nearbyPlace?: { name: string; address: string; types: string[] } | null;
  pingBuddy?: {
    sent: boolean;
    matched?: boolean;
    conversationId?: string;
    otherUser?: string;
    emergencyContact?: { name: string; phone: string } | null;
  };
  supportGroup?: { 
    sent: boolean; 
    groupId?: string;
    needsSelection?: boolean;
    groups?: { id: string; category: string }[];
    error?: string;
  };
}

const DISTRACT_OPTIONS = [
  { value: "quote" as const, label: "📖 Get a Quote", description: "Read a motivational or recovery quote" },
  { value: "coffee" as const, label: "☕ Go to a Coffee Shop", description: "Find a nearby coffee shop to take a break" },
  { value: "ping_buddy" as const, label: "💙 Ping Your Buddy", description: "Send a support message to your 1‑on‑1 match" },
  { value: "support_group" as const, label: "👥 Support Group Ping", description: "Send a support request to your group" },
];

export default function DistractPage() {
  const [selectedType, setSelectedType] = useState<DistractType>("quote");
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false); 
  const [result, setResult] = useState<DistractResult | null>(null);
  const [feedback, setFeedback] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [supportGroups, setSupportGroups] = useState<{ id: string; category: string }[]>([]);
  const navigate = useNavigate();

  const prevSelectedType = useRef<DistractType>("quote");

  useEffect(() => {
    if (selectedType === "support_group") {
      // FIXED: Wrapped synchronous state updates inside queueMicrotask to satisfy ESLint
      queueMicrotask(() => {
        if (prevSelectedType.current !== selectedType) {
          setResult(null);
          setFeedback("");
          setLoadingGroups(true);
        }
        prevSelectedType.current = selectedType;
      });
      
      apiClient.get("/groups/mine").then((res) => {
        const groups = res.data.map((m: { group: { id: string; category: string } }) => m.group);
        setSupportGroups(groups);
        if (groups.length > 0) {
          setSelectedGroupId((prev) => prev || groups[0].id);
        }
      }).catch(() => {
        toast.error("Failed to load your groups");
      }).finally(() => {
        // Ensure loading stops regardless of success or failure
        setLoadingGroups(false);
      });
    } else {
      // Existing safe queueMicrotask usage for the else block
      queueMicrotask(() => {
        setSupportGroups([]);
        setSelectedGroupId("");
        setLoadingGroups(false);
      });
      prevSelectedType.current = "quote";
    }
  }, [selectedType]);

  const triggerDistract = async () => {
    if (loadingGroups) {
      toast.error("Still loading your groups. Please wait a moment.");
      return;
    }

    setLoading(true);
    setResult(null);
    setFeedback("");
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      if (selectedType === "coffee") {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => { lat = pos.coords.latitude; lng = pos.coords.longitude; resolve(); },
            () => resolve(),
            { timeout: 3000 }
          );
        });
      }

      const finalGroupId = selectedGroupId || (supportGroups.length > 0 ? supportGroups[0].id : undefined);

      const payload: { 
        type: DistractType; 
        lat?: number; 
        lng?: number; 
        groupId?: string;
      } = { 
        type: selectedType, 
        lat, 
        lng 
      };
      
      if (selectedType === "support_group" && finalGroupId) {
        payload.groupId = finalGroupId;
      }

      const { data } = await apiClient.post("/distract-me", payload);
      
      if (data.suggestionType === "support_group") {
        if (data.supportGroup?.sent) {
          toast.success("💙 Support ping sent to your group!");
          setResult(data);
        } else {
          const errorMsg = data.supportGroup?.error || data.error || "Could not ping the selected group.";
          toast.error(errorMsg);
          setResult(null); 
          return;
        }
      } else {
        setResult(data);
      }

      if (data.suggestionType === "ping_buddy" && data.pingBuddy?.sent) {
        toast.success("💬 Support message sent to your match!");
        if (data.pingBuddy.conversationId) {
          setTimeout(() => {
            if (confirm("Your match received your message. Would you like to go to the chat?")) {
              navigate(`/chat/${data.pingBuddy.conversationId}`);
            }
          }, 1500);
        }
      }
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
    <div className="min-h-screen bg-brand-dark px-4 pt-6 pb-32">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">🧘 Distract Me</h1>
        <p className="text-gray-400 text-sm mb-6">
          Choose an activity to help you through a tough moment.
        </p>

        <div className="mb-4">
          <label className="text-sm text-gray-400 block mb-2">Choose a distraction:</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as DistractType)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-brand-purple focus:outline-none"
          >
            {DISTRACT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-brand-dark">
                {opt.label} – {opt.description}
              </option>
            ))}
          </select>
        </div>

        {selectedType === "support_group" && supportGroups.length > 0 && (
          <div className="mb-4">
            <label className="text-sm text-gray-400 block mb-2">Select a group to ping:</label>
            <select
              value={selectedGroupId || (supportGroups.length > 0 ? supportGroups[0].id : "")}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-brand-purple focus:outline-none"
            >
              {supportGroups.map((g) => (
                <option key={g.id} value={g.id}>{g.category}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={triggerDistract}
          disabled={loading || loadingGroups || (selectedType === "support_group" && supportGroups.length === 0)}
          className="w-full bg-linear-to-r from-brand-purple to-brand-pink py-3 rounded-xl text-white font-semibold disabled:opacity-50"
        >
          {loading ? "Loading..." : (loadingGroups ? "Loading groups..." : (selectedType === "support_group" && supportGroups.length > 1 ? "Send Support Ping" : "Get Suggestion"))}
        </button>

        {selectedType === "support_group" && supportGroups.length === 0 && !loading && !loadingGroups && (
          <p className="text-yellow-400 text-sm mt-2 text-center">
            You are not in any groups yet. Join a group from your dashboard first.
          </p>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            {result.suggestionType === "quote" && result.content && (
              <>
                <blockquote className="text-white italic text-lg">
                  “{result.content.text}”
                </blockquote>
                {result.content.source && (
                  <p className="text-gray-400 text-sm mt-2">— {result.content.source}</p>
                )}
              </>
            )}

            {result.suggestionType === "coffee" && result.nearbyPlace && (
              <div>
                <p className="text-white font-semibold text-lg">☕ {result.nearbyPlace.name}</p>
                <p className="text-gray-400 text-sm mt-1">{result.nearbyPlace.address}</p>
                <p className="text-gray-500 text-xs mt-2">
                  Take a break, enjoy a warm drink, and breathe.
                </p>
              </div>
            )}
            {result.suggestionType === "coffee" && !result.nearbyPlace && (
              <p className="text-gray-300">
                No coffee shops found nearby. Try again or choose another option.
              </p>
            )}

            {result.suggestionType === "ping_buddy" && result.pingBuddy && (
              <div>
                {result.pingBuddy.sent && result.pingBuddy.matched ? (
                  <>
                    <p className="text-white font-semibold">💙 Message sent to {result.pingBuddy.otherUser || "your match"}!</p>
                    <p className="text-gray-400 text-sm mt-1">They will see it when they open the chat.</p>
                  </>
                ) : result.pingBuddy.emergencyContact ? (
                  <div>
                    <p className="text-white font-semibold">📞 Contact your emergency contact</p>
                    <p className="text-gray-300 mt-1">{result.pingBuddy.emergencyContact.name}</p>
                    <a
                      href={`tel:${result.pingBuddy.emergencyContact.phone}`}
                      className="text-brand-purple text-sm block mt-1"
                    >
                      {result.pingBuddy.emergencyContact.phone}
                    </a>
                  </div>
                ) : (
                  <div>
                    <p className="text-white font-semibold">No match found</p>
                    <p className="text-gray-400 text-sm mt-1">
                      You don't have a 1‑on‑1 match yet. You can:
                    </p>
                    <ul className="text-gray-400 text-sm list-disc list-inside mt-2 space-y-1">
                      <li>Request a 1‑on‑1 pairing from the Inbox</li>
                      <li>Add an emergency contact in your profile</li>
                      <li>Try the "Support Group" option instead</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {result.suggestionType === "support_group" && result.supportGroup?.sent && (
              <div>
                <p className="text-white font-semibold">💙 Support ping sent!</p>
                <p className="text-gray-400 text-sm mt-1">
                  Your group has been notified that you need support.
                  Someone will reach out soon.
                </p>
              </div>
            )}

            {!feedback && result.suggestionType !== "support_group" && result.suggestionType !== "ping_buddy" && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => sendFeedback(true)}
                  className="flex-1 bg-emerald-500/20 py-2 rounded-xl text-emerald-400 hover:bg-emerald-500/30 transition"
                >
                  Helped 💚
                </button>
                <button
                  onClick={() => sendFeedback(false)}
                  className="flex-1 bg-blue-500/20 py-2 rounded-xl text-blue-400 hover:bg-blue-500/30 transition"
                >
                  Try again 🔄
                </button>
              </div>
            )}
            {feedback && <p className="text-center text-gray-300 mt-3">{feedback}</p>}
          </motion.div>
        )}
      </div>
    </div>
  );
}