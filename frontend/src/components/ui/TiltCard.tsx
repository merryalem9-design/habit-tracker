import React, { useRef } from "react";
import { motion, useSpring } from "framer-motion";
import { useGesture } from "@use-gesture/react";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
}

export function TiltCard({ children, className = "" }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  // FIXED: Replaced 'tension' with 'stiffness' and 'friction' with 'damping' to match Framer Motion v11 types
  const rotateX = useSpring(0, { mass: 0.1, stiffness: 300, damping: 20 });
  const rotateY = useSpring(0, { mass: 0.1, stiffness: 300, damping: 20 });
  const scale = useSpring(1, { mass: 0.1, stiffness: 300, damping: 20 });

  useGesture(
    {
      onMove: ({ offset: [x, y] }) => {
        rotateX.set((y / 2) * -1);
        rotateY.set(x / 2);
        scale.set(1.05);
      },
      onHover: ({ active }) => {
        if (!active) {
          rotateX.set(0);
          rotateY.set(0);
          scale.set(1);
        }
      },
    },
    {
      target: ref,
    }
  );

  return (
    <motion.div
      ref={ref}
      style={{
        rotateX,
        rotateY,
        scale,
        perspective: 800,
      }}
      className={`relative overflow-hidden rounded-xl shadow-xl ${className}`}
    >
      {children}
    </motion.div>
  );
}