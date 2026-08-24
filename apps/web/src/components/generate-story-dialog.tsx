import { Button } from "@linguamaxima/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@linguamaxima/ui/components/dialog";
import { Input } from "@linguamaxima/ui/components/input";
import { Label } from "@linguamaxima/ui/components/label";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { useGenerateStory } from "../lib/queries";
import type { CEFRLevel } from "../types/api";

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const CATEGORIES = [
  { label: "Travel / Reisen", slug: "travel" },
  { label: "Food / Essen", slug: "food" },
  { label: "Culture / Kultur", slug: "culture" },
  { label: "Daily Life / Alltag", slug: "daily-life" },
  { label: "Technology / Technik", slug: "technology" },
  { label: "Science / Wissenschaft", slug: "science" },
  { label: "Entertainment / Unterhaltung", slug: "entertainment" },
  { label: "News / Nachrichten", slug: "news" },
  { label: "History / Geschichte", slug: "history" },
  { label: "Nature / Natur", slug: "nature" },
];

export function GenerateStoryDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<CEFRLevel>("A1");
  const [category, setCategory] = useState("travel");
  const [topicHint, setTopicHint] = useState("");

  const generateMutation = useGenerateStory();

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await generateMutation.mutateAsync({
        category_slug: category,
        cefr_level: level,
        origin_language_code: "id",
        target_language_code: "de",
        topic_hint: topicHint.trim() || undefined,
      });
      setOpen(false);
      setTopicHint("");
    } catch {
      // Error toast is handled by mutation onError
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button className="gap-2 bg-sky-500 hover:bg-sky-600 text-white shadow-sm">
              <Sparkles className="size-4" />
              <span>Generate Story</span>
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md bg-neutral-900 text-neutral-100 border-neutral-800">
        <form onSubmit={handleGenerate}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-sky-400" />
              Generate AI Story
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              Generate a CEFR-graded German story with Indonesian translations,
              vocabulary, grammar tips, and comprehension quizzes in seconds.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-neutral-400">
                CEFR Proficiency Level
              </Label>
              <div className="grid grid-cols-6 gap-1.5">
                {CEFR_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevel(lvl)}
                    className={`py-2 text-xs font-semibold rounded-md transition-colors border ${
                      level === lvl
                        ? "bg-sky-500 border-sky-400 text-white"
                        : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-neutral-400">
                Category
              </Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-neutral-400">
                Topic or Keyword (Optional)
              </Label>
              <Input
                placeholder="e.g. Lost in the train station, Ordering Schnitzel..."
                value={topicHint}
                onChange={(e) => setTopicHint(e.target.value)}
                className="bg-neutral-800 border-neutral-700 text-sm text-neutral-100 placeholder:text-neutral-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={generateMutation.isPending}
              className="bg-sky-500 hover:bg-sky-600 text-white gap-2"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating Story...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
