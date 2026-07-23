import { useSpring, animated } from "@react-spring/web";
import { useGesture } from "@use-gesture/react";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
}

export function TiltCard({ children, className = "" }: TiltCardProps) {
  const [spring, api] = useSpring(() => ({
    rotateX: 0,
    rotateY: 0,
    scale: 1,
    config: { mass: 5, tension: 350, friction: 40 },
  }));

  const bind = useGesture(
    {
      onMove: ({ xy: [x, y], target }) => {
        const el = target as HTMLElement;
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const rotateY = ((x - centerX) / rect.width) * 8;
        const rotateX = ((centerY - y) / rect.height) * 8;
        api.start({ rotateX, rotateY, scale: 1.02 });
      },
      onLeave: () => api.start({ rotateX: 0, rotateY: 0, scale: 1 }),
    },
    {
      target: undefined,
    }
  );

  return (
    <animated.div
      {...bind()}
      style={{
        ...spring,
        transformPerspective: 800,
      }}
      className={className}
    >
      {children}
    </animated.div>
  );
}