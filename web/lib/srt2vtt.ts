/**
 * SRT → WebVTT conversion for subtitle tracks.
 * Upstream captions are SRT in practice; VTT is passed through unchanged.
 */
import "server-only";

export function isVtt(text: string): boolean {
  return text.trimStart().startsWith("WEBVTT");
}

export function srtToVtt(srt: string): string {
  const normalized = srt.replace(/\r\n?/g, "\n").replace(/^\uFEFF/, "");
  const blocks = normalized.split(/\n{2,}/);
  const out: string[] = ["WEBVTT", ""];
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) continue;
    // Drop the numeric cue identifier if present.
    const cue = /^\d+$/.test(lines[0]) ? lines.slice(1) : lines;
    if (cue.length < 2) continue;
    const timing = cue[0].replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
    if (!timing.includes("-->")) continue;
    out.push(timing);
    out.push(...cue.slice(1));
    out.push("");
  }
  return out.join("\n");
}

/**
 * Convert caption text to WebVTT. Returns null for unsupported formats
 * (ASS/SSA are not converted; callers may 415 instead).
 */
export function toVtt(text: string, urlHint = ""): string | null {
  if (isVtt(text)) return text;
  const lower = urlHint.toLowerCase();
  if (lower.endsWith(".ass") || lower.endsWith(".ssa")) return null;
  if (/\[Script Info\]|\[V4[+]? Styles\]/.test(text.slice(0, 500))) return null;
  return srtToVtt(text);
}
