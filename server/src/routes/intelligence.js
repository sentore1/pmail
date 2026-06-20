import express from 'express';
import userIntelligenceEngine from '../services/userIntelligenceEngine.js';
import { learnFromSentEmails, getLearningProfile } from '../services/emailLearningEngine.js';
import { lookupPublicFigure, calcAge } from '../services/publicFigures.js';
import axios from 'axios';
import { authenticate } from '../middleware/auth.js';

// Complete world dial code map (all UN-recognised + commonly used territories)
const COUNTRY_DIAL = {
  'Afghanistan':'+93','Albania':'+355','Algeria':'+213','Andorra':'+376',
  'Angola':'+244','Antigua and Barbuda':'+1-268','Argentina':'+54',
  'Armenia':'+374','Australia':'+61','Austria':'+43','Azerbaijan':'+994',
  'Bahamas':'+1-242','Bahrain':'+973','Bangladesh':'+880','Barbados':'+1-246',
  'Belarus':'+375','Belgium':'+32','Belize':'+501','Benin':'+229',
  'Bhutan':'+975','Bolivia':'+591','Bosnia and Herzegovina':'+387',
  'Botswana':'+267','Brazil':'+55','Brunei':'+673','Bulgaria':'+359',
  'Burkina Faso':'+226','Burundi':'+257','Cambodia':'+855','Cameroon':'+237',
  'Canada':'+1','Cape Verde':'+238','Central African Republic':'+236',
  'Chad':'+235','Chile':'+56','China':'+86','Colombia':'+57',
  'Comoros':'+269','Congo':'+242','Costa Rica':'+506','Croatia':'+385',
  'Cuba':'+53','Cyprus':'+357','Czech Republic':'+420','Denmark':'+45',
  'Djibouti':'+253','Dominica':'+1-767','Dominican Republic':'+1-809',
  'DR Congo':'+243','Ecuador':'+593','Egypt':'+20','El Salvador':'+503',
  'Equatorial Guinea':'+240','Eritrea':'+291','Estonia':'+372',
  'Eswatini':'+268','Ethiopia':'+251','Fiji':'+679','Finland':'+358',
  'France':'+33','Gabon':'+241','Gambia':'+220','Georgia':'+995',
  'Germany':'+49','Ghana':'+233','Greece':'+30','Grenada':'+1-473',
  'Guatemala':'+502','Guinea':'+224','Guinea-Bissau':'+245','Guyana':'+592',
  'Haiti':'+509','Honduras':'+504','Hungary':'+36','Iceland':'+354',
  'India':'+91','Indonesia':'+62','Iran':'+98','Iraq':'+964',
  'Ireland':'+353','Israel':'+972','Italy':'+39','Ivory Coast':'+225',
  'Jamaica':'+1-876','Japan':'+81','Jordan':'+962','Kazakhstan':'+7',
  'Kenya':'+254','Kiribati':'+686','Kuwait':'+965','Kyrgyzstan':'+996',
  'Laos':'+856','Latvia':'+371','Lebanon':'+961','Lesotho':'+266',
  'Liberia':'+231','Libya':'+218','Liechtenstein':'+423','Lithuania':'+370',
  'Luxembourg':'+352','Madagascar':'+261','Malawi':'+265','Malaysia':'+60',
  'Maldives':'+960','Mali':'+223','Malta':'+356','Marshall Islands':'+692',
  'Mauritania':'+222','Mauritius':'+230','Mexico':'+52',
  'Micronesia':'+691','Moldova':'+373','Monaco':'+377','Mongolia':'+976',
  'Montenegro':'+382','Morocco':'+212','Mozambique':'+258','Myanmar':'+95',
  'Namibia':'+264','Nauru':'+674','Nepal':'+977','Netherlands':'+31',
  'New Zealand':'+64','Nicaragua':'+505','Niger':'+227','Nigeria':'+234',
  'North Korea':'+850','North Macedonia':'+389','Norway':'+47','Oman':'+968',
  'Pakistan':'+92','Palau':'+680','Palestine':'+970','Panama':'+507',
  'Papua New Guinea':'+675','Paraguay':'+595','Peru':'+51',
  'Philippines':'+63','Poland':'+48','Portugal':'+351','Qatar':'+974',
  'Romania':'+40','Russia':'+7','Rwanda':'+250',
  'Saint Kitts and Nevis':'+1-869','Saint Lucia':'+1-758',
  'Saint Vincent and the Grenadines':'+1-784','Samoa':'+685',
  'San Marino':'+378','Saudi Arabia':'+966','Senegal':'+221','Serbia':'+381',
  'Seychelles':'+248','Sierra Leone':'+232','Singapore':'+65',
  'Slovakia':'+421','Slovenia':'+386','Solomon Islands':'+677',
  'Somalia':'+252','South Africa':'+27','South Korea':'+82',
  'South Sudan':'+211','Spain':'+34','Sri Lanka':'+94','Sudan':'+249',
  'Suriname':'+597','Sweden':'+46','Switzerland':'+41','Syria':'+963',
  'Taiwan':'+886','Tajikistan':'+992','Tanzania':'+255','Thailand':'+66',
  'Timor-Leste':'+670','Togo':'+228','Tonga':'+676',
  'Trinidad and Tobago':'+1-868','Tunisia':'+216','Turkey':'+90',
  'Turkmenistan':'+993','Tuvalu':'+688','Uganda':'+256','Ukraine':'+380',
  'United Arab Emirates':'+971','United Kingdom':'+44','United States':'+1',
  'Uruguay':'+598','Uzbekistan':'+998','Vanuatu':'+678','Vatican City':'+39',
  'Venezuela':'+58','Vietnam':'+84','Yemen':'+967','Zambia':'+260',
  'Zimbabwe':'+263',
};

