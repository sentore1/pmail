/**
 * Public Figure Database
 * Known public figures with verifiable public information only.
 * Sources: Wikipedia, official bios, public records.
 * NO private data (phone numbers, private addresses, etc.)
 *
 * Fields:
 *   names     - all known name variations / spellings (lowercase for matching)
 *   fullName  - canonical display name
 *   country   - current country of residence
 *   birthYear - for age calculation
 *   gender    - male | female
 *   occupation - brief description
 */

import axios from 'axios';

const PUBLIC_FIGURES = [
  // ── Tech / VC ──────────────────────────────────────────────────────────────
  {
    names: ['chamath palihapitiya', 'chamath', 'palihapitiya'],
    fullName: 'Chamath Palihapitiya',
    country: 'United States',
    birthYear: 1976,
    gender: 'male',
    occupation: 'Venture Capitalist, CEO of Social Capital',
  },
  {
    names: ['elon musk', 'elon'],
    fullName: 'Elon Musk',
    country: 'United States',
    birthYear: 1971,
    gender: 'male',
    occupation: 'CEO of Tesla, SpaceX, X',
  },
  {
    names: ['mark zuckerberg', 'zuckerberg'],
    fullName: 'Mark Zuckerberg',
    country: 'United States',
    birthYear: 1984,
    gender: 'male',
    occupation: 'CEO of Meta',
  },
  {
    names: ['jeff bezos', 'bezos'],
    fullName: 'Jeff Bezos',
    country: 'United States',
    birthYear: 1964,
    gender: 'male',
    occupation: 'Founder of Amazon',
  },
  {
    names: ['bill gates', 'gates'],
    fullName: 'Bill Gates',
    country: 'United States',
    birthYear: 1955,
    gender: 'male',
    occupation: 'Co-founder of Microsoft',
  },
  {
    names: ['sundar pichai', 'pichai'],
    fullName: 'Sundar Pichai',
    country: 'United States',
    birthYear: 1972,
    gender: 'male',
    occupation: 'CEO of Google / Alphabet',
  },
  {
    names: ['satya nadella', 'nadella'],
    fullName: 'Satya Nadella',
    country: 'United States',
    birthYear: 1967,
    gender: 'male',
    occupation: 'CEO of Microsoft',
  },
  {
    names: ['sam altman', 'altman'],
    fullName: 'Sam Altman',
    country: 'United States',
    birthYear: 1985,
    gender: 'male',
    occupation: 'CEO of OpenAI',
  },
  {
    names: ['jensen huang', 'jensen'],
    fullName: 'Jensen Huang',
    country: 'United States',
    birthYear: 1963,
    gender: 'male',
    occupation: 'CEO of NVIDIA',
  },
  {
    names: ['tim cook', 'cook'],
    fullName: 'Tim Cook',
    country: 'United States',
    birthYear: 1960,
    gender: 'male',
    occupation: 'CEO of Apple',
  },
  {
    names: ['peter thiel', 'thiel'],
    fullName: 'Peter Thiel',
    country: 'United States',
    birthYear: 1967,
    gender: 'male',
    occupation: 'Co-founder of PayPal, Palantir',
  },
  {
    names: ['marc andreessen', 'andreessen'],
    fullName: 'Marc Andreessen',
    country: 'United States',
    birthYear: 1971,
    gender: 'male',
    occupation: 'Co-founder of Andreessen Horowitz',
  },
  {
    names: ['david sacks', 'sacks'],
    fullName: 'David Sacks',
    country: 'United States',
    birthYear: 1972,
    gender: 'male',
    occupation: 'Entrepreneur, Investor, All-In Podcast',
  },
  {
    names: ['jason calacanis', 'calacanis'],
    fullName: 'Jason Calacanis',
    country: 'United States',
    birthYear: 1970,
    gender: 'male',
    occupation: 'Angel Investor, All-In Podcast',
  },
  {
    names: ['david friedberg', 'friedberg'],
    fullName: 'David Friedberg',
    country: 'United States',
    birthYear: 1980,
    gender: 'male',
    occupation: 'CEO of The Production Board, All-In Podcast',
  },
  {
    names: ['naval ravikant', 'naval'],
    fullName: 'Naval Ravikant',
    country: 'United States',
    birthYear: 1974,
    gender: 'male',
    occupation: 'Co-founder of AngelList',
  },
  {
    names: ['reid hoffman', 'hoffman'],
    fullName: 'Reid Hoffman',
    country: 'United States',
    birthYear: 1967,
    gender: 'male',
    occupation: 'Co-founder of LinkedIn',
  },
  {
    names: ['jack dorsey', 'dorsey'],
    fullName: 'Jack Dorsey',
    country: 'United States',
    birthYear: 1976,
    gender: 'male',
    occupation: 'Co-founder of Twitter/X, Block',
  },
  {
    names: ['brian armstrong', 'armstrong'],
    fullName: 'Brian Armstrong',
    country: 'United States',
    birthYear: 1983,
    gender: 'male',
    occupation: 'CEO of Coinbase',
  },
  {
    names: ['vitalik buterin', 'vitalik', 'buterin'],
    fullName: 'Vitalik Buterin',
    country: 'Canada',
    birthYear: 1994,
    gender: 'male',
    occupation: 'Co-founder of Ethereum',
  },
  // ── Business / Finance ─────────────────────────────────────────────────────
  {
    names: ['warren buffett', 'buffett'],
    fullName: 'Warren Buffett',
    country: 'United States',
    birthYear: 1930,
    gender: 'male',
    occupation: 'CEO of Berkshire Hathaway',
  },
  {
    names: ['oprah winfrey', 'oprah'],
    fullName: 'Oprah Winfrey',
    country: 'United States',
    birthYear: 1954,
    gender: 'female',
    occupation: 'Media Executive, Philanthropist',
  },
  // ── Politics ───────────────────────────────────────────────────────────────
  {
    names: ['donald trump', 'trump'],
    fullName: 'Donald Trump',
    country: 'United States',
    birthYear: 1946,
    gender: 'male',
    occupation: 'President of the United States',
  },
  {
    names: ['joe biden', 'biden'],
    fullName: 'Joe Biden',
    country: 'United States',
    birthYear: 1942,
    gender: 'male',
    occupation: 'Former President of the United States',
  },
  {
    names: ['rishi sunak', 'sunak'],
    fullName: 'Rishi Sunak',
    country: 'United Kingdom',
    birthYear: 1980,
    gender: 'male',
    occupation: 'Former Prime Minister of the United Kingdom',
  },
  {
    names: ['keir starmer', 'starmer'],
    fullName: 'Keir Starmer',
    country: 'United Kingdom',
    birthYear: 1962,
    gender: 'male',
    occupation: 'Prime Minister of the United Kingdom',
  },
  {
    names: ['emmanuel macron', 'macron'],
    fullName: 'Emmanuel Macron',
    country: 'France',
    birthYear: 1977,
    gender: 'male',
    occupation: 'President of France',
  },
  {
    names: ['narendra modi', 'modi'],
    fullName: 'Narendra Modi',
    country: 'India',
    birthYear: 1950,
    gender: 'male',
    occupation: 'Prime Minister of India',
  },
  // ── Entertainment / Sports ─────────────────────────────────────────────────
  {
    names: ['cristiano ronaldo', 'ronaldo', 'cristiano'],
    fullName: 'Cristiano Ronaldo',
    country: 'Portugal',
    birthYear: 1985,
    gender: 'male',
    occupation: 'Professional Footballer',
  },
  {
    names: ['lionel messi', 'messi'],
    fullName: 'Lionel Messi',
    country: 'Argentina',
    birthYear: 1987,
    gender: 'male',
    occupation: 'Professional Footballer',
  },
  {
    names: ['lebron james', 'lebron'],
    fullName: 'LeBron James',
    country: 'United States',
    birthYear: 1984,
    gender: 'male',
    occupation: 'NBA Player',
  },
  {
    names: ['taylor swift', 'taylor'],
    fullName: 'Taylor Swift',
    country: 'United States',
    birthYear: 1989,
    gender: 'female',
    occupation: 'Singer-Songwriter',
  },
  {
    names: ['beyonce knowles', 'beyonce', 'beyoncé'],
    fullName: 'Beyoncé',
    country: 'United States',
    birthYear: 1981,
    gender: 'female',
    occupation: 'Singer, Entertainer',
  },
  {
    names: ['rihanna fenty', 'rihanna'],
    fullName: 'Rihanna',
    country: 'United States',
    birthYear: 1988,
    gender: 'female',
    occupation: 'Singer, Entrepreneur',
  },
];

