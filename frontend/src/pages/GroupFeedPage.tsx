import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "../lib/apiClient";
import { getSocket } from "../lib/socket";
import { editPost as editPostApi, deletePost as deletePostApi } from "../lib/postApi";
import { useAuthStore } from "../store/authStore";
import { GradientButton } from "../components/ui/GradientButton";
import { ReactionButton } from "../components/ReactionButton";
import toast from "react-hot-toast";

interface Post {
  id: string;
  content: string | null;
  alias: string;
  userId: string;
  createdAt: string;
  flagged?: boolean; // Added optional flag
  reactions: { reactionType: string }[];
}

interface SupportResource {
  title: string;
  message: string;
  emergencyContact: { name: string; phone: string } | null;
  distractMeSuggestion: { type: string; prompt: string };
  fallbackResource: { name: string; description: string; url: string };
}

interface DistractResult {
  suggestionType: "content" | "activity" | "nearby_place" | "ping_buddy";
  logId: string;
  content?: { text: string; source: string | null; category: string };
  nearbyPlace?: { name: string; address: string; types: string[] } | null;
  pingBuddy?: { sent: boolean; groupId?: string };
}

export default function GroupFeedPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [message, setMessage] = useState("");
  const [supportResource, setSupportResource] = useState<SupportResource | null>(null);
  const [distractResult, setDistractResult] = useState<DistractResult | null>(null);
  const [distractLoading, setDistractLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<Record<string, boolean>>({});
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const socketRef = useRef(getSocket());
  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    async function loadFeed() {
      try {
        const { data } = await apiClient.get(`/groups/${groupId}/feed`);
        setPosts(data);
      } catch (err) {
        console.error("Failed to load feed:", err);
      }
    }
    loadFeed();

    const socket = socketRef.current;
    socket.emit("join_group", groupId);

    socket.on("new_post", (post: Post) => {
      // Only add to feed if it's not flagged
      if (!post.flagged) {
        setPosts((prev) => [post, ...prev]);
      }
    });

    socket.on("post_edited", (data: { id: string; content: string }) => {
      setPosts((prev) =>
        prev.map((p) => (p.id === data.id ? { ...p, content: data.content } : p))
      );
    });

    socket.on("post_deleted", (data: { id: string }) => {
      setPosts((prev) => prev.filter((p) => p.id !== data.id));
    });

    return () => {
      socket.emit("leave_group", groupId);
      socket.off("new_post");
      socket.off("post_edited");
      socket.off("post_deleted");
    };
  }, [groupId]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      const { data } = await apiClient.post("/posts", { groupId, content: message });
      setMessage("");
      
      // FIXED: If the post was flagged by the backend, DO NOT add it locally.
      if (data.post.flagged) {
        toast.error("Your post was flagged for safety review and has been hidden.", { duration: 5000 });
        setSupportResource(data.supportResources);
        setDistractResult(null);
      } else {
        setPosts((prev) => [data.post, ...prev]);
      }
    } catch (err) {
      console.error("Failed to post:", err);
      toast.error("Could not post");
    }
  };

  const handleDistractMe = async () => {
    setDistractLoading(true);
    setDistractResult(null);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      if (navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              lat = pos.coords.latitude;
              lng = pos.coords.longitude;
              resolve();
            },
            () => resolve(),
            { timeout: 3000 }
          );
        });
      }
      const { data } = await apiClient.post("/distract-me", { lat, lng });
      setDistractResult(data);
    } catch (err) {
      console.error("Distract Me failed:", err);
      toast.error("Could not get suggestion");
    } finally {
      setDistractLoading(false);
    }
  };

  const handleFeedback = async (logId: string, helped: boolean) => {
    try {
      await apiClient.post("/distract-me/feedback", { logId, helped });
      setFeedbackSent((prev) => ({ ...prev, [logId]: true }));
      if (!helped) await handleDistractMe();
    } catch (err) {
      console.error("Feedback failed:", err);
      toast.error("Feedback failed");
    }
  };

  const startEdit = (post: Post) => {
    setEditingPostId(post.id);
    setEditContent(post.content ?? "");
  };

  const cancelEdit = () => {
    setEditingPostId(null);
    setEditContent("");
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editContent.trim()) return;
    try {
      await editPostApi(postId, editContent);
      setEditingPostId(null);
      setEditContent("");
      toast.success("Post updated");
    } catch (err) {
      console.error("Failed to edit post:", err);
      toast.error("Edit failed");
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deletePostApi(postId);
      toast.success("Post deleted");
    } catch (err) {
      console.error("Failed to delete post:", err);
      toast.error("Delete failed");
    }
  };

  const handleReact = async (postId: string, emoji: string) => {
    try {
      await apiClient.post(`/posts/${postId}/react`, { reactionType: emoji });
    } catch (err) {
      console.error("Reaction failed:", err);
    }
  };

  return (
    <div className="relative min-h-screen bg-brand-dark pb-32">
      <div className="mx-auto max-w-md px-4 pt-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-gray-400 transition hover:text-white"
          >
            ←
          </button>
          <h2 className="text-xl font-bold">Group Feed</h2>
        </div>

        <AnimatePresence>
          {supportResource && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-4 rounded-2xl border border-red-500/50 bg-red-950/30 p-4 backdrop-blur-sm"
            >
              <h3 className="font-bold text-red-400">{supportResource.title}</h3>
              <p className="text-sm text-gray-300">{supportResource.message}</p>
              {supportResource.emergencyContact && (
                <div className="mt-2 rounded-xl bg-white/5 p-3">
                  <p className="text-xs text-gray-400">Emergency Contact</p>
                  <p className="font-medium">{supportResource.emergencyContact.name}</p>
                  <a
                    href={`tel:${supportResource.emergencyContact.phone}`}
                    className="text-brand-purple"
                  >
                    {supportResource.emergencyContact.phone}
                  </a>
                </div>
              )}
              <GradientButton
                onClick={handleDistractMe}
                className="mt-3 w-full"
                disabled={distractLoading}
              >
                {distractLoading ? "Loading..." : "Open Distract Me"}
              </GradientButton>

              {distractResult && (
                <div className="mt-3 rounded-xl bg-white/5 p-3">
                  {distractResult.content && (
                    <blockquote className="text-sm italic text-gray-200">
                      “{distractResult.content.text}”
                    </blockquote>
                  )}
                  {distractResult.nearbyPlace && (
                    <div>
                      <p className="font-medium">{distractResult.nearbyPlace.name}</p>
                      <p className="text-xs text-gray-400">
                        {distractResult.nearbyPlace.address}
                      </p>
                    </div>
                  )}
                  {distractResult.pingBuddy && (
                    <p className="text-sm">
                      {distractResult.pingBuddy.sent
                        ? "💙 Support ping sent to your group"
                        : "Join a group to ping buddies"}
                    </p>
                  )}
                  {!feedbackSent[distractResult.logId] && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleFeedback(distractResult.logId, true)}
                        className="flex-1 rounded-lg bg-emerald-500/20 py-1 text-emerald-300"
                      >
                        Helped
                      </button>
                      <button
                        onClick={() => handleFeedback(distractResult.logId, false)}
                        className="flex-1 rounded-lg bg-blue-500/20 py-1 text-blue-300"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setSupportResource(null)}
                className="mt-2 text-xs text-gray-500"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handlePost} className="mt-4 flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share something..."
            maxLength={280}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:border-brand-purple focus:outline-none"
          />
          <GradientButton type="submit" className="px-4 py-2 text-sm">
            Post
          </GradientButton>
        </form>

        <div className="mt-6 space-y-4">
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-bold text-brand-purple">{post.alias}</span>
                  <p className="mt-1 text-sm text-gray-200">{post.content}</p>
                  <span className="mt-1 text-xs text-gray-500">
                    {new Date(post.createdAt).toLocaleString()}
                  </span>
                </div>
                {currentUser?.id === post.userId && editingPostId !== post.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(post)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {editingPostId === post.id && (
                <div className="mt-2 flex gap-2">
                  <input
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm text-white"
                  />
                  <button
                    onClick={() => handleSaveEdit(post.id)}
                    className="rounded-xl bg-brand-purple px-3 py-1 text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="rounded-xl bg-white/10 px-3 py-1 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <ReactionButton 
                postId={post.id} 
                onReact={handleReact} 
                reactions={post.reactions} 
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}