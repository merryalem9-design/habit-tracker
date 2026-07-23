import { motion } from "framer-motion";

const REACTIONS = ["💪", "🔥", "❤️", "🌟"];

interface ReactionButtonProps {
  postId: string;
  onReact: (postId: string, emoji: string) => void;
}

export function ReactionButton({ postId, onReact }: ReactionButtonProps) {
  return (
    <div className="flex gap-1">
      {REACTIONS.map((emoji) => (
        <motion.button
          key={emoji}
          whileTap={{ scale: 0.7 }}
          whileHover={{ scale: 1.2 }}
          onClick={() => onReact(postId, emoji)}
          className="rounded-full bg-white/5 px-2 py-1 text-sm transition hover:bg-white/10"
        >
          {emoji}
        </motion.button>
      ))}
    </div>
  );
}