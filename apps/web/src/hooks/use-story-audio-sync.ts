import { useCallback, useMemo, useState } from "react";

const SPEAKER_LINE_REGEX = /^(?<speaker>[^:\n\r]{1,40}):\s*(?<text>[\s\S]+)$/u;

const STORAGE_KEY_WORD_HIGHLIGHT = "linguamaxima_sync_word_highlight";
const STORAGE_KEY_ITEM_OUTLINE = "linguamaxima_sync_item_outline";

export interface WordTimelineItem {
  rawWord: string;
  cleanedWord: string;
  paragraphIndex: number;
  wordIndex: number;
  startTime: number;
  endTime: number;
}

export interface ParagraphTimelineItem {
  paragraphIndex: number;
  isDialogue: boolean;
  speakerName?: string;
  spokenText: string;
  startTime: number;
  endTime: number;
  words: WordTimelineItem[];
}

export interface UseStoryAudioSyncOptions {
  content: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

export function cleanWordForSync(raw: string): string {
  return raw.replaceAll(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function calculateWordWeight(
  word: string,
  isLastWordInParagraph: boolean
): number {
  const clean = cleanWordForSync(word);
  const baseLength = Math.max(1, clean.length);

  let pauseWeight = 0;
  if (/[.,!?:;…]$/u.test(word)) {
    pauseWeight += /[.!?…]$/u.test(word) ? 2.2 : 1.2;
  }

  if (isLastWordInParagraph) {
    pauseWeight += 2.5;
  }

  return baseLength + pauseWeight;
}

function getStoredBoolean(key: string, defaultValue = true): boolean {
  if (typeof window === "undefined") {
    return defaultValue;
  }
  try {
    const item = localStorage.getItem(key);
    return item === null ? defaultValue : item === "true";
  } catch {
    return defaultValue;
  }
}

interface ParsedParagraph {
  paragraphIndex: number;
  isDialogue: boolean;
  speakerName?: string;
  spokenText: string;
  rawWords: string[];
  wordWeights: number[];
  totalParaWeight: number;
}

function parseParagraph(para: string, pIdx: number): ParsedParagraph {
  const speakerMatch = para.match(SPEAKER_LINE_REGEX);
  const isDialogue = Boolean(
    speakerMatch?.groups?.speaker && speakerMatch.groups.text
  );
  const speakerName = isDialogue
    ? speakerMatch?.groups?.speaker?.trim()
    : undefined;
  const spokenText = isDialogue
    ? (speakerMatch?.groups?.text?.trim() ?? "")
    : para.trim();

  const rawWords = spokenText.split(/\s+/u).filter((w) => w.trim().length > 0);
  const wordWeights: number[] = [];
  let paraWeight = 0;

  for (let wIdx = 0; wIdx < rawWords.length; wIdx += 1) {
    const isLastWord = wIdx === rawWords.length - 1;
    const w = rawWords[wIdx] ?? "";
    const weight = calculateWordWeight(w, isLastWord);
    wordWeights.push(weight);
    paraWeight += weight;
  }

  return {
    paragraphIndex: pIdx,
    isDialogue,
    speakerName,
    spokenText,
    rawWords,
    wordWeights,
    totalParaWeight: paraWeight,
  };
}

function buildTimeline(
  content: string,
  duration: number
): { paragraphs: ParagraphTimelineItem[]; totalWeight: number } {
  if (!content) {
    return { paragraphs: [], totalWeight: 0 };
  }

  const rawParagraphs = content
    .split("\n\n")
    .filter((p) => p.trim().length > 0);
  const parsed = rawParagraphs.map((p, idx) => parseParagraph(p, idx));
  const storyTotalWeight = parsed.reduce(
    (sum, p) => sum + p.totalParaWeight,
    0
  );

  const safeDuration = duration > 0 ? duration : 60;
  const safeTotalWeight = Math.max(1, storyTotalWeight);

  let cumulativeWeight = 0;
  const paragraphs: ParagraphTimelineItem[] = [];

  for (const p of parsed) {
    const paraStartTime = (cumulativeWeight / safeTotalWeight) * safeDuration;
    const words: WordTimelineItem[] = [];

    for (let wIdx = 0; wIdx < p.rawWords.length; wIdx += 1) {
      const rawWord = p.rawWords[wIdx] ?? "";
      const weight = p.wordWeights[wIdx] ?? 1;

      const wordStartTime = (cumulativeWeight / safeTotalWeight) * safeDuration;
      cumulativeWeight += weight;
      const wordEndTime = (cumulativeWeight / safeTotalWeight) * safeDuration;

      words.push({
        rawWord,
        cleanedWord: cleanWordForSync(rawWord),
        paragraphIndex: p.paragraphIndex,
        wordIndex: wIdx,
        startTime: wordStartTime,
        endTime: wordEndTime,
      });
    }

    const paraEndTime = (cumulativeWeight / safeTotalWeight) * safeDuration;
    paragraphs.push({
      paragraphIndex: p.paragraphIndex,
      isDialogue: p.isDialogue,
      speakerName: p.speakerName,
      spokenText: p.spokenText,
      startTime: paraStartTime,
      endTime: paraEndTime,
      words,
    });
  }

  return { paragraphs, totalWeight: storyTotalWeight };
}

function findActiveWordIndex(
  words: WordTimelineItem[],
  currentTime: number
): number {
  if (words.length === 0) {
    return 0;
  }

  for (let wIdx = 0; wIdx < words.length; wIdx += 1) {
    const w = words[wIdx];
    if (!w) {
      continue;
    }
    const isLastWord = wIdx === words.length - 1;
    const isWithinWord =
      currentTime >= w.startTime &&
      (isLastWord ? currentTime <= w.endTime + 0.3 : currentTime < w.endTime);

    if (isWithinWord) {
      return wIdx;
    }
  }

  const lastWord = words.at(-1);
  return currentTime >= (lastWord?.endTime ?? 0) ? words.length - 1 : 0;
}

function findActiveIndices(
  paragraphs: ParagraphTimelineItem[],
  currentTime: number
): { activeParagraphIndex: number; activeWordIndex: number } {
  if (paragraphs.length === 0) {
    return { activeParagraphIndex: 0, activeWordIndex: 0 };
  }

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx += 1) {
    const p = paragraphs[pIdx];
    if (!p) {
      continue;
    }
    const isLastPara = pIdx === paragraphs.length - 1;
    const isWithinPara =
      currentTime >= p.startTime &&
      (isLastPara ? currentTime <= p.endTime + 0.5 : currentTime < p.endTime);

    if (isWithinPara) {
      return {
        activeParagraphIndex: pIdx,
        activeWordIndex: findActiveWordIndex(p.words, currentTime),
      };
    }
  }

  const lastPara = paragraphs.at(-1);
  const isPastEnd = currentTime >= (lastPara?.endTime ?? 0);
  const targetPIdx = isPastEnd ? paragraphs.length - 1 : 0;
  const targetWords = paragraphs[targetPIdx]?.words ?? [];
  const targetWIdx =
    isPastEnd && targetWords.length > 0 ? targetWords.length - 1 : 0;

  return {
    activeParagraphIndex: targetPIdx,
    activeWordIndex: targetWIdx,
  };
}

export function useStoryAudioSync({
  content,
  currentTime,
  duration,
  isPlaying,
}: UseStoryAudioSyncOptions) {
  const [highlightWords, setHighlightWords] = useState<boolean>(() =>
    getStoredBoolean(STORAGE_KEY_WORD_HIGHLIGHT, true)
  );

  const [highlightStoryItem, setHighlightStoryItem] = useState<boolean>(() =>
    getStoredBoolean(STORAGE_KEY_ITEM_OUTLINE, true)
  );

  const toggleHighlightWords = useCallback((enabled: boolean) => {
    setHighlightWords(enabled);
    try {
      localStorage.setItem(STORAGE_KEY_WORD_HIGHLIGHT, String(enabled));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleHighlightStoryItem = useCallback((enabled: boolean) => {
    setHighlightStoryItem(enabled);
    try {
      localStorage.setItem(STORAGE_KEY_ITEM_OUTLINE, String(enabled));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const storyTimeline = useMemo(
    () => buildTimeline(content, duration),
    [content, duration]
  );

  const { activeParagraphIndex, activeWordIndex } = useMemo(() => {
    if (currentTime <= 0 && !isPlaying) {
      return { activeParagraphIndex: null, activeWordIndex: null };
    }
    return findActiveIndices(storyTimeline.paragraphs, currentTime);
  }, [currentTime, isPlaying, storyTimeline.paragraphs]);

  const getParagraphStartTime = useCallback(
    (paragraphIndex: number): number => {
      const para = storyTimeline.paragraphs[paragraphIndex];
      return para?.startTime ?? 0;
    },
    [storyTimeline]
  );

  const getWordStartTime = useCallback(
    (paragraphIndex: number, wordIndex: number): number => {
      const para = storyTimeline.paragraphs[paragraphIndex];
      const word = para?.words[wordIndex];
      return word?.startTime ?? para?.startTime ?? 0;
    },
    [storyTimeline]
  );

  return {
    storyTimeline: storyTimeline.paragraphs,
    activeParagraphIndex,
    activeWordIndex,
    highlightWords,
    setHighlightWords: toggleHighlightWords,
    highlightStoryItem,
    setHighlightStoryItem: toggleHighlightStoryItem,
    getParagraphStartTime,
    getWordStartTime,
  };
}
