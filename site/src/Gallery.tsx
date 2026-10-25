import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Pause,
  Play,
  X,
} from "lucide-react";
import { gallery } from "./content";
import { useGalleryAutoplay } from "./useGalleryAutoplay";
import { StudioPhoto } from "./StudioPhoto";

export function Gallery() {
  const [category, setCategory] = useState("Todos");
  const [position, setPosition] = useState(0);
  const [canNext, setCanNext] = useState(true);
  const [view, setView] = useState<number | null>(null);
  const section = useRef<HTMLElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const keyboardInteraction = useRef(false);
  const [dragging, setDragging] = useState(false);
  const track = useRef<HTMLUListElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const captionId = useId();
  const items = gallery.filter(
    (item) => category === "Todos" || item.category === category,
  );
  const updatePosition = () => {
    const el = track.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    const start = cards[0]?.offsetLeft || 0;
    let closest = 0;
    cards.forEach((card, index) => {
      if (
        Math.abs(card.offsetLeft - start - el.scrollLeft) <
        Math.abs(cards[closest].offsetLeft - start - el.scrollLeft)
      )
        closest = index;
    });
    setPosition(closest);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: "instant" });
    setPosition(0);
    const observer = new ResizeObserver(updatePosition);
    observer.observe(el);
    return () => observer.disconnect();
  }, [category]);
  useEffect(() => {
    if (view !== null && !dialog.current?.open) dialog.current?.showModal();
    if (view === null && dialog.current?.open) dialog.current.close();
  }, [view]);
  const move = (direction: number) => {
    const el = track.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    const next = Math.max(0, Math.min(cards.length - 1, position + direction));
    el.scrollTo({
      left: cards[next].offsetLeft - cards[0].offsetLeft,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  const playback = useGalleryAutoplay(
    section,
    () => {
      if (!canNext) track.current?.scrollTo({ left: 0, behavior: "smooth" });
      else move(1);
    },
    hovered || focused || dragging || view !== null || items.length < 2,
    category,
  );
  const moveLightbox = (direction: number) =>
    setView((index) =>
      index === null ? null : (index + direction + items.length) % items.length,
    );
  return (
    <section
      id="galeria"
      ref={section}
      onPointerLeave={() => {
        setHovered(false);
        setDragging(false);
      }}
      onPointerDown={() => {
        keyboardInteraction.current = false;
        setFocused(false);
        setDragging(true);
      }}
      onKeyDownCapture={() => {
        keyboardInteraction.current = true;
        setFocused(true);
      }}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onFocusCapture={(event) =>
        setFocused(
          keyboardInteraction.current || event.target.matches(":focus-visible"),
        )
      }
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      className="gallery-section"
      aria-labelledby="gallery-heading"
    >
      <div className="container gallery-heading">
        <div>
          <span className="eyebrow">A VIDA ACONTECE AQUI</span>
          <h2 id="gallery-heading">
            Pessoas reais.
            <br />
            <em>Treinos de verdade.</em>
          </h2>
        </div>
        <p>
          Um olhar para os nossos dias: movimento, orientação e um espaço para
          se sentir à vontade.
        </p>
      </div>
      <div className="container gallery-toolbar">
        <div
          className="gallery-filters"
          role="group"
          aria-label="Filtrar fotos"
        >
          {["Todos", "Treinos", "Estrutura", "A personal"].map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={category === name}
              onClick={() => setCategory(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="gallery-controls">
          <button
            type="button"
            className="round-button gallery-playback"
            aria-label={
              playback.reduced
                ? "Ativar carrossel automático"
                : playback.paused
                  ? "Retomar carrossel automático"
                  : "Pausar carrossel automático"
            }
            aria-pressed={playback.paused || playback.reduced}
            disabled={items.length < 2}
            title={
              playback.reduced
                ? "Ativar animações e reprodução automática neste site"
                : "Troca automática a cada 2,5 segundos"
            }
            onClick={() => {
              if (playback.reduced) {
                playback.enableMotion();
                playback.setPaused(false);
              } else playback.setPaused(!playback.paused);
            }}
          >
            {playback.paused || playback.reduced ? (
              <Play size={17} />
            ) : (
              <Pause size={17} />
            )}
          </button>
          <button
            type="button"
            className="round-button"
            aria-label="Fotos anteriores"
            disabled={position === 0}
            onClick={() => move(-1)}
          >
            <ArrowLeft size={20} />
          </button>
          <button
            type="button"
            className="round-button"
            aria-label="Próximas fotos"
            disabled={!canNext}
            onClick={() => move(1)}
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
      <ul
        className="gallery-track"
        ref={track}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setHovered(true);
        }}
        onPointerLeave={() => setHovered(false)}
        onScroll={updatePosition}
        aria-label={`Fotos do studio: ${category}`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            move(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        {items.map((item, index) => (
          <li
            key={item.photo.id}
            className={`gallery-slide ${item.photo.width > item.photo.height ? "is-landscape" : ""}`}
          >
            <button
              type="button"
              className="gallery-photo-button"
              aria-label={`Ampliar foto: ${item.title}`}
              onClick={() => setView(index)}
            >
              <StudioPhoto photo={item.photo} />
              <span className="photo-expand" aria-hidden="true">
                <ArrowUpRight size={22} />
              </span>
            </button>
            <div className="gallery-caption">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{item.title}</strong>
                <small>{item.category}</small>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="container gallery-bottom">
        <div className="gallery-progress" aria-hidden="true">
          <span
            style={{
              width: `${100 / items.length}%`,
              marginLeft: `${(position * 100) / items.length}%`,
            }}
          />
        </div>
        <p role="status" aria-live={playback.running ? "off" : "polite"}>
          Foto {position + 1} de {items.length}
        </p>
      </div>
      <dialog
        ref={dialog}
        className={`photo-dialog ${view !== null && items[view].photo.width > items[view].photo.height ? "is-landscape" : ""}`}
        aria-labelledby={captionId}
        onCancel={(e) => {
          e.preventDefault();
          setView(null);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setView(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            e.stopPropagation();
            moveLightbox(e.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        {view !== null && (
          <div className="photo-dialog-content">
            <div className="photo-dialog-top">
              <span>
                {view + 1} / {items.length}
              </span>
              <button
                type="button"
                className="round-button"
                aria-label="Fechar foto"
                onClick={() => setView(null)}
              >
                <X size={22} />
              </button>
            </div>
            <StudioPhoto photo={items[view].photo} priority />
            <div className="photo-dialog-bottom">
              <button
                type="button"
                className="round-button"
                aria-label="Foto anterior ampliada"
                onClick={() => moveLightbox(-1)}
              >
                <ArrowLeft size={19} />
              </button>
              <p id={captionId}>{items[view].title}</p>
              <button
                type="button"
                className="round-button"
                aria-label="Próxima foto ampliada"
                onClick={() => moveLightbox(1)}
              >
                <ArrowRight size={19} />
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
