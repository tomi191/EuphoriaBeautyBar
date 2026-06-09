"use client";

/**
 * Брандиран TTS аудио плеър за блог статия.
 *
 * Чист custom плеър (НЕ native <audio controls>) с play/pause, прогрес лента
 * с scrubbing и текущо/общо време, в салвия/cream палитрата на марката.
 * Самото <audio> е скрито и се кара през ref.
 *
 * Рендира се само ако постът има audioUrl (страницата подава null/undefined
 * за статии без озвучаване). preload="none" — MP3-ът се тегли чак при play.
 */

import { useRef, useState, useCallback } from "react";
import { Headphones, Pause, Play } from "lucide-react";

type Props = {
  url: string;
};

/** Секунди → "M:SS" (или "0:00" при NaN/Infinity преди metadata). */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function BlogAudioPlayer({ url }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  }, []);

  const onSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el) return;
    const next = Number(e.target.value);
    el.currentTime = next;
    setCurrent(next);
  }, []);

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <aside
      aria-label="Чуй статията"
      className="my-8 rounded-2xl border border-primary/20 bg-secondary/40 p-4 sm:p-5"
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Пауза" : "Възпроизведи"}
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition-transform hover:scale-105 active:scale-95"
        >
          {playing ? (
            <Pause className="size-5" strokeWidth={1.8} />
          ) : (
            <Play className="size-5 translate-x-px" strokeWidth={1.8} />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Headphones className="size-4 text-primary" aria-hidden="true" />
            <span>Чуй статията</span>
            <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
              {formatTime(current)} / {formatTime(duration)}
            </span>
          </div>

          <div className="relative">
            {/* Видима релса + запълване в брандово сейдж. */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            {/* Прозрачен range отгоре — за scrubbing/клавиатура/a11y. */}
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={current}
              onChange={onSeek}
              aria-label="Превърти аудиото"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={url}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        className="hidden"
      >
        Браузърът ви не поддържа аудио плеър.
      </audio>
    </aside>
  );
}
