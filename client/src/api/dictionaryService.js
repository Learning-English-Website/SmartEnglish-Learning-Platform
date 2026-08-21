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
/**
 * Fallback to fetch IPA from Datamuse if dictionary API has no phonetic
 *
 * @param {string} word
 * @returns {Promise<string>} e.g. "/ˈsuːpɝ/"
 */
export async function fetchDatamuseIPA(word) {
  if (!word?.trim()) return '';
  const cleanWord = word.trim().toLowerCase();
  try {
    const resp = await fetch(`${DATAMUSE_URL}?sp=${encodeURIComponent(cleanWord)}&md=r&ipa=1&max=1`);
    if (!resp.ok) return '';
    const data = await resp.json();
    if (!data || !data.length) return '';
    
    const tags = data[0].tags || [];
    const ipaTag = tags.find((t) => t && typeof t === 'string' && t.startsWith('ipa_pron:'));
    if (ipaTag) {
      const rawIpa = ipaTag.replace('ipa_pron:', '').trim();
      if (rawIpa) {
        return `/${rawIpa}/`;
      }
    }
  } catch (err) {
    console.warn('Datamuse IPA lookup error:', err);
  }
  return '';
}

/**
 * Look up a word and return pronunciation + definitions.
 * Robust multi-level extraction across all API entries + Datamuse fallback.
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
  const cleanWord = word.trim().toLowerCase();

  let phonetic = '';
  let audioUrl = '';
  let meanings = [];

  try {
    const resp = await fetch(`${DICT_URL}/${encodeURIComponent(cleanWord)}`);
    if (resp.ok) {
      const data = await resp.json();
      const entries = Array.isArray(data) ? data : [data];
      
      // Search across ALL entries in data array for phonetic & audio
      for (const entry of entries) {
        if (!phonetic) {
          if (entry.phonetic && entry.phonetic.trim()) {
            phonetic = entry.phonetic.trim();
          } else if (entry.phonetics && entry.phonetics.length) {
            const foundText = entry.phonetics.find((p) => p.text && p.text.trim());
            if (foundText) phonetic = foundText.text.trim();
          }
        }

        if (!audioUrl && entry.phonetics && entry.phonetics.length) {
          const foundAudio = entry.phonetics.find((p) => p.audio && p.audio.trim());
          if (foundAudio) {
            const rawAudio = foundAudio.audio.trim();
            audioUrl = rawAudio.startsWith('//') ? `https:${rawAudio}` : rawAudio;
          }
        }

        if (meanings.length === 0 && entry.meanings && entry.meanings.length) {
          meanings = (entry.meanings ?? []).slice(0, 3).map((m) => ({
            partOfSpeech: m.partOfSpeech,
            definitions: (m.definitions ?? []).slice(0, 2).map((d) => ({
              definition: d.definition ?? '',
              example:    d.example ?? '',
            })),
          }));
        }
      }
    }
  } catch (err) {
    console.warn('Free Dictionary API lookup error:', err);
  }

  // Level 2 Fallback: If phonetic is missing, call Datamuse IPA API!
  if (!phonetic) {
    phonetic = await fetchDatamuseIPA(cleanWord);
  }

  // Level 3 Fallback: If compound word (e.g. "super power"), lookup each word's IPA!
  if (!phonetic && cleanWord.includes(' ')) {
    const subWords = cleanWord.split(/\s+/);
    const subPhonetics = await Promise.all(
      subWords.map(async (w) => {
        const ipa = await fetchDatamuseIPA(w);
        return ipa ? ipa.replace(/^\/|\/$/g, '') : w;
      })
    );
    if (subPhonetics.some((p) => p)) {
      phonetic = `/${subPhonetics.join(' ')}/`;
    }
  }

  // Ensure /.../ wrapping if not empty
  if (phonetic && !phonetic.startsWith('/')) {
    phonetic = `/${phonetic}/`;
  }

  return {
    word:     cleanWord,
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

/**
 * Fetch synonyms / related words for a given word using Datamuse.
 * Uses rel_syn (synonyms) + rel_ant (antonyms excluded), ml (means like).
 *
 * @param {string} word
 * @param {number} max
 * @returns {Promise<string>}  comma-separated list, e.g. "quick, fast, rapid"
 */
export async function fetchRelatedWords(word, max = 8) {
  if (!word?.trim()) return '';
  const q = encodeURIComponent(word.trim().toLowerCase());

  try {
    const [synResp, mlResp] = await Promise.all([
      fetch(`${DATAMUSE_URL}?rel_syn=${q}&max=${max}`),
      fetch(`${DATAMUSE_URL}?ml=${q}&max=${max}`),
    ]);

    const syns = synResp.ok ? await synResp.json() : [];
    const mls  = mlResp.ok  ? await mlResp.json()  : [];

    const seen = new Set();
    const words = [];
    for (const item of [...syns, ...mls]) {
      if (!seen.has(item.word)) {
        seen.add(item.word);
        words.push(item.word);
      }
      if (words.length >= max) break;
    }
    return words.join(', ');
  } catch {
    return '';
  }
}

/**
 * Fetch common collocations for a word using Datamuse.
 * Uses rel_jja (adjective for noun) + rel_jjb (noun for adjective) + trg (triggers).
 *
 * @param {string} word
 * @param {number} max
 * @returns {Promise<string>}  comma-separated collocations
 */
export async function fetchCollocations(word, max = 6) {
  if (!word?.trim()) return '';
  const q = encodeURIComponent(word.trim().toLowerCase());

  try {
    const [jjaResp, jjbResp, trgResp] = await Promise.all([
      fetch(`${DATAMUSE_URL}?rel_jja=${q}&max=${max}`),
      fetch(`${DATAMUSE_URL}?rel_jjb=${q}&max=${max}`),
      fetch(`${DATAMUSE_URL}?trg=${q}&max=${max}`),
    ]);

    const jja = jjaResp.ok ? await jjaResp.json() : [];
    const jjb = jjbResp.ok ? await jjbResp.json() : [];
    const trg = trgResp.ok ? await trgResp.json() : [];

    const seen = new Set();
    const words = [];
    for (const item of [...trg, ...jja, ...jjb]) {
      if (!seen.has(item.word)) {
        seen.add(item.word);
        words.push(item.word);
      }
      if (words.length >= max) break;
    }
    return words.join(', ');
  } catch {
    return '';
  }
}

/**
 * Translate English text to Vietnamese using free Google Translate API.
 *
 * @param {string} text
 * @returns {Promise<string>} Translated text or empty string on error
 */
export async function translateEnToVi(text) {
  if (!text?.trim()) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(text.trim())}`;
    const resp = await fetch(url);
    if (!resp.ok) return '';
    const data = await resp.json();
    // Google Translate returns: [[[translatedText, originalText, ...]]]
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return data[0][0][0];
    }
    return '';
  } catch (err) {
    console.error('[Translation API] Error:', err);
    return '';
  }
}

