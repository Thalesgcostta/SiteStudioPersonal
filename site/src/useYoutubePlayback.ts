import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

type Player = {
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  destroy(): void;
};
type PlayerEvent = { target: Player };
type YoutubeApi = {
  Player: new (element: HTMLElement, options: {
    host: string;
    videoId: string;
    playerVars: Record<string, string | number>;
    events: {
      onReady(event: PlayerEvent): void;
      onStateChange(event: PlayerEvent & { data: number }): void;
      onAutoplayBlocked(event: PlayerEvent): void;
      onError(event: PlayerEvent): void;
    };
  }) => Player;
};
type YoutubeWindow = Window & { YT?: YoutubeApi; onYouTubeIframeAPIReady?: () => void };
let apiPromise: Promise<YoutubeApi> | null = null;

// Use the supported iframe API rather than sending undocumented cross-frame commands.
function loadYoutubeApi(): Promise<YoutubeApi> {
  const scope = window as YoutubeWindow;
  if (scope.YT?.Player) return Promise.resolve(scope.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previousReady = scope.onYouTubeIframeAPIReady;
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    const script = existing || document.createElement("script");
    const finish = (error?: Error) => {
      window.clearTimeout(timeout);
      script.removeEventListener("error", failed);
      if (scope.onYouTubeIframeAPIReady === ready) scope.onYouTubeIframeAPIReady = previousReady;
      if (error) {
        if (!existing) script.remove();
        apiPromise = null;
        reject(error);
      } else if (scope.YT?.Player) resolve(scope.YT);
      else { apiPromise = null; reject(new Error("Player indisponível")); }
    };
    const ready = () => {
      try { previousReady?.(); } finally { finish(); }
    };
    const failed = () => finish(new Error("Player indisponível"));
    const timeout = window.setTimeout(failed, 10000);
    scope.onYouTubeIframeAPIReady = ready;
    script.addEventListener("error", failed, { once: true });
    if (!existing) {
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.append(script);
    }
  });
  return apiPromise;
}

export type YoutubePlaybackStatus = "idle" | "loading" | "playing" | "paused" | "blocked" | "ended" | "error";

