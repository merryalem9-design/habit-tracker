import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import apiClient from "../lib/apiClient";
import { getSocket } from "../lib/socket";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  type: "group" | "direct";
  user1?: { id: string; displayAlias: string };
  user2?: { id: string; displayAlias: string };
  group?: { category: string };
}

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const currentUser = useAuthStore((s) => s.user);
  const markAsRead = useChatStore((s) => s.markAsRead);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = getSocket();

    const fetchData = async () => {
      try {
        const [msgRes, convRes] = await Promise.all([
          apiClient.get(`/chat/${conversationId}/messages`),
          apiClient.get("/chat/conversations"),
        ]);
        setMessages(msgRes.data);
        const conv = convRes.data.find((c: Conversation) => c.id === conversationId);
        setConversation(conv || null);
        // Mark as read
        if (conversationId) {
          await markAsRead(conversationId);
        }
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } catch (error) {
        console.error("Failed to load chat data:", error);
      }
    };
    fetchData();

    socket.emit("join_conversation", conversationId);

    const onNewMessage = (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };
    socket.on("new_message", onNewMessage);

    return () => {
      socket.off("new_message", onNewMessage);
      socket.emit("leave_conversation", conversationId);
    };
  }, [conversationId, markAsRead]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const socket = getSocket();
    socket.emit("send_message", { conversationId, content: input });
    setInput("");
  };

  const otherUser = conversation?.type === "direct"
    ? (conversation.user1?.id === currentUser?.id ? conversation.user2 : conversation.user1)
    : null;
  const chatTitle = conversation?.type === "group"
    ? conversation.group?.category || "Group Chat"
    : otherUser?.displayAlias || "Chat";

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 p-4 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate("/chat")} className="text-gray-400 hover:text-white">
          ←
        </button>
        <h1 className="text-white font-bold">{chatTitle}</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUser?.id;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col w-full ${isOwn ? "items-end" : "items-start"}`}
            >
              {/* Show the sender's alias only if it's NOT the current user (receiver) */}
              {!isOwn && (
                <span className="text-xs text-gray-400 ml-2 mb-1 font-medium">
                  {msg.senderId === currentUser?.id ? "You" : "Other User"}
                </span>
              )}
              
              <div
                className={`max-w-[75%] p-3 rounded-2xl break-anywhere ${
                  isOwn
                    ? "bg-linear-to-r from-brand-purple to-brand-pink text-white rounded-br-none shadow-lg shadow-brand-purple/25"
                    : "bg-white/10 text-gray-200 rounded-bl-none border border-white/5 backdrop-blur-sm"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <span className="text-[10px] opacity-70 block mt-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-brand-dark/80 backdrop-blur-sm pb-24 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-brand-purple focus:outline-none"
          />
          <button
            onClick={sendMessage}
            className="bg-brand-purple px-5 py-3 rounded-xl text-white font-semibold hover:bg-brand-purple/80 transition shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}