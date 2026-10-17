import { useRef, useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";
import { studioVideo, whatsappLink } from "./content";

export function StudioVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);

  const play = () => {
    const player = video.current;
    if (!player) return;
    // Só atribuímos a mídia após o clique: a visita não baixa o MP4.
    player.src = studioVideo.src;
    player.controls = true;
    setStarted(true);
    void player.play().catch(() => {
      // Os controles nativos permitem tentar novamente se o navegador pausar.
    });
  };

  return (
    <section
      id="em-movimento"
      className="video-section"
      aria-labelledby="video-heading"
    >
      <div className="container">
        <div className="video-heading">
          <div>
            <span className="eyebrow">DÊ O PLAY. SINTA O AMBIENTE.</span>
            <h2 id="video-heading">
              Um pouco do studio.
              <br />
              <em>Muito sobre cuidar.</em>
            </h2>
          </div>
          <p>
            Conheça o espaço, os treinos e o acompanhamento que faz parte dos
            nossos dias. Depois, venha viver essa experiência de perto.
          </p>
        </div>
        <figure className="studio-film">
          <div className="video-frame">
            <video
              ref={video}
              width={studioVideo.width}
              height={studioVideo.height}
              poster={studioVideo.poster}
              preload="none"
              playsInline
              controls={started}
              aria-label="Vídeo do Studio de Personal Katielle Faleiros"
              aria-describedby="video-description"
              onError={() => setFailed(true)}
            >
              Seu navegador não consegue reproduzir este vídeo.
            </video>
            {!started && (
              <button
                className="video-start"
                type="button"
                aria-label="Reproduzir vídeo do studio"
                onClick={play}
              >
                <span className="video-play-icon">
                  <Play size={30} fill="currentColor" aria-hidden="true" />
                </span>
                <span>Conheça o studio em 20 segundos</span>
              </button>
            )}
          </div>
          <figcaption className="video-caption">
            <span>
              <span className="status-dot" /> É AQUI QUE ACONTECE.
            </span>
            <a
              className="text-link"
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
            >
              Quero conhecer de perto{" "}
              <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </figcaption>
        </figure>
        <p id="video-description" className="video-description">
          No vídeo, Katielle orienta alunos nos exercícios e a câmera percorre
          os aparelhos e a iluminação do studio. As cenas destacam o
          acompanhamento personalizado, a segurança e o convite para uma aula
          experimental.
        </p>
        {failed && (
          <p className="video-error" role="status">
            Não foi possível carregar o vídeo.{" "}
            <a href={studioVideo.src}>Abrir o vídeo diretamente</a>.
          </p>
        )}
      </div>
    </section>
  );
}
