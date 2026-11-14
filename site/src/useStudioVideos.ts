import { useEffect, useState } from "react";

export type ChannelVideo = { videoId: string; title: string };
export const channelUrl = "https://www.youtube.com/@KatielleFaleiros.";
// O vídeo inicial foi escolhido pelo studio. Uma seleção salva vazia é respeitada.
export const initialVideos: ChannelVideo[] = [
  { videoId: "ZsS8bJw2i9k", title: "Um pouco do Studio Katielle Faleiros" },
];

export function readVideos(data: unknown): ChannelVideo[] {
  const videos = (data as { videos?: unknown } | null)?.videos;
  if (!Array.isArray(videos) || videos.length > 4) throw new Error("Seleção inválida");
  const ids = new Set<string>();
  return videos.map((video: unknown) => {
    const v = video as Partial<ChannelVideo> | null;
    if (!v || typeof v.videoId !== "string" || !/^[\w-]{11}$/.test(v.videoId) ||
      typeof v.title !== "string" || !v.title.trim() || v.title.length > 120 || ids.has(v.videoId))
      throw new Error("Vídeo inválido");
    ids.add(v.videoId);
    return { videoId: v.videoId, title: v.title.trim() };
  });
}

export function useStudioVideos() {
  const [videos, setVideos] = useState<ChannelVideo[]>(initialVideos);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL?.trim();
    const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim();
    if (!url || !key || key.startsWith("sb_secret_")) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 7000);
    async function load() {
      try {
        const endpoint = new URL(url!);
        if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
          !(endpoint.protocol === "https:" || endpoint.protocol === "http:" && ["localhost", "127.0.0.1"].includes(endpoint.hostname)))
          throw new Error("URL inválida");
        const headers: Record<string, string> = { apikey: key!, "Content-Type": "application/json" };
        // A leitura pública não importa nem transmite a sessão da gestão.
        if (!key!.startsWith("sb_publishable_")) {
          const payload = JSON.parse(atob(key!.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")));
          if (payload.role !== "anon") throw new Error("Chave inválida");
          headers.Authorization = `Bearer ${key}`;
        }
        const response = await fetch(`${url!.replace(/\/$/, "")}/rest/v1/rpc/get_public_studio_videos`, {
          method: "POST", headers, body: "{}", signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const selection = readVideos(await response.json());
        if (active) setVideos(selection);
      } catch {
        if (active) console.warn("[Vídeos do studio] Seleção indisponível; exibindo o vídeo inicial do canal.");
      } finally {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
  }, []);
  return { videos, loading };
}
