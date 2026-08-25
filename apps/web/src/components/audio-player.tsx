import { Button } from "@linguamaxima/ui/components/button";
import { Slider } from "@linguamaxima/ui/components/slider";
import {
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "../lib/api";
import { useTranslation } from "../lib/i18n";

interface AudioPlayerProps {
  audioUrl?: string;
  storyTitle?: string;
}

function formatTime(secs: number) {
  if (Number.isNaN(secs)) {
    return "0:00";
  }
  const mins = Math.floor(secs / 60);
  const remainingSecs = Math.floor(secs % 60);
  return `${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
}

const SPEED_STEPS = [0.75, 1, 1.25, 1.5];

export function AudioPlayer({ audioUrl, storyTitle }: AudioPlayerProps) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(1); // Defaults to 1x (index 1)
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const speed = SPEED_STEPS[speedIndex] ?? 1;
  const fullAudioUrl = api.getMediaUrl(audioUrl);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  }, [isPlaying]);

  const cycleSpeed = () => {
    const nextIdx = (speedIndex + 1) % SPEED_STEPS.length;
    setSpeedIndex(nextIdx);
    const nextSpeed = SPEED_STEPS[nextIdx] ?? 1;
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleMute = useCallback(() => {
    if (!audioRef.current) {
      return;
    }
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleSeek = (val: number | number[]) => {
    const targetTime = Array.isArray(val) ? (val[0] ?? 0) : val;
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const rewind5s = useCallback(() => {
    if (audioRef.current) {
      const next = Math.max(0, currentTime - 5);
      audioRef.current.currentTime = next;
      setCurrentTime(next);
    }
  }, [currentTime]);

  // Keyboard shortcut listener for space (play/pause), M (mute), left/right arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
      } else if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        rewind5s();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, toggleMute, rewind5s]);

  if (!fullAudioUrl) {
    return null;
  }

  const renderPlayIcon = () => {
    if (isLoading) {
      return <Loader2 className="size-5 animate-spin text-white" />;
    }
    if (isPlaying) {
      return <Pause className="size-5 fill-white text-white" />;
    }
    return <Play className="size-5 fill-white text-white ml-0.5" />;
  };

  return (
    <section
      aria-label="Story audio narration"
      className="w-full bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xl"
    >
      <audio ref={audioRef} src={fullAudioUrl} preload="metadata">
        <track kind="captions" src="" label="English" />
      </audio>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Main Play/Pause Button - 44px min touch target */}
          <Button
            type="button"
            size="sm"
            onClick={togglePlay}
            aria-label={isPlaying ? t("audio.pause") : t("audio.play")}
            title={isPlaying ? t("audio.pause") : t("audio.play")}
            className="rounded-full size-11 p-0 bg-sky-500 hover:bg-sky-600 text-white shrink-0 shadow-md transition-transform active:scale-95"
          >
            {renderPlayIcon()}
          </Button>

          {/* Rewind 5 seconds - 44px min touch target */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={rewind5s}
            aria-label={t("audio.rewindTooltip")}
            title={t("audio.rewindTooltip")}
            className="size-11 p-0 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl"
          >
            <RotateCcw className="size-4" />
          </Button>

          {/* Speed Toggle - 44px min touch target */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cycleSpeed}
            aria-label={`Playback speed: ${speed}x`}
            title={t("audio.speed")}
            className="h-11 px-3 text-xs font-bold rounded-xl border-neutral-700 bg-neutral-800/90 text-neutral-200 hover:bg-neutral-700 hover:text-white"
          >
            {speed}x
          </Button>
        </div>

        {storyTitle && (
          <div className="hidden sm:block text-xs font-semibold text-neutral-300 truncate max-w-[220px]">
            {storyTitle}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono font-medium text-neutral-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Mute Button - 44px min touch target */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            aria-label={isMuted ? t("audio.unmute") : t("audio.mute")}
            title={isMuted ? t("audio.unmute") : t("audio.mute")}
            className="size-11 p-0 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl"
          >
            {isMuted ? (
              <VolumeX className="size-5 text-rose-400" />
            ) : (
              <Volume2 className="size-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Progress Slider */}
      <div className="w-full px-1 py-1">
        <Slider
          min={0}
          max={duration > 0 ? duration : 1}
          step={0.1}
          value={[currentTime]}
          onValueChange={handleSeek}
          aria-label="Audio playback progress"
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          className="cursor-pointer"
        />
      </div>
    </section>
  );
}
