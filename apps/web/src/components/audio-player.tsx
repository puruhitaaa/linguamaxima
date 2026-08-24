import { Button } from "@linguamaxima/ui/components/button";
import {
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { api } from "../lib/api";

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

export function AudioPlayer({ audioUrl, storyTitle }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const togglePlay = async () => {
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
  };

  const toggleSpeed = () => {
    let nextSpeed = 1;
    if (speed === 1) {
      nextSpeed = 0.75;
    } else if (speed === 0.75) {
      nextSpeed = 1.25;
    }
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) {
      return;
    }
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (values: number[] | number | undefined) => {
    let val = 0;
    if (Array.isArray(values)) {
      val = values[0] ?? 0;
    } else if (typeof values === "number") {
      val = values;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  if (!fullAudioUrl) {
    return null;
  }

  const renderPlayIcon = () => {
    if (isLoading) {
      return <Loader2 className="size-4 animate-spin" />;
    }
    if (isPlaying) {
      return <Pause className="size-4 fill-white" />;
    }
    return <Play className="size-4 fill-white ml-0.5" />;
  };

  return (
    <div className="w-full bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-xl p-3.5 flex flex-col gap-2.5 shadow-lg">
      <audio ref={audioRef} src={fullAudioUrl} preload="metadata">
        <track kind="captions" />
      </audio>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={togglePlay}
            className="rounded-full size-9 p-0 bg-sky-500 hover:bg-sky-600 text-white shrink-0 shadow"
          >
            {renderPlayIcon()}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = Math.max(0, currentTime - 5);
              }
            }}
            className="size-8 p-0 text-neutral-400 hover:text-white hover:bg-neutral-800"
            title="Rewind 5s"
          >
            <RotateCcw className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSpeed}
            className="h-7 px-2 text-xs font-semibold rounded-md border-neutral-700 bg-neutral-800/80 text-neutral-200 hover:bg-neutral-700"
          >
            {speed}x
          </Button>
        </div>

        {storyTitle && (
          <div className="hidden sm:block text-xs font-medium text-neutral-300 truncate max-w-[200px]">
            {storyTitle}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-neutral-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="size-8 p-0 text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            {isMuted ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Progress Slider */}
      <div className="w-full px-1">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={(e) => handleSeek([Number(e.target.value)])}
          className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
        />
      </div>
    </div>
  );
}
