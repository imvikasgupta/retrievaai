import { AnimatedBackground } from "@/components/core/animated-background";

export function AnimatedTabsHover() {
  const TABS = ["Home", "About", "Services", "Contact"];

  return (
    <div className="flex items-center justify-center p-8">
      <AnimatedBackground
        defaultValue="Home"
        className="rounded-full border border-border/60 bg-background p-1 shadow-soft"
      >
        {TABS.map((tab) => (
          <button key={tab} value={tab} type="button">
            {tab}
          </button>
        ))}
      </AnimatedBackground>
    </div>
  );
}
