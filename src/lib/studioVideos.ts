export type StudioVideo = { videoId: string; title: string };
export type StudioVideoSelection = { version: number; videos: StudioVideo[] };

export const youtubeChannelUrl = "https://www.youtube.com/@KatielleFaleiros.";
export const demoVideosStorageKey = "kf-studio-youtube-v1";
const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;

export function parseYoutubeVideoId(input: string): string | null {
  const value = input.trim();
  if (videoIdPattern.test(value)) return value;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" || url.username || url.password || url.port ||
      /^https:\/\/[^/?#]*:/i.test(value)
    )
      return null;
    let id: string | null = null;
    if (url.hostname === "youtu.be") {
      const match = url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/);
      id = match?.[1] || null;
    } else if (
      ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(url.hostname)
    ) {
      if (url.pathname === "/watch") {
        if (url.searchParams.getAll("v").length !== 1) return null;
        id = url.searchParams.get("v");
      } else {
        const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/);
        id = match?.[1] || null;
      }
    }
    // Listas sem vídeo e links de canais nunca viram vídeos da seleção.
    return id && videoIdPattern.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function isStudioVideoSelection(value: unknown): value is StudioVideoSelection {
  if (!value || typeof value !== "object") return false;
  const selection = value as StudioVideoSelection;
  return (
    Number.isInteger(selection.version) && selection.version >= 0 &&
    Array.isArray(selection.videos) && selection.videos.length <= 4 &&
    selection.videos.every((video) =>
      video && typeof video === "object" &&
      typeof video.videoId === "string" && videoIdPattern.test(video.videoId) &&
      typeof video.title === "string" && video.title.trim().length > 0 && video.title.length <= 120,
    ) &&
    new Set(selection.videos.map((video) => video.videoId)).size === selection.videos.length
  );
}

export function readDemoVideos(): StudioVideoSelection {
  const raw = localStorage.getItem(demoVideosStorageKey);
  if (!raw) return {
    version: 0,
    videos: [{ videoId: "ZsS8bJw2i9k", title: "Um pouco do Studio Katielle Faleiros" }],
  };
  const value: unknown = JSON.parse(raw);
  if (!isStudioVideoSelection(value))
    throw new Error("A seleção demonstrativa salva é inválida. Nenhum dado foi substituído.");
  return value;
}
