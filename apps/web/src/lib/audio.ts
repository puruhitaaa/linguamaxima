import { toast } from "sonner";

import { api } from "./api";

export interface PlayPronunciationOptions {
  languageCode?: string;
  onError?: (error: unknown) => void;
  onEnd?: () => void;
  onStart?: () => void;
  t: (key: string) => string;
  url?: string | null;
  word?: string;
}

let activeAudioElement: HTMLAudioElement | null = null;

export async function playPronunciationAudio(
  options: PlayPronunciationOptions
): Promise<() => void> {
  const {
    url,
    word,
    languageCode = "de",
    onStart,
    onEnd,
    onError,
    t,
  } = options;

  let hasStarted = false;
  let isCancelled = false;

  // Stop any previously playing single pronunciation audio
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
    } catch {
      // Ignore pause errors
    }
    activeAudioElement = null;
  }

  // 5-second timeout to warn user about VPN / Cloudflare WARP / DNS changes
  const timeoutId = setTimeout(() => {
    if (!hasStarted && !isCancelled) {
      toast.warning(t("audio.timeoutWarningTitle"), {
        description: t("audio.timeoutWarningDesc"),
        duration: 8000,
        id: "audio-vpn-timeout-warning",
      });
    }
  }, 5000);

  const cleanup = () => {
    isCancelled = true;
    clearTimeout(timeoutId);
    if (activeAudioElement) {
      try {
        activeAudioElement.pause();
      } catch {
        // Ignore
      }
      activeAudioElement = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  };

  const notifyStart = () => {
    if (!hasStarted) {
      hasStarted = true;
      clearTimeout(timeoutId);
      onStart?.();
    }
  };

  const notifyEnd = () => {
    clearTimeout(timeoutId);
    if (activeAudioElement) {
      activeAudioElement = null;
    }
    onEnd?.();
  };

  const trySpeechSynthesisFallback = (): boolean => {
    if (word && typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        if (languageCode) {
          utterance.lang = languageCode;
        }
        utterance.addEventListener("start", notifyStart, { once: true });
        utterance.addEventListener("end", notifyEnd, { once: true });
        utterance.addEventListener(
          "error",
          (e) => {
            onError?.(e);
            notifyEnd();
          },
          { once: true }
        );
        window.speechSynthesis.speak(utterance);
        return true;
      } catch {
        // Speech synthesis failed
      }
    }
    return false;
  };

  let mediaUrl = api.getMediaUrl(url ?? undefined);

  // If no direct URL provided, try generating TTS from backend
  if (!mediaUrl && word) {
    try {
      const res = await api.generateTTS(word, languageCode);
      if (res.audio_url) {
        mediaUrl = api.getMediaUrl(res.audio_url);
      }
    } catch {
      // Backend TTS failed, fallback will be tried below
    }
  }

  if (isCancelled) {
    cleanup();
    return cleanup;
  }

  if (mediaUrl) {
    try {
      const audio = new Audio(mediaUrl);
      activeAudioElement = audio;

      audio.addEventListener("playing", notifyStart, { once: true });
      audio.addEventListener("ended", notifyEnd, { once: true });
      audio.addEventListener(
        "error",
        () => {
          if (!trySpeechSynthesisFallback()) {
            toast.error(t("audio.errorTitle"), {
              description: t("audio.errorDesc"),
              duration: 8000,
              id: "audio-vpn-error",
            });
            onError?.(new Error("Audio playback failed"));
            notifyEnd();
          }
        },
        { once: true }
      );

      await audio.play();
      notifyStart();
      return cleanup;
    } catch (error) {
      if (!trySpeechSynthesisFallback()) {
        toast.error(t("audio.errorTitle"), {
          description: t("audio.errorDesc"),
          duration: 8000,
          id: "audio-vpn-error",
        });
        onError?.(error);
        notifyEnd();
      }
      return cleanup;
    }
  }

  if (!trySpeechSynthesisFallback()) {
    clearTimeout(timeoutId);
    toast.error(t("audio.errorTitle"), {
      description: t("audio.errorDesc"),
      duration: 8000,
      id: "audio-vpn-error",
    });
    onError?.(new Error("No audio source available"));
    notifyEnd();
  }

  return cleanup;
}
