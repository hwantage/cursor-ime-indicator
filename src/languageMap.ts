interface LanguageRule {
  label: string;
  patterns: RegExp[];
}

// Order matters: first match wins
const languageRules: LanguageRule[] = [
  // === CJK & Non-Latin scripts (representative characters) ===

  // Korean → "한"
  {
    label: '한',
    patterns: [/Korean/i, /Hangul/i, /^ko[-_]/i, /^ko$/i],
  },

  // Japanese → "あ"
  {
    label: 'あ',
    patterns: [/Japanese/i, /Kotoeri/i, /Hiragana/i, /Katakana/i, /^ja[-_]/i, /^ja$/i],
  },

  // Chinese → "中"
  {
    label: '中',
    patterns: [/Chinese/i, /Pinyin/i, /Wubi/i, /Cangjie/i, /Zhuyin/i, /TCIM/i, /SCIM/i, /Shuangpin/i, /^zh[-_]/i, /^zh$/i],
  },

  // Russian → "Ру"
  {
    label: 'Ру',
    patterns: [/Russian/i, /Cyrillic/i, /^ru[-_]/i, /^ru$/i],
  },

  // Ukrainian → "Ук"
  {
    label: 'Ук',
    patterns: [/Ukrainian/i, /^uk[-_]/i, /^uk$/i],
  },

  // Arabic → "عر"
  {
    label: 'عر',
    patterns: [/Arabic/i, /^ar[-_]/i, /^ar$/i],
  },

  // Hebrew → "עב"
  {
    label: 'עב',
    patterns: [/Hebrew/i, /^he[-_]/i, /^he$/i],
  },

  // Thai → "ไท"
  {
    label: 'ไท',
    patterns: [/Thai/i, /^th[-_]/i, /^th$/i],
  },

  // Hindi / Devanagari → "हि"
  {
    label: 'हि',
    patterns: [/Hindi/i, /Devanagari/i, /^hi[-_]/i, /^hi$/i],
  },

  // Greek → "Ελ"
  {
    label: 'Ελ',
    patterns: [/Greek/i, /^el[-_]/i, /^el$/i],
  },

  // Georgian → "ქა"
  {
    label: 'ქა',
    patterns: [/Georgian/i, /^ka[-_]/i, /^ka$/i],
  },

  // Armenian → "Հայ"
  {
    label: 'Հայ',
    patterns: [/Armenian/i, /^hy[-_]/i, /^hy$/i],
  },

  // === Latin-alphabet languages (country/language abbreviation) ===

  // English → "abc" (exception: use "abc" instead of country code)
  {
    label: 'abc',
    patterns: [/\bUS\b/, /\bABC\b/, /\bBritish\b/, /\bAustralian\b/, /\bCanadian\b/, /\bIrish\b/, /USInternational/, /USExtended/, /Dvorak/, /Colemak/, /^en[-_]/i, /^en$/i],
  },

  // German → "DE"
  {
    label: 'DE',
    patterns: [/German/i, /^de[-_]/i, /^de$/i],
  },

  // French → "FR"
  {
    label: 'FR',
    patterns: [/French/i, /\bAZERTY\b/i, /^fr[-_]/i, /^fr$/i],
  },

  // Spanish → "ES"
  {
    label: 'ES',
    patterns: [/Spanish/i, /^es[-_]/i, /^es$/i],
  },

  // Italian → "IT"
  {
    label: 'IT',
    patterns: [/Italian/i, /^it[-_]/i, /^it$/i],
  },

  // Portuguese → "PT"
  {
    label: 'PT',
    patterns: [/Portuguese/i, /Brazilian/i, /^pt[-_]/i, /^pt$/i],
  },

  // Vietnamese → "VI"
  {
    label: 'VI',
    patterns: [/Vietnamese/i, /^vi[-_]/i, /^vi$/i],
  },

  // Turkish → "TR"
  {
    label: 'TR',
    patterns: [/Turkish/i, /^tr[-_]/i, /^tr$/i],
  },

  // Polish → "PL"
  {
    label: 'PL',
    patterns: [/Polish/i, /^pl[-_]/i, /^pl$/i],
  },

  // Dutch → "NL"
  {
    label: 'NL',
    patterns: [/Dutch/i, /^nl[-_]/i, /^nl$/i],
  },

  // Swedish → "SV"
  {
    label: 'SV',
    patterns: [/Swedish/i, /^sv[-_]/i, /^sv$/i],
  },

  // Norwegian → "NO"
  {
    label: 'NO',
    patterns: [/Norwegian/i, /^no[-_]/i, /^no$/i, /^nb[-_]/i, /^nb$/i, /^nn[-_]/i, /^nn$/i],
  },

  // Danish → "DA"
  {
    label: 'DA',
    patterns: [/Danish/i, /^da[-_]/i, /^da$/i],
  },

  // Finnish → "FI"
  {
    label: 'FI',
    patterns: [/Finnish/i, /^fi[-_]/i, /^fi$/i],
  },

  // Czech → "CZ"
  {
    label: 'CZ',
    patterns: [/Czech/i, /^cs[-_]/i, /^cs$/i],
  },

  // Hungarian → "HU"
  {
    label: 'HU',
    patterns: [/Hungarian/i, /^hu[-_]/i, /^hu$/i],
  },

  // Romanian → "RO"
  {
    label: 'RO',
    patterns: [/Romanian/i, /^ro[-_]/i, /^ro$/i],
  },

  // Indonesian → "ID"
  {
    label: 'ID',
    patterns: [/Indonesian/i, /^id[-_]/i, /^id$/i],
  },

  // Malay → "MY"
  {
    label: 'MY',
    patterns: [/Malay/i, /^ms[-_]/i, /^ms$/i],
  },
];

/**
 * Try to extract a reasonable label from an unknown input source ID.
 * e.g., "com.apple.keylayout.German" → "German" → match against rules
 * e.g., "com.apple.keylayout.Swiss" → "Swiss" → return "SW"
 * e.g., "ko-KR" → "ko" → match Korean rule
 */
function extractFallbackLabel(inputSourceId: string): string {
  // Handle Windows locale format: "ko-KR", "en-US", "ja-JP"
  if (/^[a-z]{2,3}[-_][A-Z]{2,3}$/.test(inputSourceId)) {
    const langCode = inputSourceId.split(/[-_]/)[0];
    for (const rule of languageRules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(langCode)) {
          return rule.label;
        }
      }
    }
    return langCode.toUpperCase();
  }

  // Extract the last segment: "com.apple.keylayout.German" → "German"
  const segments = inputSourceId.split('.');
  const lastSegment = segments[segments.length - 1];

  if (!lastSegment || lastSegment === 'unknown') {
    return '??';
  }

  // Try matching the last segment against rules
  for (const rule of languageRules) {
    for (const pattern of rule.patterns) {
      if (pattern.test(lastSegment)) {
        return rule.label;
      }
    }
  }

  // Return first 2 characters uppercased as fallback
  return lastSegment.substring(0, 2).toUpperCase();
}

export function getLanguageLabel(inputSourceId: string): string {
  for (const rule of languageRules) {
    for (const pattern of rule.patterns) {
      if (pattern.test(inputSourceId)) {
        return rule.label;
      }
    }
  }

  return extractFallbackLabel(inputSourceId);
}
