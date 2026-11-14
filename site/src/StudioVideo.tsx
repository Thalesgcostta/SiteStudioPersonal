import { useRef, useState } from "react";
import { ArrowUpRight, Play, Youtube } from "lucide-react";
import { channelUrl, useStudioVideos } from "./useStudioVideos";
import type { ChannelVideo } from "./useStudioVideos";
import "./studio-videos.css";
import { usePresentation } from "./Presentation";

function Thumbnail({ video }: { video: ChannelVideo }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className="channel-image-fallback" aria-hidden="true">KF</span> : (
    <img src={`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`} alt="" loading="lazy"
      width={480} height={360} referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  );
}

export function StudioVideo() {
  const { videos, loading } = useStudioVideos();
  const { compact } = usePresentation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const player = useRef<HTMLDivElement>(null);
  const selected = videos.find(v => v.videoId === selectedId) || videos[0];
  const suggestions = videos.filter(v => v.videoId !== selected?.videoId);
  const watchUrl = selected ? `https://www.youtube.com/watch?v=${selected.videoId}` : channelUrl;
  return (
    <section id="em-movimento" className="video-section channel-section" aria-labelledby="video-heading">
      <div className="container">
        <div className="video-heading">
          <div>
            <span className="eyebrow">DO STUDIO PARA O SEU DIA.</span>
            <h2 id="video-heading">Um pouco do studio.<br /><em>Muito sobre cuidar.</em></h2>
          </div>
          <p>{compact ? "Dê o play. Conheça nosso jeito de cuidar." : "Movimento, orientação e cuidado também em vídeo. Dê o play e conheça mais de perto o nosso jeito de treinar."}</p>
        </div>
        <div className="channel-bar">
          <a className="channel-link" href={channelUrl} target="_blank" rel="noopener noreferrer">
            <Youtube size={20} aria-hidden="true" /> Explorar o canal <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        </div>
        <div className="channel-layout" aria-busy={loading}>
          <div className="channel-feature">
            <div className="channel-player" ref={player} tabIndex={-1} role="group" aria-label="Vídeo em destaque">
              {selected ? playingId === selected.videoId ? (
                <iframe key={selected.videoId} title={`YouTube: ${selected.title}`}
                  src={`https://www.youtube-nocookie.com/embed/${selected.videoId}?autoplay=1&rel=0&playsinline=1`}
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin" />
              ) : (
                <button type="button" className="channel-play" aria-label={`Reproduzir ${selected.title}`}
                  onClick={() => setPlayingId(selected.videoId)}>
                  <Thumbnail key={selected.videoId} video={selected} />
                  <span className="channel-feature-tag"><Youtube size={16} aria-hidden="true" /> NO CANAL DA KATIELLE</span>
                  <span className="channel-play-icon"><Play size={32} fill="currentColor" aria-hidden="true" /></span>
                  <span className="channel-play-label">Dê o play. Venha conhecer.</span>
                </button>
              ) : (
                <div className="channel-no-video"><Youtube size={44} aria-hidden="true" /><p>Novas histórias de cuidado vêm por aí.</p><a href={channelUrl} target="_blank" rel="noopener noreferrer">Conhecer o canal <ArrowUpRight size={17} /></a></div>
              )}
            </div>
            <div className="channel-feature-caption">
              <span className="channel-kicker">{playingId === selected?.videoId ? "AGORA NO PLAYER" : "EM DESTAQUE"}</span>
              <h3>{selected?.title || "Nosso próximo encontro é no YouTube."}</h3>
              <a href={watchUrl} target="_blank" rel="noopener noreferrer">{selected ? "Assistir no YouTube" : "Visitar o canal"} <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
          <aside className="channel-more" aria-labelledby="channel-more-heading">
            <div className="channel-more-heading"><h3 id="channel-more-heading">Mais do nosso canal</h3><span>CONTINUE EXPLORANDO</span></div>
            <ol className="channel-list">
              {Array.from({ length: 3 }, (_, index) => {
                const video = suggestions[index];
                return <li key={video?.videoId || `empty-${index}`}>
                  {video ? (
                    <button className="channel-suggestion" type="button" aria-label={`Assistir ${video.title}`}
                      onClick={() => { setSelectedId(video.videoId); setPlayingId(video.videoId); player.current?.focus(); }}>
                      <span className="channel-miniature"><Thumbnail key={video.videoId} video={video} /><span className="channel-mini-play"><Play size={17} fill="currentColor" aria-hidden="true" /></span></span>
                      <span className="channel-suggestion-copy"><small>NO CANAL</small><strong>{video.title}</strong><span>Assistir agora <ArrowUpRight size={14} aria-hidden="true" /></span></span>
                    </button>
                  ) : (
                    <div className="channel-empty" role="group" aria-label="Espaço para um próximo vídeo">
                      <span className="channel-miniature"><Youtube size={27} aria-hidden="true" /></span>
                      <span className="channel-suggestion-copy"><small>EM BREVE</small><strong>Mais movimento por aqui.</strong><span>Um espaço para novas histórias.</span></span>
                    </div>
                  )}
                </li>;
              })}
            </ol>
            <p className="channel-more-note">Treine com atenção.<br /><span>Leve esse cuidado com você.</span></p>
          </aside>
        </div>
        {selected && <p className="channel-player-note">{compact ? "Prefere o aplicativo? " : "O vídeo carrega ao dar play. Prefere abrir no aplicativo? "}<a href={watchUrl} target="_blank" rel="noopener noreferrer">Assista pelo YouTube <ArrowUpRight size={14} aria-hidden="true" /></a></p>}
        <span className="sr-only" role="status">{selected ? `Vídeo selecionado: ${selected.title}` : "Nenhum vídeo selecionado."}</span>
      </div>
    </section>
  );
}
