import { cn } from "@/lib/utils";

interface ShinyTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string;
  speed?: number;
}

/**
 * ShinyText — animated metallic shimmer over text. Pure CSS, no motion runtime.
 */
export function ShinyText({ text, speed = 4, className, ...props }: ShinyTextProps) {
  return (
    <span
      className={cn("inline-block bg-clip-text text-transparent", className)}
      style={{
        backgroundImage:
          "linear-gradient(110deg, var(--foreground) 30%, var(--mint) 50%, var(--foreground) 70%)",
        backgroundSize: "200% auto",
        animation: `shimmer ${speed}s linear infinite`,
      }}
      {...props}
    >
      {text}
    </span>
  );
}