export function useYoutubePlayback({ videoId, title, target, manualStart, allowAutomatic }: {
  videoId: string;
  title: string;
  target: RefObject<HTMLDivElement | null>;
  manualStart: boolean;
  allowAutomatic: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<Player | null>(null);
  const inView = useRef(false);
  const attempted = useRef(false);
  const intent = useRef<"auto" | "manual">("auto");
  const failed = useRef(false);
  const playing = useRef(false);
  const confirmation = useRef<number | null>(null);
  const [request, setRequest] = useState(0);
  const [status, setStatus] = useState<YoutubePlaybackStatus>("idle");
  const [muted, setMuted] = useState(true);
  const [ready, setReady] = useState(false);
  const clearConfirmation = useCallback(() => {
    if (confirmation.current !== null) window.clearTimeout(confirmation.current);
    confirmation.current = null;
  }, []);
  const requestPlay = useCallback((player: Player, mode: "auto" | "manual") => {
    clearConfirmation();
    if (mode === "auto") player.mute();
    else player.unMute();
    setMuted(mode === "auto");
    if (document.hidden || (mode === "auto" && !inView.current)) {
      setStatus("paused");
      return;
    }
    setStatus("loading");
    // A loaded iframe does not prove that browser policy allowed playback.
    confirmation.current = window.setTimeout(() => {
      if (!playing.current) setStatus("blocked");
    }, 4000);
    player.playVideo();
  }, [clearConfirmation]);
  const start = useCallback((manual: boolean) => {
    attempted.current = true;
    intent.current = manual ? "manual" : "auto";
    if (instance.current && !failed.current) requestPlay(instance.current, intent.current);
    else { setStatus("loading"); setRequest(value => value + 1); }
  }, [requestPlay]);
  const pause = useCallback(() => {
    clearConfirmation();
    if (instance.current) instance.current.pauseVideo();
    playing.current = false;
    setStatus("paused");
  }, [clearConfirmation]);
  const toggleSound = () => {
    const player = instance.current;
    if (!player) return;
    if (muted) player.unMute(); else player.mute();
    setMuted(!muted);
  };

  useEffect(() => {
    if (manualStart) start(true);
  }, [manualStart, start]);

  useEffect(() => {
    const element = target.current;
    if (!element) return;
    const maybeStart = () => {
      if (typeof IntersectionObserver !== "undefined" && allowAutomatic && inView.current && !document.hidden && !attempted.current) start(false);
    };
    const visibility = () => {
      if (document.hidden && instance.current) pause();
      else maybeStart();
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      const entry = entries[0];
      inView.current = entry.isIntersecting && entry.intersectionRatio >= 0.55;
      if (!inView.current && instance.current) pause();
      else maybeStart();
    }, { threshold: [0, 0.55] });
    const bounds = element.getBoundingClientRect();
    const visibleWidth = Math.max(0, Math.min(bounds.right, innerWidth) - Math.max(bounds.left, 0));
    const visibleHeight = Math.max(0, Math.min(bounds.bottom, innerHeight) - Math.max(bounds.top, 0));
    inView.current = bounds.width > 0 && bounds.height > 0 && visibleWidth * visibleHeight / (bounds.width * bounds.height) >= 0.55;
    observer?.observe(element);
    maybeStart();
    document.addEventListener("visibilitychange", visibility);
    return () => { observer?.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, [allowAutomatic, pause, start, target]);

  useEffect(() => {
    if (!request || !host.current) return;
    let active = true;
    let player: Player | null = null;
    failed.current = false;
    playing.current = false;
    setReady(false);
    const container = host.current;
    void loadYoutubeApi().then(api => {
      if (!active) return;
      const mount = document.createElement("div");
      container.replaceChildren(mount);
      player = new api.Player(mount, {
        host: "https://www.youtube-nocookie.com",
        videoId,
        playerVars: { autoplay: 0, mute: 1, controls: 1, playsinline: 1, rel: 0, enablejsapi: 1, origin: window.location.origin },
        events: {
          onReady: event => {
            if (!active) return;
            instance.current = event.target;
            setReady(true);
            const iframe = container.querySelector("iframe");
            if (iframe) {
              iframe.title = `YouTube: ${title}`;
              iframe.referrerPolicy = "strict-origin-when-cross-origin";
            }
            requestPlay(event.target, intent.current);
          },
          onStateChange: event => {
            if (!active) return;
            if (event.data === 1) {
              clearConfirmation();
              playing.current = true;
              // If initialization finished after scrolling away, never play in the background.
              if ((typeof IntersectionObserver !== "undefined" && !inView.current) || document.hidden) pause();
              else setStatus("playing");
            } else if (event.data === 2 || event.data === 0) {
              clearConfirmation();
              playing.current = false;
              setStatus(event.data === 0 ? "ended" : "paused");
            }
          },
          onAutoplayBlocked: () => { if (active) { clearConfirmation(); setStatus("blocked"); } },
          onError: () => {
            if (active) { clearConfirmation(); failed.current = true; setStatus("error"); }
          },
        },
      });
    }).catch(() => {
      if (active) { failed.current = true; setStatus("error"); }
    });
    return () => {
      active = false;
      clearConfirmation();
      if (instance.current === player) instance.current = null;
      player?.destroy();
      container.replaceChildren();
    };
  }, [request, videoId, title, requestPlay, pause, clearConfirmation]);

  useEffect(() => {
    if (!ready) return;
    // Native YouTube controls may change sound independently of our buttons.
    const timer = window.setInterval(() => {
      if (instance.current && inView.current && !document.hidden) setMuted(instance.current.isMuted());
    }, 500);
    return () => window.clearInterval(timer);
  }, [ready]);

  return { host, status, muted, ready, start: () => start(true), pause, toggleSound };
}
