import { useEffect, useState } from "react";
import type { Photo } from "./content";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="166 30 268 168" aria-hidden="true">
      <path
        fill="#ff6800"
        d="M171 82 213 40 213 100 273 40 325 40 257 108 289 140 289 191 233 135 213 155 213 191 171 191Z"
      />
      <path
        fill="#579aba"
        d="M294 82 336 40 428 40 389 79 335 79 335 98 390 98 390 138 335 138 335 191 294 191Z"
      />
    </svg>
  );
}
export function StudioPhoto({
  photo,
  className = "",
  priority = false,
}: {
  photo: Photo;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo.src]);
  return failed ? (
    <div
      className={`photo-fallback ${className}`}
      role="img"
      aria-label={photo.alt}
    >
      <BrandMark />
      <span>STUDIO KATIELLE FALEIROS</span>
    </div>
  ) : (
    <img
      className={`studio-photo ${className}`}
      src={photo.src}
      width={photo.width}
      height={photo.height}
      alt={photo.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
