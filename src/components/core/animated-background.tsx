import {
  useState,
  useRef,
  useEffect,
  type ReactElement,
  type MouseEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

type ChildProps = {
  value?: string;
  children?: ReactNode;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
};

export type AnimatedBackgroundProps = {
  children: ReactElement<ChildProps>[];
  defaultValue?: string;
  className?: string;
  onValueChange?: (value: string) => void;
};

export function AnimatedBackground({
  children,
  defaultValue,
  className,
  onValueChange,
}: AnimatedBackgroundProps) {
  const [activeValue, setActiveValue] = useState<string | undefined>(defaultValue);
  const [hoverValue, setHoverValue] = useState<string | undefined>(undefined);
  const [metrics, setMetrics] = useState<{ left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  const targetValue = hoverValue ?? activeValue;

  useEffect(() => {
    if (!targetValue) {
      setMetrics(null);
      return;
    }
    const node = itemRefs.current.get(targetValue);
    if (!node || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const nodeRect = node.getBoundingClientRect();
    setMetrics({
      left: nodeRect.left - containerRect.left,
      width: nodeRect.width,
    });
  }, [targetValue]);

  useEffect(() => {
    const handleResize = () => {
      if (!targetValue) return;
      const node = itemRefs.current.get(targetValue);
      if (!node || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      setMetrics({
        left: nodeRect.left - containerRect.left,
        width: nodeRect.width,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [targetValue]);

  const handleSelect = (value: string) => {
    setActiveValue(value);
    onValueChange?.(value);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-flex items-center gap-1", className)}
      role="tablist"
    >
      {metrics && (
        <div
          className="absolute top-0 bottom-0 rounded-full bg-muted transition-all duration-300 ease-out"
          style={{
            left: metrics.left,
            width: metrics.width,
          }}
          aria-hidden
        />
      )}
      {children.map((child) => {
        const value = child.props.value ?? child.key?.toString() ?? "";
        const isActive = activeValue === value;
        return (
          <div
            key={value}
            ref={(node) => {
              if (node) itemRefs.current.set(value, node);
              else itemRefs.current.delete(value);
            }}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            className={cn(
              "relative z-10 cursor-pointer px-4 py-1.5 text-sm font-medium transition-colors duration-200",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={(e: MouseEvent<HTMLDivElement>) => {
              handleSelect(value);
              child.props.onClick?.(e);
            }}
            onMouseEnter={() => setHoverValue(value)}
            onMouseLeave={() => setHoverValue(undefined)}
            onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSelect(value);
              }
              child.props.onKeyDown?.(e);
            }}
          >
            {child.props.children}
          </div>
        );
      })}
    </div>
  );
}
