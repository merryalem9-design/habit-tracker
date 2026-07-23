import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getHabits, createHabit, checkIn } from "../lib/habitApi";
import { getMyGroups, joinGroup } from "../lib/groupApi";
import { useAuthStore } from "../store/authStore";
import { GradientButton } from "../components/ui/GradientButton";
import { BottomSheet } from "../components/ui/BottomSheet";
import { AnimatedCounter } from "../components/ui/AnimatedCounter";
import { HabitCard } from "../components/HabitCard";
import toast from "react-hot-toast";

interface Habit {
  id: string;
  title: string;
  category: string;
  streak?: { currentStreak: number; longestStreak: number } | null;
  _count?: { checkIns: number };
  checkInsToday?: boolean;
  icon?: string;
}

interface MyGroup {
  id: string;
  group: { id: string; category: string };
}

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const loadData = async () => {
    try {
      const [habitsData, groupsData] = await Promise.all([
        getHabits(),
        getMyGroups(),
      ]);
      setHabits(habitsData);
      setMyGroups(groupsData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast.success("Dashboard refreshed");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await createHabit(title, category || "General");
      setTitle("");
      setCategory("");
      setIsModalOpen(false);
      await loadData();
      toast.success("Habit created! 🎯");
    } catch (err) {
      toast.error("Failed to create habit");
    }
  };

  const handleCheckIn = async (habitId: string, status: "success" | "relapse" | "skipped") => {
    try {
      await checkIn(habitId, status);
      await loadData();
      toast.success(status === "success" ? "💪 Great job!" : "🔄 Tomorrow is a new day");
    } catch (err) {
      toast.error("Check-in failed");
    }
  };

  const handleGoToGroup = async (category: string) => {
    try {
      const membership = await joinGroup(category);
      navigate(`/groups/${membership.groupId}`);
    } catch (err) {
      toast.error("Could not join group");
    }
  };

  const bestStreak = habits.reduce(
    (max, h) => Math.max(max, h.streak?.longestStreak || 0),
    0
  );
  const totalCheckIns = habits.reduce(
    (sum, h) => sum + (h._count?.checkIns || 0),
    0
  );

  return (
    <div className="relative min-h-screen bg-brand-dark pb-32">
      <div className="fixed inset-0 -z-10 bg-linear-to-br from-brand-dark via-purple-900/20 to-pink-900/20">
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              "radial-gradient(circle at 20% 20%, #A855F7, transparent 70%)",
              "radial-gradient(circle at 80% 80%, #EC4899, transparent 70%)",
              "radial-gradient(circle at 40% 60%, #3B82F6, transparent 70%)",
            ],
          }}
          transition={{ duration: 15, repeat: Infinity, repeatType: "mirror" }}
        />
      </div>

      <div className="mx-auto max-w-md px-4 pt-6">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400">
              Welcome back
            </p>
            <h1 className="bg-linear-to-r from-brand-purple to-brand-pink bg-clip-text text-2xl font-bold text-transparent">
              {user?.displayAlias || "Streak Master"}
            </h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={logout}
            className="rounded-full bg-white/10 p-3 text-xl backdrop-blur-sm"
          >
            ⚡
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mt-6 grid grid-cols-3 gap-3 rounded-2xl bg-white/5 p-4 backdrop-blur-sm"
        >
          <AnimatedCounter value={habits.length} label="Habits" icon="📋" />
          <AnimatedCounter value={bestStreak} label="Best Streak" icon="🔥" />
          <AnimatedCounter value={totalCheckIns} label="Check‑ins" icon="✅" />
        </motion.div>

        {myGroups.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            <p className="mb-2 text-sm font-medium text-gray-400">Your Groups</p>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {myGroups.map((m) => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/groups/${m.group.id}`)}
                  className="whitespace-nowrap rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  {m.group.category} →
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today's Habits</h2>
            <button
              onClick={handleRefresh}
              className="text-sm text-gray-400 transition hover:text-white"
            >
              {isRefreshing ? "⟳" : "↻"}
            </button>
          </div>

          {habits.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/5 p-10">
              <span className="text-5xl">🌱</span>
              <p className="mt-3 text-center text-gray-400">
                No habits yet.<br />Start your first one!
              </p>
            </div>
          ) : (
            habits.map((habit, i) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                index={i}
                onCheckIn={handleCheckIn}
                onGroup={handleGoToGroup}
              />
            ))
          )}
        </motion.div>
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-linear-to-r from-brand-purple to-brand-pink p-4 text-3xl shadow-2xl shadow-brand-purple/50 transition hover:shadow-brand-pink/50"
      >
        +
      </motion.button>

      <BottomSheet isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-xl font-bold">New Habit</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          <input
            placeholder="Habit title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-brand-purple focus:outline-none"
            autoFocus
          />
          <input
            placeholder="Category (optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-brand-purple focus:outline-none"
          />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 rounded-xl border border-white/10 py-3 text-gray-400 transition hover:bg-white/5"
            >
              Cancel
            </button>
            <GradientButton type="submit" className="flex-1">
              Create
            </GradientButton>
          </div>
        </form>
      </BottomSheet>
    </div>
  );
}