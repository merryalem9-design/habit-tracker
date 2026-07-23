import { useSpring, animated } from "@react-spring/web";

interface AnimatedCounterProps {
  value: number;
  label: string;
  icon?: string;
}

export function AnimatedCounter({ value, label, icon }: AnimatedCounterProps) {
  const { number } = useSpring({
    from: { number: 0 },
    number: value,
    delay: 200,
    config: { mass: 1, tension: 20, friction: 10 },
  });
  return (
    <div className="text-center">
      {icon && <span className="text-2xl">{icon}</span>}
      <animated.span className="block text-3xl font-extrabold text-white">
        {number.to((n: number) => Math.floor(n))}
      </animated.span>
      <p className="text-xs uppercase tracking-wider text-gray-400">{label}</p>
    </div>
  );
}