import { useEffect, useState } from "react";
import { getHabits, createHabit, checkIn } from "../lib/habitApi";
import { useAuthStore } from "../store/authStore";

interface Habit {
  id: string;
  title: string;
  category: string;
  streak: { currentStreak: number; longestStreak: number } | null;
}

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    let isMounted = true;
    async function loadHabits() {
      try {
        const data = await getHabits();
        if (isMounted) setHabits(data);
      } catch (err) {
        console.error("Failed to fetch habits:", err);
      }
    }
    loadHabits();
    return () => { isMounted = false; };
  }, []);

  async function handleRefresh() {
    try {
      const data = await getHabits();
      setHabits(data);
    } catch (err) {
      console.error("Failed to fetch habits:", err);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createHabit(title, category || "General");
      setTitle("");
      setCategory("");
      setIsModalOpen(false);
      await handleRefresh();
    } catch (err) {
      console.error("Failed to create habit:", err);
    }
  }

  async function handleCheckIn(habitId: string, status: "success" | "relapse") {
    try {
      await checkIn(habitId, status);
      await handleRefresh();
    } catch (err) {
      console.error("Failed to log check-in:", err);
    }
  }

  // Calculate quick stats
  const activeCount = habits.length;
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak?.longestStreak || 0), 0);

  return (
    <div style={styles.appViewport}>
      <div style={styles.mobileContainer}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <span style={styles.greetingTag}>Welcome back</span>
            <h1 style={styles.userName}>{user?.displayAlias || "Streak Master"}</h1>
          </div>
          <button onClick={logout} style={styles.iconButton} aria-label="Log out">
            ⚡️
          </button>
        </header>

        {/* Quick Stats Widget */}
        <section style={styles.statsCard}>
          <div style={styles.statBox}>
            <span style={styles.statValue}>{activeCount}</span>
            <span style={styles.statLabel}>Active Habits</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statBox}>
            <span style={styles.statValue}>{bestStreak}🔥</span>
            <span style={styles.statLabel}>Best Streak</span>
          </div>
        </section>

        {/* Section Title */}
        <div style={styles.sectionHeader}>
          <h2>Today's Habits</h2>
          <span style={styles.badge}>{habits.length} total</span>
        </div>

        {/* Habit Cards Container */}
        <main style={styles.habitList}>
          {habits.length === 0 ? (
            <div style={styles.emptyState}>
              <p>No habits yet. Tap the button below to build your first one!</p>
            </div>
          ) : (
            habits.map((habit) => (
              <div key={habit.id} style={styles.habitCard}>
                <div style={styles.habitInfo}>
                  <span style={styles.categoryBadge}>{habit.category}</span>
                  <h3 style={styles.habitTitle}>{habit.title}</h3>
                  <div style={styles.streakPill}>
                    🔥 <strong>{habit.streak?.currentStreak ?? 0}</strong> day streak
                  </div>
                </div>
                
                <div style={styles.actionGroup}>
                  <button 
                    onClick={() => handleCheckIn(habit.id, "success")} 
                    style={{ ...styles.actionBtn, ...styles.successBtn }}
                  >
                    Done
                  </button>
                  <button 
                    onClick={() => handleCheckIn(habit.id, "relapse")} 
                    style={{ ...styles.actionBtn, ...styles.relapseBtn }}
                  >
                    Miss
                  </button>
                </div>
              </div>
            ))
          )}
        </main>

        {/* Floating Action Button (FAB) */}
        <button onClick={() => setIsModalOpen(true)} style={styles.fab}>
          +
        </button>

        {/* Bottom Sheet Modal */}
        {isModalOpen && (
          <div style={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
            <div style={styles.bottomSheet} onClick={(e) => e.stopPropagation()}>
              <div style={styles.sheetHandle} />
              <h2 style={styles.sheetTitle}>New Habit</h2>
              <form onSubmit={handleCreate}>
                <input
                  placeholder="Habit Title (e.g. Read 20 mins)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={styles.input}
                  autoFocus
                  required
                />
                <input
                  placeholder="Category (e.g. Health, Study)"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={styles.input}
                />
                <div style={styles.modalButtons}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.saveBtn}>
                    Create Habit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mobile-Optimized Design Tokens
const styles: Record<string, React.CSSProperties> = {
  appViewport: {
    minHeight: "100vh",
    backgroundColor: "#0F172A", // Deep sleek dark background
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#F8FAFC",
  },
  mobileContainer: {
    width: "100%",
    maxWidth: "430px", // iPhone 15 Pro Max width standard
    minHeight: "100vh",
    backgroundColor: "#1E293B",
    padding: "24px 20px 100px 20px",
    boxSizing: "border-box",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  greetingTag: {
    fontSize: "12px",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: "1px",
    fontWeight: 600,
  },
  userName: {
    fontSize: "24px",
    fontWeight: "700",
    margin: "4px 0 0 0",
    background: "linear-gradient(135deg, #A855F7, #EC4899)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  iconButton: {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "50%",
    width: "42px",
    height: "42px",
    cursor: "pointer",
    fontSize: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statsCard: {
    background: "linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(236, 72, 153, 0.15))",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "20px",
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: "28px",
    backdropFilter: "blur(10px)",
  },
  statBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  statValue: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#FFF",
  },
  statLabel: {
    fontSize: "11px",
    color: "#CBD5E1",
    marginTop: "2px",
  },
  statDivider: {
    width: "1px",
    height: "30px",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  badge: {
    fontSize: "12px",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: "4px 10px",
    borderRadius: "12px",
    color: "#94A3B8",
  },
  habitList: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#64748B",
    fontSize: "14px",
  },
  habitCard: {
    background: "rgba(30, 41, 59, 0.7)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "18px",
    padding: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
  },
  habitInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  categoryBadge: {
    fontSize: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    color: "#A855F7",
    fontWeight: "700",
  },
  habitTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "600",
  },
  streakPill: {
    fontSize: "12px",
    color: "#F59E0B",
    marginTop: "4px",
  },
  actionGroup: {
    display: "flex",
    gap: "8px",
  },
  actionBtn: {
    border: "none",
    borderRadius: "12px",
    padding: "8px 14px",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
    transition: "transform 0.1s active",
  },
  successBtn: {
    backgroundColor: "#10B981",
    color: "#FFF",
  },
  relapseBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    color: "#EF4444",
  },
  fab: {
    position: "fixed",
    bottom: "30px",
    right: "calc(50% - 190px)", // center aligns on standard desktop viewport wrap
    width: "56px",
    height: "56px",
    borderRadius: "28px",
    background: "linear-gradient(135deg, #A855F7, #EC4899)",
    color: "#FFF",
    border: "none",
    fontSize: "28px",
    fontWeight: "300",
    cursor: "pointer",
    boxShadow: "0 10px 25px -5px rgba(236, 72, 153, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
    zIndex: 100,
  },
  bottomSheet: {
    backgroundColor: "#1E293B",
    width: "100%",
    maxWidth: "430px",
    borderTopLeftRadius: "24px",
    borderTopRightRadius: "24px",
    padding: "20px 24px 32px 24px",
    boxSizing: "border-box",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
  },
  sheetHandle: {
    width: "36px",
    height: "4px",
    backgroundColor: "#475569",
    borderRadius: "2px",
    margin: "0 auto 16px auto",
  },
  sheetTitle: {
    margin: "0 0 16px 0",
    fontSize: "18px",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "#0F172A",
    border: "1px solid #334155",
    borderRadius: "12px",
    color: "#FFF",
    fontSize: "14px",
    marginBottom: "12px",
    boxSizing: "border-box",
    outline: "none",
  },
  modalButtons: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
  },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    backgroundColor: "transparent",
    border: "1px solid #334155",
    borderRadius: "12px",
    color: "#94A3B8",
    fontWeight: "600",
    cursor: "pointer",
  },
  saveBtn: {
    flex: 1,
    padding: "12px",
    background: "linear-gradient(135deg, #A855F7, #EC4899)",
    border: "none",
    borderRadius: "12px",
    color: "#FFF",
    fontWeight: "600",
    cursor: "pointer",
  },
};