import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import apiClient from "../lib/apiClient";
import { useAuthStore } from "../store/authStore";
import { getSocket } from "../lib/socket";
import toast from "react-hot-toast";

interface Conversation {
  id: string;
  type: "group" | "direct";
  group?: { category: string };
  user1?: { id: string; displayAlias: string };
  user2?: { id: string; displayAlias: string };
  messages: { content: string; createdAt: string }[];
  updatedAt: string;
}

export default function ChatListPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const currentUser = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get("/chat/conversations").then((res) => setConversations(res.data));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on("pair_matched", (data: { conversationId: string }) => {
      toast.success("You've been paired! Opening chat...");
      navigate(`/chat/${data.conversationId}`);
    });
    return () => {
      socket.off("pair_matched");
    };
  }, [navigate]);

  const getTitle = (conv: Conversation) => {
    if (conv.type === "group") return conv.group?.category || "Group Chat";
    if (conv.type === "direct") {
      const other =
        conv.user1?.id === currentUser?.id ? conv.user2 : conv.user1;
      return other?.displayAlias || "Anonymous";
    }
    return "Chat";
  };

  const requestPair = async () => {
    const category = prompt("Enter category for pairing (e.g., Smoking, Exercise):");
    if (!category) return;
    try {
      const { data } = await apiClient.post("/chat/pair", { category });
      if (data.matched) {
        toast.success("Matched! Opening chat...");
        navigate(`/chat/${data.conversationId}`);
      } else {
        toast("You are in queue. We'll notify you when a match is found.", { icon: "⏳" });
      }
    } catch {
      toast.error("Pair request failed");
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark px-4 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">Inbox</h1>
        <button
          onClick={requestPair}
          className="bg-blue-500/20 px-4 py-2 rounded-xl text-blue-400 text-sm hover:bg-blue-500/30 transition"
        >
          + Request 1‑on‑1
        </button>
      </div>

      <div className="space-y-3">
        {conversations.length === 0 && (
          <p className="text-gray-400 text-center mt-10">No conversations yet.</p>
        )}
        {conversations.map((conv) => (
          <motion.div
            key={conv.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition"
            onClick={() => navigate(`/chat/${conv.id}`)}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-white font-semibold">{getTitle(conv)}</h2>
              <span className="text-xs text-gray-500">
                {new Date(conv.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-gray-400 text-sm truncate">
              {conv.messages[0]?.content || "No messages yet"}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}