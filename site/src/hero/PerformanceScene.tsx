import { m } from "framer-motion";
import {
  Activity,
  Dumbbell,
  Heart,
  MoveUpRight,
  Timer,
  TrendingUp,
} from "lucide-react";
import { BrandMark, StudioPhoto } from "../StudioPhoto";
import { photos } from "../content";
import type { PerformanceSnapshot } from "./metrics";
import type { useHeroParallax } from "./useHeroParallax";

type Props = {
  metrics: PerformanceSnapshot;
  motion: ReturnType<typeof useHeroParallax>;
  paused: boolean;
};
export function PerformanceScene({ metrics, motion, paused }: Props) {
  const { x, y, reverseX, reverseY, reduced } = motion;
  const still = reduced || paused;
  return (
    <div className={`hero-visual ${still ? "is-still" : ""}`}>
      <div className="scene-grid" aria-hidden="true" />
      <div className="scene-topline">
        <span>
          <span className="hero-status-dot" /> MOVIMENTO COM PROPÓSITO
        </span>
        <span>01 / KF</span>
      </div>
      <m.div
        className="activity-orbit"
        style={{ x: still ? 0 : reverseX, y: still ? 0 : reverseY }}
      >
        <m.div
          className="orbit-echo"
          aria-hidden="true"
          initial={false}
          animate={
            still
              ? { scale: 1, opacity: 0 }
              : { scale: [1, 1.15, 1.28], opacity: [0.3, 0.12, 0] }
          }
          transition={{ duration: 1.8, repeat: still ? 0 : 1, ease: "easeOut" }}
        />
        <svg
          className="activity-rings"
          viewBox="0 0 400 400"
          aria-hidden="true"
        >
          <circle className="orbit-guide" cx="200" cy="200" r="194" />
          {[
            { radius: 172, color: "#ff6800", progress: 0.86 },
            { radius: 148, color: "#579aba", progress: 0.73 },
            { radius: 124, color: "#bddec9", progress: 0.62 },
          ].map((ring, index) => (
            <g
              className={`activity-ring activity-ring-${index}`}
              key={ring.radius}
              transform="rotate(-90 200 200)"
            >
              <circle
                className="ring-track"
                cx="200"
                cy="200"
                r={ring.radius}
                stroke={ring.color}
              />
              <m.circle
                className="ring-progress"
                cx="200"
                cy="200"
                r={ring.radius}
                stroke={ring.color}
                initial={reduced ? false : { pathLength: 0 }}
                animate={{ pathLength: ring.progress }}
                transition={{
                  duration: reduced ? 0 : 1.45,
                  delay: reduced ? 0 : index * 0.13,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            </g>
          ))}
        </svg>
        <m.div
          className="hero-brand"
          role="img"
          aria-label="KF — Katielle Faleiros Personal Trainer"
          initial={reduced ? false : { opacity: 0, scale: 0.72 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: reduced ? 0 : 0.9,
            delay: reduced ? 0 : 0.28,
            type: "tween",
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <BrandMark className="hero-brand-mark" />
          <span className="hero-brand-name">
            KATIELLE FALEIROS<small>PERSONAL TRAINER</small>
          </span>
        </m.div>
      </m.div>
      <m.div
        className="metric-card metric-vo2"
        style={{ x: still ? 0 : x, y: still ? 0 : y }}
      >
        <span className="metric-icon">
          <TrendingUp size={17} />
        </span>
        <span className="metric-label">CAPACIDADE AERÓBICA</span>
        <strong>
          <span>VO₂ Máx</span> {metrics.vo2Max.toFixed(1)}
        </strong>
        <div className="metric-bars" aria-hidden="true">
          {[35, 47, 42, 63, 57, 78, 70, 92, 85, 100].map((height, i) => (
            <i key={i} style={{ height: `${height}%` }} />
          ))}
        </div>
      </m.div>
      <m.div
        className="metric-card metric-pace"
        style={{ x: still ? 0 : reverseX, y: still ? 0 : reverseY }}
      >
        <span className="metric-icon">
          <Timer size={17} />
        </span>
        <span className="metric-label">SEU RITMO</span>
        <strong>
          {metrics.pace}
          <small>min/km</small>
        </strong>
        <span className="metric-description">Pace · corrida de rua</span>
      </m.div>
      <m.div
        className="metric-card metric-heart"
        style={{ x: still ? 0 : x, y: still ? 0 : y }}
      >
        <span className="metric-label">
          <Heart size={14} /> FREQUÊNCIA CARDÍACA
        </span>
        <strong>
          {metrics.heartRate}
          <small>bpm</small>
        </strong>
        <svg viewBox="0 0 190 34" className="heart-trace" aria-hidden="true">
          <path d="M0 22H28L35 16 42 22H59L66 5 75 32 84 15 91 22H120L127 17 135 22H190" />
        </svg>
      </m.div>
      <m.div
        className="scene-dumbbell"
        style={{ x: still ? 0 : reverseX, y: still ? 0 : y }}
        aria-hidden="true"
      >
        <Dumbbell strokeWidth={1.1} />
      </m.div>
      <div className="hero-photo-primary">
        <StudioPhoto photo={photos.guidedTraining} priority />
        <span>
          <Activity size={15} /> Atenção de perto.
          <MoveUpRight size={15} />
        </span>
      </div>
      <p className="scene-disclaimer">
        {metrics.source === "illustrative"
          ? "Métricas ilustrativas · cada pessoa tem o seu ritmo."
          : "Performance · cada pessoa tem o seu ritmo."}
      </p>
    </div>
  );
}
