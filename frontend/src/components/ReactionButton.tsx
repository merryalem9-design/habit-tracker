import { motion } from "framer-motion";

const REACTIONS = ["💪", "🔥", "❤️", "🌟"];

interface ReactionButtonProps {
  postId: string;
  onReact: (postId: string, emoji: string) => void;
  reactions: { userId?: string; reactionType: string }[]; // Added optional userId
}

export function ReactionButton({ postId, onReact, reactions }: ReactionButtonProps) {
  // Calculate the count for each reaction type based on the incoming array
  const counts = reactions.reduce((acc, r) => {
    acc[r.reactionType] = (acc[r.reactionType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex gap-1 mt-2">
      {REACTIONS.map((emoji) => (
        <motion.button
          key={emoji}
          whileTap={{ scale: 0.7 }}
          whileHover={{ scale: 1.2 }}
          onClick={() => onReact(postId, emoji)}
          className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-sm transition hover:bg-white/10"
        >
          {emoji}
          <span className="text-xs text-gray-400">{counts[emoji] || 0}</span>
        </motion.button>
      ))}
    </div>
  );
}