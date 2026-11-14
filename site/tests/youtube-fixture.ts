import type { Page } from "@playwright/test";

/** The real network/player is replaced; commands and state events still exercise app behavior. */
export async function mockYoutube(page: Page, { blockAutomatic = false }: { blockAutomatic?: boolean } = {}) {
  await page.route("https://www.youtube.com/iframe_api", route => route.fulfill({
    contentType: "application/javascript",
    body: `(() => {
      const log = window.__youtubeMock = { players: [], operations: [], blockAutomatic: ${JSON.stringify(blockAutomatic)} };
      class Player {
        constructor(element, options) {
          this.options = options; this.videoId = options.videoId; this.muted = true; this.state = -1; this.destroyed = false; this.blockedOnce = false;
          const iframe = this.iframe = document.createElement('iframe');
          iframe.src = options.host + '/embed/' + options.videoId + '?' + new URLSearchParams(options.playerVars);
          iframe.title = 'Player YouTube simulado';
          iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
          iframe.allowFullscreen = true;
          element.replaceWith(iframe);
          log.players.push(this);
          setTimeout(() => { if (!this.destroyed) options.events.onReady({ target: this }); }, 0);
        }
        record(command) { log.operations.push({ command, videoId: this.videoId, muted: this.muted }); }
        emitState(state) { if (this.destroyed) return; this.state = state; this.options.events.onStateChange({ target: this, data: state }); }
        playVideo() {
          this.record('playVideo');
          if (log.blockAutomatic && this.muted && !this.blockedOnce) {
            this.blockedOnce = true; this.options.events.onAutoplayBlocked({ target: this });
          } else this.emitState(1);
        }
        pauseVideo() { this.record('pauseVideo'); this.emitState(2); }
        mute() { this.muted = true; this.record('mute'); }
        unMute() { this.muted = false; this.record('unMute'); }
        isMuted() { return this.muted; }
        destroy() { this.record('destroy'); this.destroyed = true; this.iframe.remove(); }
      }
      window.YT = { Player };
      window.onYouTubeIframeAPIReady?.();
    })();`,
  }));
  await page.route("https://www.youtube-nocookie.com/**", route => route.fulfill({
    contentType: "text/html",
    body: '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Player simulado</title></head><body><main aria-label="Player YouTube simulado"><p>Vídeo externo simulado para testes locais.</p></main></body></html>',
  }));
}
