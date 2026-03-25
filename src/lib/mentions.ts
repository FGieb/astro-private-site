export type SiteAuthor = "LM" | "BM";
export type SiteMention = "LM" | "BM" | null;

const TAG_MAP: Record<string, SiteAuthor> = {
  "@LM": "LM",
  "@BM": "BM",
};

export function extractMention(text: string): SiteMention {
  if (!text) return null;

  const match = text.match(/(^|\s)(@LM|@BM)\b/);
  if (!match) return null;

  return TAG_MAP[match[2]] ?? null;
}

export function shouldNotifyMention(params: {
  text: string;
  author: SiteAuthor;
}) {
  const mention = extractMention(params.text);

  if (!mention) {
    return { notify: false, mention: null };
  }

  if (mention === params.author) {
    return { notify: false, mention };
  }

  return { notify: true, mention };
}
