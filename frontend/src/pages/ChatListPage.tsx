import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import apiClient from "../lib/apiClient";
import { useAuthStore } from "../store/authStore";
import { getSocket } from "../lib/socket";
import toast from "react-hot-toast";
import axios from "axios";

interface Conversation {
  id: string;
  type: "group" | "direct";
  group?: { category: string };
  user1?: { id: string; displayAlias: string };
  user2?: { id: string; displayAlias: string };
  messages: { content: string; createdAt: string }[];
  updatedAt: string;
  unreadCount?: number; // new field
}

interface QueueStatus {
  category: string;
  position: number;
  inQueue: boolean;
}

export default function ChatListPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [queueStatuses, setQueueStatuses] = useState<QueueStatus[]>([]);
  const currentUser = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  // ─── Load conversations ──────────────────────────────────────
  useEffect(() => {
    apiClient.get("/chat/conversations").then((res) => setConversations(res.data));
  }, []);

  // ─── Load queue statuses ─────────────────────────────────────
  const fetchQueueStatuses = async () => {
    try {
      const res = await apiClient.get("/chat/pair/status");
      setQueueStatuses(res.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQueueStatuses();
  }, []);

  // ─── Socket listeners ────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const onPairMatched = (data: { conversationId: string }) => {
      toast.success("🎉 You've been paired! Opening chat...");
      navigate(`/chat/${data.conversationId}`);
    };

    const onNewMessageNotification = (data: {
      conversationId: string;
      senderAlias: string;
      content: string;
      unreadCount?: number;
    }) => {
      // Update unread count for that conversation
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === data.conversationId
            ? { ...conv, unreadCount: data.unreadCount ?? (conv.unreadCount || 0) + 1 }
            : conv
        )
      );

      toast.custom(
        (t) => (
          <div
            onClick={() => {
              toast.dismiss(t.id);
              navigate(`/chat/${data.conversationId}`);
            }}
            className="bg-brand-card border border-white/10 rounded-2xl p-4 shadow-2xl cursor-pointer hover:bg-white/10 transition max-w-sm"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">💬</span>
              <div>
                <p className="text-white font-semibold text-sm">
                  {data.senderAlias}
                </p>
                <p className="text-gray-300 text-sm">{data.content}</p>
                <p className="text-gray-500 text-xs mt-1">Tap to open chat</p>
              </div>
            </div>
          </div>
        ),
        { duration: 5000 }
      );
    };

    socket.on("pair_matched", onPairMatched);
    socket.on("new_message_notification", onNewMessageNotification);

    return () => {
      socket.off("pair_matched", onPairMatched);
      socket.off("new_message_notification", onNewMessageNotification);
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

    const existing = queueStatuses.find(
      (q) => q.category.toLowerCase() === category.toLowerCase()
    );
    if (existing) {
      toast.error(
        `You are already in queue for "${category}" at position #${existing.position}.`
      );
      return;
    }

    try {
      const { data } = await apiClient.post("/chat/pair", { category });

      if (data.matched) {
        toast.success("✅ Matched! Opening chat...");
        navigate(`/chat/${data.conversationId}`);
      } else if (data.queued) {
        toast("⏳ You are in queue for this category. We'll notify you when a match is found.", {
          icon: "⏳",
          duration: 4000,
        });
        await fetchQueueStatuses();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          toast.error(err.response?.data?.error || "You are already in queue for this category.");
          await fetchQueueStatuses();
        } else {
          toast.error(err.response?.data?.error || "Pair request failed");
        }
      } else {
        toast.error("An unexpected error occurred");
      }
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">Inbox</h1>
        <div className="flex items-center gap-2">
          {queueStatuses.map((q) => (
            <span
              key={q.category}
              className="text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-full"
            >
              Queue: #{q.position} ({q.category})
            </span>
          ))}
          <button
            onClick={requestPair}
            className="bg-blue-500/20 px-4 py-2 rounded-xl text-blue-400 text-sm hover:bg-blue-500/30 transition"
          >
            + Request 1‑on‑1
          </button>
        </div>
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
            className="bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition relative"
            onClick={() => navigate(`/chat/${conv.id}`)}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h2 className="text-white font-semibold">{getTitle(conv)}</h2>
                {conv.unreadCount && conv.unreadCount > 0 && (
                  <span className="bg-brand-purple text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
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