const router = express.Router();

/**
 * GET /api/intelligence/geoip
 * Get country/city from the requester's real IP
 */
router.get('/geoip', async (req, res) => {
  try {
    // Get the real client IP (works behind proxies)
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip;

    // localhost / dev — fall back to a public IP lookup on the server's own IP
    const isLocal = !ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');

    if (isLocal) {
      // Ask ipapi.co for the server's own public IP data (no key needed, 1000 req/day free)
      try {
        const r = await axios.get('https://ipapi.co/json/', { timeout: 5000 });
        return res.json({
          country: r.data.country_name || null,
          city: r.data.city || null,
          timezone: r.data.timezone || null,
          countryCode: r.data.country_code || null,
        });
      } catch {
        return res.json({ country: null, city: null, timezone: null });
      }
    }

    // Real IP — use ip-api.com (free, no key)
    const r = await axios.get(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city,timezone`,
      { timeout: 5000 }
    );

    if (r.data?.status === 'success') {
      return res.json({
        country: r.data.country || null,
        city: r.data.city || null,
        timezone: r.data.timezone || null,
        countryCode: r.data.countryCode || null,
      });
    }

    res.json({ country: null, city: null, timezone: null });
  } catch (error) {
    console.error('GeoIP error:', error.message);
    res.json({ country: null, city: null, timezone: null });
  }
});


// /geoip and /scrape-user-data are called during onboarding (pre-auth) — keep public
// All other analysis endpoints require authentication
router.post('/analyze', authenticate, async (req, res) => {
  try {
    const { name, email, phoneNumber, country } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    // Run quick analysis
    const analysis = await userIntelligenceEngine.analyzeUser({
      name: name || '',
      email: email || '',
      phoneNumber: phoneNumber || '',
      country: country || '',
    }, ipAddress, userAgent);

    res.json({
      success: true,
      analysis: {
        trustScore: analysis.trustScore,
        riskLevel: analysis.riskLevel,
        suggestions: analysis.suggestions,
        flags: analysis.flags,
        enrichedData: {
          phoneFormat: analysis.enrichedData.phone?.suggestedPhone,
          interests: analysis.enrichedData.interests,
          emailValid: analysis.enrichedData.email?.isValid,
          nameValid: analysis.enrichedData.name?.isValid,
        },
      },
    });
  } catch (error) {
    console.error('Intelligence analysis API error:', error);
    res.status(500).json({ error: 'Failed to analyze user data' });
  }
});

/**
 * POST /api/intelligence/validate-name
 * Quick name validation
 */
router.post('/validate-name', authenticate, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.json({ valid: false, suggestions: [] });
    }

    const analysis = await userIntelligenceEngine.analyzeName(name);

    res.json({
      valid: analysis.isValid,
      pattern: analysis.namePattern,
      origin: analysis.estimatedOrigin,
      suggestions: analysis.isValid ? [] : ['Use your full name (First Last)', 'Avoid numbers and special characters'],
    });
  } catch (error) {
    console.error('Name validation error:', error);
    res.status(500).json({ error: 'Failed to validate name' });
  }
});

/**
 * POST /api/intelligence/suggest-phone
 * Phone number formatting suggestions
 */
router.post('/suggest-phone', authenticate, async (req, res) => {
  try {
    const { phoneNumber, country } = req.body;

    if (!phoneNumber) {
      return res.json({ suggestion: null });
    }

    const analysis = await userIntelligenceEngine.analyzePhone(phoneNumber, country);

    res.json({
      valid: analysis.isValid,
      suggestion: analysis.suggestedPhone,
      countryCode: analysis.countryCode,
      matchesCountry: analysis.matchesCountry,
    });
  } catch (error) {
    console.error('Phone suggestion error:', error);
    res.status(500).json({ error: 'Failed to suggest phone format' });
  }
});

/**
 * POST /api/intelligence/scrape-user-data
 * Profile a user from their real IP + browser signals (timezone, language, name).
 * If the name matches a known public figure, use that data directly.
 * Otherwise: IP geolocation is the primary signal, timezone corroborates.
 */
router.post('/scrape-user-data', async (req, res) => {
  try {
    const { name, email, timezone, language } = req.body;

    // ── 1. Public figure check (most accurate possible signal) ───────────────
    const figure = lookupPublicFigure(name || '');
    if (figure) {
      const dialCode = COUNTRY_DIAL[figure.country] || null;
      return res.json({
        success: true,
        data: {
          country:    figure.country,
          city:       null,
          timezone:   null,
          dialCode,
          gender:     figure.gender,
          age:        calcAge(figure.birthYear),
          nameOrigin: 'public_figure',
          interests:  [figure.occupation],
          signals: {
            source:     'public_figure',
            figureName: figure.fullName,
            ipCountry:  null,
            tzCountry:  null,
            isVPN:      false,
          },
        },
      });
    }

    // ── 2. Regular user: IP geo (primary) + timezone (corroboration) ─────────
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.socket?.remoteAddress ||
      req.ip;

    // Run IP geo + name profiling in parallel for speed
    const [ipData, profile] = await Promise.all([
      userIntelligenceEngine.resolveIP(ip),
      userIntelligenceEngine.scrapePublicData(name || '', email || '', timezone || null, language || null),
    ]);

    // Priority: IP geo first (most reliable), then timezone, then language/name
    const country = ipData?.country || profile.country || null;
    const source  = ipData?.country ? 'ip' : (profile.country ? (timezone ? 'timezone' : 'language') : 'name');

    const tzCountry = timezone ? userIntelligenceEngine.timezoneToCountry(timezone) : null;
    if (tzCountry && ipData?.country && tzCountry !== ipData.country) {
      console.log(`[scrape] TZ says ${tzCountry}, IP says ${ipData.country} — trusting IP`);
    }

    const dialCode = country ? (Object.entries(COUNTRY_DIAL).find(([c]) => c === country)?.[1] || null) : null;

    res.json({
      success: true,
      data: {
        country,
        city:       ipData?.city     || null,
        timezone:   ipData?.timezone || timezone || null,
        dialCode,
        gender:     profile.gender   || null,
        age:        null,
        nameOrigin: profile.nameOrigin || null,
        interests:  profile.interests  || [],
        signals: {
          source,
          ipCountry:  ipData?.country  || null,
          tzCountry:  tzCountry        || null,
          ipCity:     ipData?.city     || null,
          isVPN:      ipData?.isVPN    || false,
        },
      },
    });
  } catch (error) {
    console.error('Scrape user data error:', error.message);
    res.status(500).json({ error: 'Failed to profile user data' });
  }
});

export default router;

/**
 * POST /api/intelligence/learn
 * Analyze the user's own Pmail sent emails to build an interest/style profile.
 * No external services needed — reads directly from the DB.
 */
router.post('/learn', authenticate, async (req, res) => {
  try {
    const result = await learnFromSentEmails(req.user.id);
    res.json({
      success: true,
      message: `Analyzed ${result.emailsAnalyzed} sent emails`,
      topics: result.topics,
      style: result.style,
      activityLevel: result.activityLevel,
      networkSize: result.networkSize,
      emailsAnalyzed: result.emailsAnalyzed,
    });
  } catch (error) {
    console.error('Email learning error:', error);
    res.status(500).json({ error: 'Failed to learn from sent emails' });
  }
});

/**
 * GET /api/intelligence/learning-profile
 * Get the current AI learning profile (topics, last synced, etc.)
 */
router.get('/learning-profile', authenticate, async (req, res) => {
  try {
    const profile = await getLearningProfile(req.user.id);
    res.json({ success: true, profile });
  } catch (error) {
    console.error('Get learning profile error:', error);
    res.status(500).json({ error: 'Failed to get learning profile' });
  }
});
