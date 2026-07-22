import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../lib/apiClient";
import { getSocket } from "../lib/socket";
import { editPost as editPostApi, deletePost as deletePostApi } from "../lib/postApi";
import { useAuthStore } from "../store/authStore";

interface Post {
  id: string;
  content: string | null;
  alias: string;
  userId: string;
  createdAt: string;
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
      setPosts((prev) => [post, ...prev]);
    });

    socket.on("post_edited", (data: { id: string; content: string }) => {
      setPosts((prev) => prev.map((p) => (p.id === data.id ? { ...p, content: data.content } : p)));
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

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      const { data } = await apiClient.post("/posts", { groupId, content: message });
      setMessage("");
      if (data.supportResources) {
        setSupportResource(data.supportResources);
        setDistractResult(null);
      }
    } catch (err) {
      console.error("Failed to post:", err);
    }
  }

  async function handleDistractMe() {
    setDistractLoading(true);
    setDistractResult(null);
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
      setDistractResult(data);
    } catch (err) {
      console.error("Distract Me failed:", err);
    } finally {
      setDistractLoading(false);
    }
  }

  async function handleFeedback(logId: string, helped: boolean) {
    try {
      await apiClient.post("/distract-me/feedback", { logId, helped });
      setFeedbackSent((prev) => ({ ...prev, [logId]: true }));
      if (!helped) await handleDistractMe();
    } catch (err) {
      console.error("Feedback failed:", err);
    }
  }

  function startEdit(post: Post) {
    setEditingPostId(post.id);
    setEditContent(post.content ?? "");
  }

  function cancelEdit() {
    setEditingPostId(null);
    setEditContent("");
  }

  async function handleSaveEdit(postId: string) {
    if (!editContent.trim()) return;
    try {
      await editPostApi(postId, editContent);
      setEditingPostId(null);
      setEditContent("");
    } catch (err) {
      console.error("Failed to edit post:", err);
    }
  }

  async function handleDelete(postId: string) {
    if (!window.confirm("Delete this post?")) return;
    try {
      await deletePostApi(postId);
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0F172A", display: "flex", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#F8FAFC" }}>
      <div style={{ width: "100%", maxWidth: "500px", padding: "24px 16px 80px", boxSizing: "border-box" }}>
        <button
          onClick={() => navigate("/dashboard")}
          style={{ background: "none", border: "none", color: "#94A3B8", fontSize: "14px", cursor: "pointer", marginBottom: "12px", padding: 0 }}
        >
          ← Back to Dashboard
        </button>

        <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "20px", color: "#F8FAFC" }}>Group Feed</h2>

        {supportResource !== null && (
          <div style={{ background: "#3B1F1F", border: "1px solid #EF4444", borderRadius: "16px", padding: "20px", marginBottom: "20px" }}>
            <strong style={{ fontSize: "17px", color: "#FCA5A5", display: "block", marginBottom: "8px" }}>{supportResource.title}</strong>
            <p style={{ fontSize: "14px", color: "#D1D5DB", margin: "0 0 16px", lineHeight: "1.5" }}>{supportResource.message}</p>

            {supportResource.emergencyContact !== null && (
              <div style={{ background: "#1F2937", borderRadius: "10px", padding: "12px", marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "6px" }}>Call your emergency contact</div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: "#F9FAFB", marginBottom: "4px" }}>{supportResource.emergencyContact!.name}</div>
                <a href={`tel:${supportResource.emergencyContact!.phone}`} style={{ color: "#93C5FD", fontSize: "14px", textDecoration: "none" }}>
                  {supportResource.emergencyContact!.phone}
                </a>
              </div>
            )}

            <div style={{ background: "#1F2937", borderRadius: "10px", padding: "12px", marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "6px" }}>{supportResource.distractMeSuggestion.prompt}</div>
              <button onClick={handleDistractMe} disabled={distractLoading} style={{ width: "100%", padding: "10px", background: "linear-gradient(135deg, #A855F7, #EC4899)", border: "none", borderRadius: "10px", color: "#FFF", fontWeight: 600, fontSize: "14px", cursor: "pointer", marginTop: "6px" }}>
                {distractLoading ? "Finding something..." : "Open Distract Me"}
              </button>

              {distractResult !== null && (
                <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid #374151" }}>
                  {(distractResult.suggestionType === "content" || distractResult.suggestionType === "activity") && distractResult.content && (
                    <>
                      <p style={{ fontSize: "14px", fontStyle: "italic", color: "#E5E7EB", lineHeight: "1.6", margin: "0 0 6px" }}>"{distractResult.content.text}"</p>
                      {distractResult.content.source && (
                        <p style={{ fontSize: "12px", color: "#9CA3AF", margin: "0 0 10px" }}>— {distractResult.content.source}</p>
                      )}
                    </>
                  )}

                  {distractResult.suggestionType === "nearby_place" && distractResult.nearbyPlace && (
                    <>
                      <p style={{ fontSize: "15px", fontWeight: 600, color: "#F9FAFB", margin: "0 0 4px" }}>📍 {distractResult.nearbyPlace.name}</p>
                      <p style={{ fontSize: "12px", color: "#9CA3AF", margin: "0 0 10px" }}>{distractResult.nearbyPlace.address}</p>
                    </>
                  )}

                  {distractResult.suggestionType === "nearby_place" && !distractResult.nearbyPlace && (
                    <p style={{ fontSize: "14px", color: "#E5E7EB", margin: "0 0 10px" }}>No nearby places found. Tap again for a different suggestion.</p>
                  )}

                  {distractResult.suggestionType === "ping_buddy" && (
                    <p style={{ fontSize: "14px", color: "#E5E7EB", margin: "0 0 10px" }}>
                      {distractResult.pingBuddy?.sent ? "Your group has been notified that you could use some support. 💙" : "You're not in a group yet — join one to enable buddy pings."}
                    </p>
                  )}

                  {!feedbackSent[distractResult.logId] ? (
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <button onClick={() => handleFeedback(distractResult.logId, true)} style={{ flex: 1, padding: "8px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10B981", borderRadius: "8px", color: "#10B981", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Helped ✓</button>
                      <button onClick={() => handleFeedback(distractResult.logId, false)} style={{ flex: 1, padding: "8px", background: "rgba(99, 102, 241, 0.15)", border: "1px solid #6366F1", borderRadius: "8px", color: "#A5B4FC", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Try another →</button>
                    </div>
                  ) : (
                    <p style={{ fontSize: "13px", color: "#6EE7B7", marginTop: "10px", textAlign: "center" }}>Thanks for the feedback 💙</p>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "4px" }}>{supportResource.fallbackResource.name}</div>
              <p style={{ fontSize: "12px", color: "#9CA3AF", margin: "2px 0" }}>{supportResource.fallbackResource.description}</p>
              <a href={supportResource.fallbackResource.url} target="_blank" rel="noopener noreferrer" style={{ color: "#93C5FD", fontSize: "14px", textDecoration: "none" }}>{supportResource.fallbackResource.url}</a>
            </div>

            <button onClick={() => { setSupportResource(null); setDistractResult(null); }} style={{ width: "100%", padding: "10px", background: "transparent", border: "1px solid #4B5563", borderRadius: "10px", color: "#9CA3AF", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>Dismiss</button>
          </div>
        )}

        <form onSubmit={handlePost} style={{ marginBottom: "20px" }}>
          <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Share a check-in or thought..." maxLength={280} style={{ width: "100%", padding: "12px 16px", backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: "12px", color: "#FFF", fontSize: "14px", marginBottom: "10px", boxSizing: "border-box", outline: "none" }} />
          <button type="submit" style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg, #A855F7, #EC4899)", border: "none", borderRadius: "12px", color: "#FFF", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>Post</button>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {posts.map((post) => (
            <div key={post.id} style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: "12px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <strong style={{ fontSize: "14px", fontWeight: 700, color: "#A855F7", display: "block", marginBottom: "6px" }}>{post.alias}</strong>
                {currentUser?.id === post.userId && editingPostId !== post.id && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => startEdit(post)} style={{ background: "none", border: "none", color: "#94A3B8", fontSize: "12px", cursor: "pointer", padding: 0 }}>Edit</button>
                    <button onClick={() => handleDelete(post.id)} style={{ background: "none", border: "none", color: "#EF4444", fontSize: "12px", cursor: "pointer", padding: 0 }}>Delete</button>
                  </div>
                )}
              </div>

              {editingPostId === post.id ? (
                <div>
                  <input
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    maxLength={280}
                    style={{ width: "100%", padding: "8px 12px", backgroundColor: "#0F172A", border: "1px solid #334155", borderRadius: "8px", color: "#FFF", fontSize: "14px", marginBottom: "8px", boxSizing: "border-box" }}
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => handleSaveEdit(post.id)} style={{ flex: 1, padding: "6px", background: "#A855F7", border: "none", borderRadius: "8px", color: "#FFF", fontSize: "12px", cursor: "pointer" }}>Save</button>
                    <button onClick={cancelEdit} style={{ flex: 1, padding: "6px", background: "transparent", border: "1px solid #4B5563", borderRadius: "8px", color: "#94A3B8", fontSize: "12px", cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: "14px", color: "#E2E8F0", margin: "0 0 8px", lineHeight: "1.5" }}>{post.content}</p>
                  <small style={{ fontSize: "11px", color: "#64748B" }}>{new Date(post.createdAt).toLocaleString()}</small>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}