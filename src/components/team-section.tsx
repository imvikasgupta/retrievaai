"use client";

import { motion } from "motion/react";
import { EASE_OUT, TiltCard } from "@/components/ui/be-ui-tilt-card";
import vikasPhoto from "@/assets/vikas.jpg.asset.json";
import vaibhavPhoto from "@/assets/vinayak.jpg.asset.json";
import vinayakPhoto from "@/assets/vinayak-nandan.png.asset.json";

const team = [
  {
    name: "Vikas Gupta",
    role: "🎨 UI/UX & RAG",
    year: "🎓 3rd year",
    image: vikasPhoto.url,
  },
  {
    name: "Vaibhav Srivastav",
    role: "⚙️ Front-end",
    year: "🎓 3rd year",
    image: vaibhavPhoto.url,
  },
  {
    name: "Vinayak Nandan",
    role: "🧠 Back-end & RAG",
    year: "🎓 3rd year",
    image: vinayakPhoto.url,
  },
];

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.65, ease: EASE_OUT },
};

export function TeamSection() {
  return (
    <section id="features" className="overflow-hidden border-y border-border/60 bg-muted/30 py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.8fr)] lg:gap-12">
          <div className="min-w-0">
            <motion.p
              {...reveal}
              className="text-sm font-semibold text-brand"
            >
              The team 👋
            </motion.p>
            <motion.h2
              {...reveal}
              transition={{ duration: 0.65, delay: 0.06, ease: EASE_OUT }}
              className="mt-2 font-display text-3xl font-bold text-balance sm:text-4xl"
            >
              Built by three students
            </motion.h2>
            <motion.div
              {...reveal}
              transition={{ duration: 0.65, delay: 0.12, ease: EASE_OUT }}
              className="mt-4 max-w-md text-muted-foreground"
            >
              <p>Design, frontend, backend and retrieval — shipped end to end.</p>
              <p className="mt-3 text-xl" aria-label="Rocket">
                🚀
              </p>
            </motion.div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.65, delay: index * 0.1, ease: EASE_OUT }}
                className="h-full min-w-0"
              >
                <TiltCard
                  max={7}
                  glare={true}
                  className="group h-full border border-border bg-card p-5 shadow-soft transition-shadow duration-300 hover:shadow-lift xl:p-6"
                >
                  <div className="flex h-full min-h-72 flex-col items-center text-center [transform:translateZ(24px)]">
                    <div className="aspect-square w-28 overflow-hidden rounded-2xl border border-border bg-muted shadow-soft sm:w-32 lg:w-full lg:max-w-32 xl:max-w-36">
                      <img
                        src={member.image}
                        alt={`${member.name}, ${member.role.replace(/^\S+\s/, "")}`}
                        loading="lazy"
                        className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    </div>
                    <h3 className="mt-5 font-display text-base font-semibold text-card-foreground">
                      {member.name}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">{member.role}</p>
                    <p className="mt-auto pt-2 text-xs text-muted-foreground">{member.year}</p>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}