import { Button } from "@linguamaxima/ui/components/button";
import { Slider } from "@linguamaxima/ui/components/slider";
import {
  Globe,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { api } from "../lib/api";
import { useTranslation } from "../lib/i18n";

export interface AudioPlayerHandle {
  seekTo: (timeInSeconds: number, autoPlay?: boolean) => Promise<void>;
  togglePlay: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getIsPlaying: () => boolean;
}

export interface AudioPlayerProps {
  audioUrl?: string;
  storyContent?: string;
  storyTitle?: string;
  targetLanguage?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  ref?: React.Ref<AudioPlayerHandle>;
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

export function AudioPlayer({
  audioUrl,
  storyContent,
  storyTitle,
  targetLanguage = "de",
  onTimeUpdate,
  onDurationChange,
  onPlayStateChange,
  ref,
}: AudioPlayerProps) {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(1); // Defaults to 1x (index 1)
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dynamicAudioUrl, setDynamicAudioUrl] = useState<string>("");
  const [showVpnHint, setShowVpnHint] = useState(false);

  const speed = SPEED_STEPS[speedIndex] ?? 1;
  const initialAudioUrl = api.getMediaUrl(audioUrl);
  const activeAudioUrl = dynamicAudioUrl || initialAudioUrl;

  const clearTimeoutTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startTimeoutTimer = useCallback(() => {
    clearTimeoutTimer();
    timeoutRef.current = setTimeout(() => {
      setShowVpnHint(true);
      toast.warning(t("audio.timeoutWarningTitle"), {
        description: t("audio.timeoutWarningDesc"),
        duration: 8000,
        id: "story-audio-timeout",
      });
    }, 5000);
  }, [clearTimeoutTimer, t]);

  useEffect(
    () => () => {
      clearTimeoutTimer();
    },
    [clearTimeoutTimer]
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      onDurationChange?.(audio.duration);
    };
    const handlePlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
      clearTimeoutTimer();
      onPlayStateChange?.(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
      clearTimeoutTimer();
      onPlayStateChange?.(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      clearTimeoutTimer();
      onPlayStateChange?.(false);
    };
    const handleWaiting = () => {
      setIsLoading(true);
      startTimeoutTimer();
    };
    const handleCanPlay = () => {
      setIsLoading(false);
    };
    const handleError = () => {
      setIsPlaying(false);
      setIsLoading(false);
      clearTimeoutTimer();
      onPlayStateChange?.(false);
      setShowVpnHint(true);
      toast.error(t("audio.errorTitle"), {
        description: t("audio.errorDesc"),
        duration: 8000,
        id: "story-audio-error",
      });
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
    };
  }, [
    clearTimeoutTimer,
    onDurationChange,
    onPlayStateChange,
    onTimeUpdate,
    startTimeoutTimer,
    t,
  ]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;

    if (isPlaying) {
      if (audio) {
        audio.pause();
      }
      setIsPlaying(false);
      clearTimeoutTimer();
      return;
    }

    setIsLoading(true);
    startTimeoutTimer();

    // If no pre-existing audio URL, attempt to generate TTS on the fly
    let currentUrl = activeAudioUrl;
    if (!currentUrl && storyContent) {
      try {
        const res = await api.generateTTS(storyContent, targetLanguage);
        if (res.audio_url) {
          currentUrl = api.getMediaUrl(res.audio_url);
          setDynamicAudioUrl(currentUrl);
        }
      } catch {
        setShowVpnHint(true);
        toast.error(t("audio.errorTitle"), {
          description: t("audio.errorDesc"),
          duration: 8000,
          id: "story-audio-error",
        });
        setIsLoading(false);
        clearTimeoutTimer();
        return;
      }
    }

    if (!audio) {
      setIsLoading(false);
      clearTimeoutTimer();
      return;
    }

    if (currentUrl && audio.src !== currentUrl) {
      audio.src = currentUrl;
      audio.load();
    }

    try {
      await audio.play();
      setIsPlaying(true);
      setIsLoading(false);
      clearTimeoutTimer();
    } catch {
      setIsPlaying(false);
      setIsLoading(false);
      clearTimeoutTimer();
      setShowVpnHint(true);
      toast.error(t("audio.errorTitle"), {
        description: t("audio.errorDesc"),
        duration: 8000,
        id: "story-audio-error",
      });
    }
  }, [
    activeAudioUrl,
    clearTimeoutTimer,
    isPlaying,
    startTimeoutTimer,
    storyContent,
    t,
    targetLanguage,
  ]);

  const play = useCallback(async () => {
    if (!isPlaying) {
      await togglePlay();
    }
  }, [isPlaying, togglePlay]);

  const pause = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const seekTo = useCallback(
    async (timeInSeconds: number, autoPlay = false) => {
      const audio = audioRef.current;
      const targetTime = Math.max(0, timeInSeconds);
      if (audio) {
        audio.currentTime = targetTime;
        setCurrentTime(targetTime);
        onTimeUpdate?.(targetTime);
        if (autoPlay && !isPlaying) {
          await togglePlay();
        }
      }
    },
    [isPlaying, onTimeUpdate, togglePlay]
  );

  useImperativeHandle(
    ref,
    () => ({
      seekTo,
      togglePlay,
      play,
      pause,
      getCurrentTime: () => currentTime,
      getDuration: () => duration,
      getIsPlaying: () => isPlaying,
    }),
    [currentTime, duration, isPlaying, pause, play, seekTo, togglePlay]
  );

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

  // Keyboard shortcut listener for space (play/pause), M (mute), J (rewind 5s)
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

  if (!activeAudioUrl && !storyContent) {
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
      <audio
        ref={audioRef}
        src={activeAudioUrl || undefined}
        preload="metadata"
      >
        <track kind="captions" src="" label="Subtitles" />
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
            className="rounded-full size-11 p-0 bg-sky-500 hover:bg-sky-600 text-white shrink-0 shadow-md transition-transform active:scale-95 cursor-pointer"
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
            className="size-11 p-0 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl cursor-pointer"
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
            className="h-11 px-3 text-xs font-bold rounded-xl border-neutral-700 bg-neutral-800/90 text-neutral-200 hover:bg-neutral-700 hover:text-white cursor-pointer"
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
            className="size-11 p-0 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl cursor-pointer"
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

      {/* VPN / Cloudflare Warp Guidance Banner */}
      {showVpnHint && (
        <div className="mt-1 flex items-start justify-between gap-3 p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-start gap-2.5">
            <Globe className="size-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-300">
                {t("audio.timeoutWarningTitle")}
              </p>
              <p className="text-amber-200/90 leading-relaxed">
                {t("audio.vpnRecommendation")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={togglePlay}
              className="h-7 px-2.5 text-xs font-semibold rounded-lg border-amber-500/40 bg-amber-900/30 text-amber-200 hover:bg-amber-800/40 hover:text-white cursor-pointer"
            >
              {t("audio.retry")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowVpnHint(false)}
              className="size-7 p-0 text-amber-400 hover:text-white hover:bg-amber-900/40 rounded-lg cursor-pointer"
              aria-label="Dismiss warning"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
