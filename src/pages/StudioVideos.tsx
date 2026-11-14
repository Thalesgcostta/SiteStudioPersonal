import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Check, Plus, RotateCcw, Trash2, Youtube } from "lucide-react";
import { Panel } from "../components";
import { useStudio } from "../context";
import { errorMessage, supabase } from "../lib/supabase";
import {
  demoVideosStorageKey,
  isStudioVideoSelection,
  parseYoutubeVideoId,
  readDemoVideos,
  youtubeChannelUrl,
} from "../lib/studioVideos";
import type { StudioVideo, StudioVideoSelection } from "../lib/studioVideos";

type DraftVideo = { key: string; url: string; title: string };
function drafts(videos: StudioVideo[]): DraftVideo[] {
  return videos.map((video) => ({
    key: crypto.randomUUID(),
    url: `https://www.youtube.com/watch?v=${video.videoId}`,
    title: video.title,
  }));
}
function message(error: unknown): string {
  const detail = error as { code?: string; message?: string };
  if (["PGRST202", "42P01", "42883"].includes(detail?.code || ""))
    return "A gestão de vídeos ainda não está disponível no banco. Aplique a migração 010 de vídeos do YouTube no Supabase e tente novamente.";
  if (error instanceof Error && !detail.code) return error.message;
  return errorMessage(error);
}

