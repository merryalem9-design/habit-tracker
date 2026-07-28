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
import apiClient from "../lib/apiClient";
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

const QUIT_CATEGORIES = [
  "Smoking",
  "Alcohol",
  "Sugar",
  "Junk Food",
  "Social Media",
  "Pornography",
  "Gambling",
];
const PRACTICE_CATEGORIES = [
  "Exercise",
  "Meditation",
  "Reading",
  "Journaling",
  "Water Intake",
  "Gratitude",
  "Learning",
];

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [habitType, setHabitType] = useState<"quit" | "practice">("quit");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const loadData = async () => {
    try {
      const [habitsData, groupsData] = await Promise.all([
        getHabits(),
        getMyGroups(),
      ]);
      setHabits(habitsData);
      setMyGroups(groupsData);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await loadData();
    };
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast.success("Dashboard refreshed");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      await createHabit(title, category);
      setTitle("");
      setCategory("");
      setHabitType("quit");
      setIsModalOpen(false);
      await loadData();
      toast.success("Habit created! 🎯");

      const { data } = await apiClient.get(`/groups/match?category=${category}`);
      if (data.exists) {
        const confirmJoin = window.confirm(
          `There's already a group for "${category}". Would you like to join it?`
        );
        if (confirmJoin) {
          await joinGroup(category);
          toast.success("Joined group! 👥");
          const groupsData = await getMyGroups();
          setMyGroups(groupsData);
        }
      }
    } catch {
      toast.error("Failed to create habit");
    }
  };

  const handleCheckIn = async (habitId: string, status: "success" | "relapse" | "skipped") => {
    try {
      await checkIn(habitId, status);
      await loadData();
      toast.success(status === "success" ? "💪 Great job!" : "🔄 Tomorrow is a new day");
    } catch {
      toast.error("Check-in failed");
    }
  };

  const handleGoToGroup = async (category: string) => {
    try {
      const membership = await joinGroup(category);
      navigate(`/groups/${membership.groupId}`);
    } catch {
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
      {/* Ambient animated background */}
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
        {/* ─── Header (greeting only – no buttons) ──────────────── */}
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
        </motion.div>

        {/* ─── Stats ──────────────────────────────────────────────── */}
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

        {/* ─── Distract Me quick button ──────────────────────────── */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-4"
        >
          <button
            onClick={() => navigate("/distract")}
            className="w-full rounded-xl bg-linear-to-r from-blue-500 to-purple-500 py-3 text-white font-semibold shadow-lg hover:shadow-blue-500/30 transition"
          >
            🧘 Need a break? (Distract Me)
          </button>
        </motion.div>

        {/* ─── Your Groups ────────────────────────────────────────── */}
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

        {/* ─── Habit List ─────────────────────────────────────────── */}
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

      {/* ─── FAB to open habit modal ─────────────────────────────── */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-linear-to-r from-brand-purple to-brand-pink p-4 text-3xl shadow-2xl shadow-brand-purple/50 transition hover:shadow-brand-pink/50"
      >
        +
      </motion.button>

      {/* ─── Habit Creation Modal ────────────────────────────────── */}
      <BottomSheet isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h2 className="text-xl font-bold">New Habit</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          <input
            placeholder="Habit title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-brand-purple focus:outline-none"
            autoFocus
            required
          />

          {/* ─── Quit / Practice toggle ────────────────────────── */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setHabitType("quit")}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
                habitType === "quit"
                  ? "bg-brand-purple text-white"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              Quit
            </button>
            <button
              type="button"
              onClick={() => setHabitType("practice")}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition ${
                habitType === "practice"
                  ? "bg-brand-purple text-white"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              Practice
            </button>
          </div>

          {/* ─── Category dropdown ────────────────────────────── */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-brand-purple focus:outline-none"
            required
          >
            <option value="">Select category</option>
            {(habitType === "quit" ? QUIT_CATEGORIES : PRACTICE_CATEGORIES).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

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