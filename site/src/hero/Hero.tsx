import { useState } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import { ArrowDown, ArrowUpRight, Check, Pause, Play } from "lucide-react";
import { whatsappLink } from "../content";
import { PerformanceScene } from "./PerformanceScene";
import { illustrativePerformance } from "./metrics";
import type { PerformanceSnapshot } from "./metrics";
import { useHeroParallax } from "./useHeroParallax";

export function Hero({
  metrics = illustrativePerformance,
}: {
  metrics?: PerformanceSnapshot;
}) {
  const motion = useHeroParallax();
  const [paused, setPaused] = useState(false);
  return (
    <LazyMotion features={domAnimation} strict>
      <section
        id="inicio"
        className={`hero ${motion.reduced || paused ? "is-still" : ""}`}
        aria-labelledby="hero-heading"
        onPointerMove={paused ? undefined : motion.move}
        onPointerLeave={motion.reset}
      >
        <div className="hero-aura" aria-hidden="true" />
        <div className="container hero-layout">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="hero-status-dot" /> PERSONAL TRAINING · FRANCA,
              SP
            </span>
            <h1 id="hero-heading">
              Seu corpo.
              <br />
              Seu ritmo.
              <br />
              <em>Seu melhor.</em>
            </h1>
            <p>
              Treino intenso. Cuidado de perto. Uma experiência personalizada
              para transformar movimento em qualidade de vida.
            </p>
            <div className="hero-actions">
              <a
                className="cta"
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
              >
                Agendar aula gratuita{" "}
                <ArrowUpRight size={20} aria-hidden="true" />
              </a>
              <a className="text-link" href="#studio">
                Conheça o studio <ArrowDown size={17} />
              </a>
            </div>
            <div className="hero-proof">
              <span>
                <Check size={15} /> Treino individualizado
              </span>
              <span>
                <Check size={15} /> Mais de 15 anos de experiência
              </span>
            </div>
          </div>
          <PerformanceScene metrics={metrics} motion={motion} paused={paused} />
          <div className="hero-bottom">
            <span>FORÇA. FOCO. MOVIMENTO.</span>
            <a href="#studio" aria-label="Descubra nosso cuidado">
              <ArrowDown size={18} />
            </a>
            <button
              type="button"
              className="hero-motion-toggle"
              aria-pressed={paused || motion.reduced}
              onClick={() => {
                if (motion.reduced) {
                  motion.enableMotion();
                  setPaused(false);
                } else setPaused(!paused);
                motion.reset();
              }}
              aria-label={
                motion.reduced
                  ? "Ativar animações do site"
                  : paused
                    ? "Retomar movimento da abertura"
                    : "Pausar movimento da abertura"
              }
            >
              {paused || motion.reduced ? (
                <Play size={13} />
              ) : (
                <Pause size={13} />
              )}
              <span>
                {motion.reduced
                  ? "Ativar animações"
                  : paused
                    ? "Retomar movimento"
                    : "Pausar movimento"}
              </span>
            </button>
          </div>
        </div>
      </section>
    </LazyMotion>
  );
}
