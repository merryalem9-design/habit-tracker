import { motion } from "framer-motion";
import { useSwipeable } from "react-swipeable";
import { TiltCard } from "./ui/TiltCard";

interface Habit {
  id: string;
  title: string;
  category: string;
  streak?: { currentStreak: number; longestStreak: number } | null;
  _count?: { checkIns: number };
  checkInsToday?: boolean;
  icon?: string;
}

interface HabitCardProps {
  habit: Habit;
  index: number;
  onCheckIn: (habitId: string, status: "success" | "relapse" | "skipped") => void;
  onGroup: (category: string) => void;
}

export function HabitCard({ habit, index, onCheckIn, onGroup }: HabitCardProps) {
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => onCheckIn(habit.id, "success"),
    onSwipedRight: () => onCheckIn(habit.id, "skipped"),
    trackMouse: true,
  });

  return (
    <TiltCard className="w-full">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        {...swipeHandlers}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-brand-purple to-brand-pink text-xl">
              {habit.icon || "🎯"}
            </div>
            <div>
              <h3 className="font-semibold text-white">{habit.title}</h3>
              <p className="text-xs text-gray-400">{habit.category}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-amber-400">
              {habit.streak?.currentStreak || 0}🔥
            </span>
          </div>
        </div>

        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-gray-700">
          <motion.div
            className="h-full bg-linear-to-r from-brand-purple to-brand-pink"
            initial={{ width: 0 }}
            animate={{ width: habit.checkInsToday ? "100%" : "0%" }}
            transition={{ duration: 0.6 }}
          />
        </div>

        {/* Added relative z-10 and stopPropagation to stop the TiltCard from spinning when clicking buttons */}
        <div className="mt-3 flex gap-2 relative z-10" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); onCheckIn(habit.id, "success"); }}
            className="flex-1 rounded-xl bg-emerald-500/20 py-1.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30"
          >
            ✅ Done
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onCheckIn(habit.id, "relapse"); }}
            className="flex-1 rounded-xl bg-red-500/20 py-1.5 text-sm font-medium text-red-400 transition hover:bg-red-500/30"
          >
            ❌ Miss
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onGroup(habit.category); }}
            className="flex-1 rounded-xl bg-brand-purple/20 py-1.5 text-sm font-medium text-brand-purple transition hover:bg-brand-purple/30"
          >
            👥 Group
          </button>
        </div>

        <p className="mt-2 text-center text-[10px] text-gray-500">
          ← swipe to check‑in, → swipe to skip
        </p>
      </motion.div>
    </TiltCard>
  );
}