import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { RefObject } from "react";

/** One timer, only while the carousel is visible and the visitor is not interacting. */
export function useGalleryAutoplay(
  section: RefObject<HTMLElement | null>,
  advance: () => void,
  suspended: boolean,
  category: string,
) {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const callback = useRef(advance);
  useEffect(() => {
    callback.current = advance;
  }, [advance]);
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(el);
    const visibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [section]);
  const running = visible && pageVisible && !paused && !reduced && !suspended;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => callback.current(), 2500);
    return () => window.clearInterval(timer);
  }, [running, category]);
  return { running, paused, setPaused, reduced: !!reduced };
}
