import { motion } from "framer-motion";

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export function GradientButton({ children, className = "", ...props }: GradientButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      className={`relative overflow-hidden rounded-2xl bg-linear-to-r from-brand-purple to-brand-pink px-6 py-3 font-semibold text-white shadow-lg shadow-brand-purple/30 transition hover:shadow-xl hover:shadow-brand-purple/40 ${className}`}
      {...props}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
      <motion.div
        className="absolute inset-0 bg-linear-to-r from-brand-pink to-brand-purple opacity-0"
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.button>
  );
}