/**
 * Look up a public figure by full name (fuzzy, case-insensitive).
 * Returns the figure data or null if not found.
 */
export function lookupPublicFigure(name) {
  if (!name || name.trim().length < 4) return null;
  const query = name.trim().toLowerCase();

  // Exact or substring match against all name variants
  for (const figure of PUBLIC_FIGURES) {
    for (const variant of figure.names) {
      if (query === variant || query.includes(variant) || variant.includes(query)) {
        return figure;
      }
    }
  }
  return null;
}

/**
 * Query Wikipedia API for a person and extract biographical data.
 * Uses Wikipedia's REST API and Wikidata for structured info.
 */
export async function queryWikipedia(name) {
  if (!name || name.trim().length < 4) return null;
  
  try {
    const searchName = name.trim();
    
    // Step 1: Search Wikipedia for the person
    const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchName)}`;
    const searchRes = await axios.get(searchUrl, { 
      timeout: 5000,
      headers: { 'User-Agent': 'Pmail/1.0 (Educational Project)' }
    });
    
    if (searchRes.status !== 200) return null;
    const data = searchRes.data;
    
    // Only proceed if it's a person (biography)
    if (data.type !== 'standard' || !data.extract) return null;
    
    const extract = data.extract.toLowerCase();
    
    // Check if it's actually about a person
    const personIndicators = [
      'born', 'birth', 'is a', 'was a', 'politician', 'actor', 'actress',
      'singer', 'musician', 'athlete', 'player', 'scientist', 'author',
      'writer', 'entrepreneur', 'businessman', 'ceo', 'founder', 'president',
      'minister', 'director', 'artist', 'rapper', 'producer'
    ];
    
    if (!personIndicators.some(ind => extract.includes(ind))) return null;
    
    // Extract biographical info from the text
    const result = {
      fullName: data.title || searchName,
      country: null,
      birthYear: null,
      gender: null,
      occupation: null,
      source: 'wikipedia'
    };
    
    // Extract birth year (various formats)
    const birthYearMatch = extract.match(/\bborn[^\d]*(\d{4})\b/) || 
                          extract.match(/\b(\d{4})[–-]\d{4}\b/) ||
                          extract.match(/\(born[^\d]*(\d{4})\)/);
    if (birthYearMatch) {
      const year = parseInt(birthYearMatch[1]);
      if (year >= 1900 && year <= new Date().getFullYear()) {
        result.birthYear = year;
      }
    }
    
    // Extract gender from pronouns in first 500 chars
    const firstPart = extract.substring(0, 500);
    if (/\b(he|his|him)\b/.test(firstPart) && !/\b(she|her|hers)\b/.test(firstPart)) {
      result.gender = 'male';
    } else if (/\b(she|her|hers)\b/.test(firstPart) && !/\b(he|his|him)\b/.test(firstPart)) {
      result.gender = 'female';
    }
    
    // Extract occupation (first sentence usually contains "is a ..." or "was a ...")
    const occupationMatch = extract.match(/(?:is|was)\s+(?:an?\s+)?([^.]{10,80}?)(?:\.|born|who)/i);
    if (occupationMatch) {
      result.occupation = occupationMatch[1].trim()
        .replace(/\s+/g, ' ')
        .substring(0, 100); // limit length
    }
    
    // Try to extract country from common patterns
    const countryPatterns = [
      /\b(american|united states)\b/i,
      /\b(british|united kingdom)\b/i,
      /\b(canadian)\b/i,
      /\b(australian)\b/i,
      /\b(french)\b/i,
      /\b(german)\b/i,
      /\b(italian)\b/i,
      /\b(spanish)\b/i,
      /\b(indian)\b/i,
      /\b(chinese)\b/i,
      /\b(japanese)\b/i,
      /\b(south korean)\b/i,
      /\b(brazilian)\b/i,
      /\b(mexican)\b/i,
      /\b(argentinian|argentine)\b/i,
      /\b(nigerian)\b/i,
      /\b(south african)\b/i,
      /\b(russian)\b/i,
      /\b(rwandan)\b/i,
      /\b(kenyan)\b/i,
      /\b(ghanaian)\b/i,
      /\b(egyptian)\b/i,
    ];
    
    const countryMap = {
      'american': 'United States',
      'united states': 'United States',
      'british': 'United Kingdom',
      'united kingdom': 'United Kingdom',
      'canadian': 'Canada',
      'australian': 'Australia',
      'french': 'France',
      'german': 'Germany',
      'italian': 'Italy',
      'spanish': 'Spain',
      'indian': 'India',
      'chinese': 'China',
      'japanese': 'Japan',
      'south korean': 'South Korea',
      'brazilian': 'Brazil',
      'mexican': 'Mexico',
      'argentinian': 'Argentina',
      'argentine': 'Argentina',
      'nigerian': 'Nigeria',
      'south african': 'South Africa',
      'russian': 'Russia',
      'rwandan': 'Rwanda',
      'kenyan': 'Kenya',
      'ghanaian': 'Ghana',
      'egyptian': 'Egypt',
    };
    
    for (const pattern of countryPatterns) {
      const match = firstPart.match(pattern);
      if (match) {
        const key = match[1].toLowerCase();
        result.country = countryMap[key];
        break;
      }
    }
    
    // Only return if we extracted meaningful data
    if (result.birthYear || result.gender || result.occupation) {
      console.log('[wikipedia] Found:', result);
      return result;
    }
    
    return null;
  } catch (error) {
    console.error('[wikipedia] Query error:', error.message);
    return null;
  }
}

/**
 * Calculate age from birth year.
 */
export function calcAge(birthYear) {
  if (!birthYear) return null;
  return new Date().getFullYear() - birthYear;
}
