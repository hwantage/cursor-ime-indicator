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
    patterns: [/Korean/i, /Hangul/i],
  },

  // Japanese → "あ"
  {
    label: 'あ',
    patterns: [/Japanese/i, /Kotoeri/i, /Hiragana/i, /Katakana/i],
  },

  // Chinese → "中"
  {
    label: '中',
    patterns: [/Chinese/i, /Pinyin/i, /Wubi/i, /Cangjie/i, /Zhuyin/i, /TCIM/i, /SCIM/i, /Shuangpin/i],
  },

  // Russian → "Ру"
  {
    label: 'Ру',
    patterns: [/Russian/i, /Cyrillic/i],
  },

  // Ukrainian → "Ук"
  {
    label: 'Ук',
    patterns: [/Ukrainian/i],
  },

  // Arabic → "عر"
  {
    label: 'عر',
    patterns: [/Arabic/i],
  },

  // Hebrew → "עב"
  {
    label: 'עב',
    patterns: [/Hebrew/i],
  },

  // Thai → "ไท"
  {
    label: 'ไท',
    patterns: [/Thai/i],
  },

  // Hindi / Devanagari → "हि"
  {
    label: 'हि',
    patterns: [/Hindi/i, /Devanagari/i],
  },

  // Greek → "Ελ"
  {
    label: 'Ελ',
    patterns: [/Greek/i],
  },

  // Georgian → "ქა"
  {
    label: 'ქა',
    patterns: [/Georgian/i],
  },

  // Armenian → "Հայ"
  {
    label: 'Հայ',
    patterns: [/Armenian/i],
  },

  // === Latin-alphabet languages (country/language abbreviation) ===

  // English → "abc" (exception: use "abc" instead of country code)
  {
    label: 'abc',
    patterns: [/\bUS\b/, /\bABC\b/, /\bBritish\b/, /\bAustralian\b/, /\bCanadian\b/, /\bIrish\b/, /USInternational/, /USExtended/, /Dvorak/, /Colemak/],
  },

  // German → "DE"
  {
    label: 'DE',
    patterns: [/German/i],
  },

  // French → "FR"
  {
    label: 'FR',
    patterns: [/French/i, /\bAZERTY\b/i],
  },

  // Spanish → "ES"
  {
    label: 'ES',
    patterns: [/Spanish/i],
  },

  // Italian → "IT"
  {
    label: 'IT',
    patterns: [/Italian/i],
  },

  // Portuguese → "PT"
  {
    label: 'PT',
    patterns: [/Portuguese/i, /Brazilian/i],
  },

  // Vietnamese → "VI"
  {
    label: 'VI',
    patterns: [/Vietnamese/i],
  },

  // Turkish → "TR"
  {
    label: 'TR',
    patterns: [/Turkish/i],
  },

  // Polish → "PL"
  {
    label: 'PL',
    patterns: [/Polish/i],
  },

  // Dutch → "NL"
  {
    label: 'NL',
    patterns: [/Dutch/i],
  },

  // Swedish → "SV"
  {
    label: 'SV',
    patterns: [/Swedish/i],
  },

  // Norwegian → "NO"
  {
    label: 'NO',
    patterns: [/Norwegian/i],
  },

  // Danish → "DA"
  {
    label: 'DA',
    patterns: [/Danish/i],
  },

  // Finnish → "FI"
  {
    label: 'FI',
    patterns: [/Finnish/i],
  },

  // Czech → "CZ"
  {
    label: 'CZ',
    patterns: [/Czech/i],
  },

  // Hungarian → "HU"
  {
    label: 'HU',
    patterns: [/Hungarian/i],
  },

  // Romanian → "RO"
  {
    label: 'RO',
    patterns: [/Romanian/i],
  },

  // Indonesian → "ID"
  {
    label: 'ID',
    patterns: [/Indonesian/i],
  },

  // Malay → "MY"
  {
    label: 'MY',
    patterns: [/Malay/i],
  },
];

/**
 * Try to extract a reasonable label from an unknown input source ID.
 * e.g., "com.apple.keylayout.German" → "German" → match against rules
 * e.g., "com.apple.keylayout.Swiss" → "Swiss" → return "SW"
 */
function extractFallbackLabel(inputSourceId: string): string {
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
