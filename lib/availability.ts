interface PlatformDef {
  key: string;
  label: string;
  odesliKey: string | null;
  searchUrl: (q: string) => string;
}

// Platforms shown to the user. odesliKey null = no reliable third-party
// catalog API exists for this platform, so we never claim FOUND/NOT_FOUND —
// only offer a manual search link.
const PLATFORMS: PlatformDef[] = [
  { key: "spotify", label: "Spotify", odesliKey: "spotify", searchUrl: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}` },
  { key: "appleMusic", label: "Apple Music", odesliKey: "appleMusic", searchUrl: (q) => `https://music.apple.com/us/search?term=${encodeURIComponent(q)}` },
  { key: "deezer", label: "Deezer", odesliKey: "deezer", searchUrl: (q) => `https://www.deezer.com/search/${encodeURIComponent(q)}` },
  { key: "amazonMusic", label: "Amazon Music", odesliKey: "amazonMusic", searchUrl: (q) => `https://music.amazon.com/search/${encodeURIComponent(q)}` },
  { key: "youtubeMusic", label: "YouTube Music", odesliKey: "youtubeMusic", searchUrl: (q) => `https://music.youtube.com/search?q=${encodeURIComponent(q)}` },
  { key: "tidal", label: "Tidal", odesliKey: "tidal", searchUrl: (q) => `https://listen.tidal.com/search?q=${encodeURIComponent(q)}` },
  { key: "soundcloud", label: "SoundCloud", odesliKey: "soundcloud", searchUrl: (q) => `https://soundcloud.com/search?q=${encodeURIComponent(q)}` },
  { key: "pandora", label: "Pandora", odesliKey: "pandora", searchUrl: (q) => `https://www.pandora.com/search/${encodeURIComponent(q)}` },
];

export type AvailabilityStatus = "found" | "not_found" | "check_store";

export interface PlatformResult {
  key: string;
  label: string;
  status: AvailabilityStatus;
  openUrl?: string;
  searchUrl: string;
}

export interface AvailabilityResult {
  matchedTitle?: string;
  matchedArtist?: string;
  anchorPlatform?: string;
  isrc?: string;
  platforms: PlatformResult[];
}

interface DeezerTrack {
  id: number;
  title: string;
  link: string;
  isrc: string;
  artist: { name: string };
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

async function findDeezerTrack(input: { title: string; artist: string; isrc?: string }): Promise<DeezerTrack | null> {
  if (input.isrc) {
    const byIsrc = await fetchJson(`https://api.deezer.com/track/isrc:${encodeURIComponent(input.isrc)}`);
    if (byIsrc && !byIsrc.error && byIsrc.id) return byIsrc;
  }

  const q = `artist:"${input.artist}" track:"${input.title}"`;
  const search = await fetchJson(`https://api.deezer.com/search?q=${encodeURIComponent(q)}`);
  const first = search?.data?.[0];
  return first ?? null;
}

export async function checkAvailability(input: { title: string; artist: string; isrc?: string }): Promise<AvailabilityResult> {
  const query = `${input.artist} ${input.title}`;
  const deezerTrack = await findDeezerTrack(input);

  let linksByPlatform: Record<string, { url: string }> | null = null;
  let matchedTitle: string | undefined;
  let matchedArtist: string | undefined;

  if (deezerTrack) {
    matchedTitle = deezerTrack.title;
    matchedArtist = deezerTrack.artist?.name;
    const odesli = await fetchJson(`https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(deezerTrack.link)}`);
    linksByPlatform = odesli?.linksByPlatform ?? null;
  }

  const platforms: PlatformResult[] = PLATFORMS.map((p) => {
    const searchUrl = p.searchUrl(query);
    const odesliMatch = p.odesliKey ? linksByPlatform?.[p.odesliKey] : undefined;

    if (odesliMatch?.url) {
      return { key: p.key, label: p.label, status: "found", openUrl: odesliMatch.url, searchUrl };
    }

    // We only have reliable third-party catalog coverage for platforms Odesli
    // indexes. If we got a confirmed anchor track but this platform key is
    // absent from its results, we can say "not found" with reasonable
    // confidence — but always also provide the manual search link so a human
    // can double-check, since Odesli's index can be incomplete.
    if (deezerTrack && p.odesliKey) {
      return { key: p.key, label: p.label, status: "not_found", searchUrl };
    }

    return { key: p.key, label: p.label, status: "check_store", searchUrl };
  });

  return {
    matchedTitle,
    matchedArtist,
    anchorPlatform: deezerTrack ? "deezer" : undefined,
    isrc: deezerTrack?.isrc,
    platforms,
  };
}
