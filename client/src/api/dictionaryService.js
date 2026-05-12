/**
 * dictionaryService — Free Dictionary API + Datamuse word search
 * - lookupWord: exact definition, IPA, audio (Free Dictionary API)
 * - searchWords: keyword-based word suggestions (Datamuse API)
 * No API key required for either.
 */

const DICT_URL    = 'https://api.dictionaryapi.dev/api/v2/entries/en';
const DATAMUSE_URL = 'https://api.datamuse.com/words';

/**
 * Look up a word and return pronunciation + definitions.
 *
 * @param {string} word
 * @returns {Promise<{
 *   word: string,
 *   phonetic: string,       // IPA e.g. "/həˈloʊ/"
 *   audio: string,          // URL to pronunciation mp3
 *   meanings: Array<{
 *     partOfSpeech: string,
 *     definitions: Array<{ definition: string, example?: string }>
 *   }>
 * }>}
 */
export async function lookupWord(word) {
  if (!word?.trim()) throw new Error('Word is required');

  const resp = await fetch(`${DICT_URL}/${encodeURIComponent(word.trim().toLowerCase())}`);

  if (resp.status === 404) throw new Error('Word not found in dictionary');
  if (!resp.ok)            throw new Error(`API error: ${resp.status}`);

  const data = await resp.json();
  const entry = Array.isArray(data) ? data[0] : data;

  if (!entry) throw new Error('No entry found');

  // Extract best phonetic + audio
  const phonetics = (entry.phonetics ?? []).filter((p) => p.text || p.audio);
  const phonetic  = phonetics.find((p) => p.text)?.text ?? entry.phonetic ?? '';
  const audio     = phonetics.find((p) => p.audio && p.audio.startsWith('http'))?.audio
                  ?? phonetics.find((p) => p.audio)?.audio
                  ?? '';

  // Absolute URL for audio
  const audioUrl = audio.startsWith('//') ? `https:${audio}` : audio;

  // Extract top meanings
  const meanings = (entry.meanings ?? []).slice(0, 3).map((m) => ({
    partOfSpeech: m.partOfSpeech,
    definitions: (m.definitions ?? []).slice(0, 2).map((d) => ({
      definition: d.definition ?? '',
      example:    d.example ?? '',
    })),
  }));

  return {
    word:     entry.word ?? word,
    phonetic,
    audio:    audioUrl,
    meanings,
  };
}

/**
 * Search for words matching a keyword using Datamuse API.
 * Supports prefix search (go*), substring (*go*), and spelling suggestions.
 *
 * @param {string} query  — e.g. "go"
 * @param {number} max    — max results (default 10)
 * @returns {Promise<Array<{ word: string, score: number, tags?: string[] }>>}
 *
 * @example
 *   searchWords('go')   // go, going, gone, goal, goat, golden...
 *   searchWords('tion') // nation, station, action...
 */
export async function searchWords(query, max = 10) {
  if (!query?.trim()) return [];

  const q   = query.trim().toLowerCase();
  const params = new URLSearchParams({
    sp:  `${q}*`,   // words starting with query
    max: String(max),
    md:  'f',       // include frequency metadata
  });

  const resp = await fetch(`${DATAMUSE_URL}?${params}`);
  if (!resp.ok) return [];

  const data = await resp.json();

  // Also search for words CONTAINING the query if we got few results
  if (data.length < 4 && q.length >= 3) {
    const params2 = new URLSearchParams({
      sp:  `*${q}*`,
      max: String(max - data.length),
      md:  'f',
    });
    const resp2 = await fetch(`${DATAMUSE_URL}?${params2}`);
    if (resp2.ok) {
      const extra = await resp2.json();
      // Merge without duplicates
      const seen = new Set(data.map((w) => w.word));
      for (const item of extra) {
        if (!seen.has(item.word)) data.push(item);
      }
    }
  }

  return data.slice(0, max).map((item) => ({
    word:  item.word,
    score: item.score ?? 0,
    tags:  item.tags ?? [],
  }));
}