export function StudioVideos() {
  const { mode, notify } = useStudio();
  const [rows, setRows] = useState<DraftVideo[]>([]);
  const [version, setVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let selection: unknown;
      if (mode === "demo") selection = readDemoVideos();
      else {
        if (!supabase) throw new Error("A conexão com o banco não está disponível.");
        const result = await supabase.rpc("get_studio_videos");
        if (result.error) throw result.error;
        selection = result.data;
      }
      if (!isStudioVideoSelection(selection))
        throw new Error("O banco retornou uma seleção de vídeos inválida. Tente carregar novamente.");
      setRows(drafts(selection.videos));
      setVersion(selection.version);
      setConflict(false);
    } catch (error) {
      setError(message(error));
    } finally {
      setLoading(false);
    }
  }, [mode]);
  useEffect(() => { void load(); }, [load]);

  const update = (key: string, field: "url" | "title", value: string) => {
    setRows((items) => items.map((item) => item.key === key ? { ...item, [field]: value } : item));
  };
  const move = (index: number, direction: number) => {
    setRows((items) => {
      const next = [...items];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || loading || version === null || conflict) return;
    const videos: StudioVideo[] = [];
    for (const [index, row] of rows.entries()) {
      const videoId = parseYoutubeVideoId(row.url);
      if (!videoId) {
        setError(`Vídeo ${index + 1}: informe um link HTTPS de vídeo do YouTube válido (watch, Shorts, live ou youtu.be).`);
        return;
      }
      const title = row.title.trim();
      if (!title || title.length > 120) {
        setError(`Vídeo ${index + 1}: informe um título de até 120 caracteres.`);
        return;
      }
      if (videos.some((video) => video.videoId === videoId)) {
        setError("Cada vídeo deve aparecer apenas uma vez na seleção.");
        return;
      }
      videos.push({ videoId, title });
    }
    setPending(true);
    setError("");
    try {
      let selection: unknown;
      if (mode === "demo") {
        if (readDemoVideos().version !== version) {
          setConflict(true);
          throw new Error("A seleção foi alterada em outra aba. Seus campos foram preservados. Recarregue a seleção salva antes de editar novamente.");
        }
        selection = { version: version + 1, videos } satisfies StudioVideoSelection;
        localStorage.setItem(demoVideosStorageKey, JSON.stringify(selection));
      } else {
        if (!supabase) throw new Error("A conexão com o banco não está disponível.");
        const result = await supabase.rpc("save_studio_videos", {
          p_videos: videos,
          p_expected_version: version,
        });
        if (result.error) {
          if (["40001", "409", "P0002"].includes(result.error.code) || /outra|atualiz|versão|version|conflit/i.test(result.error.message)) {
            setConflict(true);
            throw new Error("A seleção foi alterada em outra sessão. Seus campos foram preservados. Recarregue a seleção salva antes de editar novamente.");
          }
          throw result.error;
        }
        selection = result.data;
      }
      if (!isStudioVideoSelection(selection))
        throw new Error("Não foi possível confirmar a seleção salva. Recarregue antes de tentar novamente.");
      setVersion(selection.version);
      setRows(drafts(selection.videos));
      notify(mode === "demo" ? "Vídeos salvos apenas neste navegador de demonstração." : "Vídeos do site atualizados. A seleção aparece ao recarregar o portfólio.");
    } catch (error) {
      setError(message(error));
    } finally {
      setPending(false);
    }
  };
  return (
    <Panel title="Vídeos do YouTube" subtitle="Escolha o que aparece na seção “Um pouco do studio. Muito sobre cuidar.” do site público.">
      <form onSubmit={save} className="studio-videos-editor settings-fields" aria-busy={loading || pending}>
        <div className="studio-videos-guide">
          <Youtube size={27} aria-hidden="true" />
          <div>
            <strong>Um destaque. Mais três histórias.</strong>
            <p>Cole os links dos vídeos e escreva os títulos. O primeiro fica em destaque e os próximos três aparecem como miniaturas. Use as setas para mudar a ordem.</p>
            <a href={youtubeChannelUrl} target="_blank" rel="noopener noreferrer">Abrir canal da Katielle <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
        </div>
        {mode === "demo" && <p className="note-box">Modo demonstração: a seleção fica somente neste navegador e não altera o site público.</p>}
        {loading ? <p role="status">Carregando seleção de vídeos…</p> : <>
          {!rows.length && version !== null && <p className="subtle-note">Nenhum vídeo selecionado. Adicione até quatro vídeos públicos ou não listados com incorporação permitida. Sem vídeos, o site mantém o convite para conhecer o canal.</p>}
          <ol className="studio-videos-list">
            {rows.map((row, index) => {
              const videoId = parseYoutubeVideoId(row.url);
              return <li key={row.key} className={index === 0 ? "studio-video-item is-featured" : "studio-video-item"}>
                <div className="studio-video-item-heading">
                  <strong>{index === 0 ? "01 · Vídeo principal" : `0${index + 1} · Miniatura ${index}`}</strong>
                  <div className="studio-video-item-actions">
                    <button type="button" className="icon-button" aria-label={`Subir vídeo ${index + 1}`} disabled={pending || index === 0} onClick={() => move(index, -1)}><ArrowUp size={17} /></button>
                    <button type="button" className="icon-button" aria-label={`Descer vídeo ${index + 1}`} disabled={pending || index === rows.length - 1} onClick={() => move(index, 1)}><ArrowDown size={17} /></button>
                    <button type="button" className="icon-button danger" aria-label={`Remover vídeo ${index + 1}`} disabled={pending} onClick={() => setRows((items) => items.filter((item) => item.key !== row.key))}><Trash2 size={17} /></button>
                  </div>
                </div>
                <div className="studio-video-item-body">
                  <div className="studio-video-thumbnail">
                    {videoId ? <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer" aria-label={`Conferir vídeo ${index + 1} no YouTube`}>
                      <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" loading="lazy" />
                      <span>Conferir no YouTube <ArrowUpRight size={14} aria-hidden="true" /></span>
                    </a> : <span><Youtube size={30} aria-hidden="true" />Prévia do vídeo</span>}
                  </div>
                  <div className="studio-video-inputs">
                    <label className="field">Link do vídeo {index + 1}<input type="text" inputMode="url" required maxLength={2048} autoComplete="off" placeholder="https://www.youtube.com/watch?v=…" value={row.url} disabled={pending} onChange={(event) => update(row.key, "url", event.target.value)} /></label>
                    <label className="field">Título do vídeo {index + 1}<input required maxLength={120} value={row.title} disabled={pending} placeholder="Ex.: Cuidado em cada movimento" onChange={(event) => update(row.key, "title", event.target.value)} /></label>
                  </div>
                </div>
              </li>;
            })}
          </ol>
          {version !== null && rows.length < 4 && <button type="button" className="button secondary" disabled={pending} onClick={() => setRows((items) => [...items, { key: crypto.randomUUID(), url: "", title: "" }])}><Plus size={17} />Adicionar {rows.length === 0 ? "vídeo principal" : "vídeo"}</button>}
        </>}
        <p className="subtle-note">A seleção é manual: novos envios no canal não substituem os vídeos escolhidos. Vídeos privados, removidos ou com incorporação desativada podem não tocar no site.</p>
        {error && <div className="studio-videos-error"><p role="alert" className="form-error">{error}</p>{(conflict || version === null) && <><button type="button" className="button secondary" disabled={pending || loading} onClick={() => void load()}><RotateCcw size={16} />{conflict ? "Recarregar seleção salva" : "Tentar carregar novamente"}</button>{conflict && <p className="subtle-note">Recarregar substitui os campos acima pela seleção que está salva no banco.</p>}</>}</div>}
        <div className="settings-save"><button type="submit" className="button primary" disabled={pending || loading || version === null || conflict}><Check size={16} />{pending ? "Salvando…" : "Salvar vídeos"}</button></div>
      </form>
    </Panel>
  );
}
