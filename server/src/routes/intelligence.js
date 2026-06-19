import express from 'express';
import userIntelligenceEngine from '../services/userIntelligenceEngine.js';
import { learnFromSentEmails, getLearningProfile } from '../services/emailLearningEngine.js';
import axios from 'axios';
import { authenticate } from '../middleware/auth.js';

// Re-use dial map inline (small, no circular dep needed)
const COUNTRY_DIAL = {
  'United States':'+1','Canada':'+1','United Kingdom':'+44','Australia':'+61',
  'New Zealand':'+64','Germany':'+49','France':'+33','Spain':'+34','Italy':'+39',
  'Netherlands':'+31','Belgium':'+32','Switzerland':'+41','Austria':'+43',
  'Sweden':'+46','Norway':'+47','Denmark':'+45','Finland':'+358','Ireland':'+353',
  'Poland':'+48','Portugal':'+351','Greece':'+30','Czech Republic':'+420',
  'Hungary':'+36','Romania':'+40','Ukraine':'+380','Russia':'+7','Turkey':'+90',
  'Israel':'+972','Saudi Arabia':'+966','United Arab Emirates':'+971',
  'Egypt':'+20','Nigeria':'+234','Kenya':'+254','South Africa':'+27',
  'Ghana':'+233','India':'+91','Pakistan':'+92','Bangladesh':'+880',
  'China':'+86','Japan':'+81','South Korea':'+82','Singapore':'+65',
  'Malaysia':'+60','Thailand':'+66','Vietnam':'+84','Indonesia':'+62',
  'Philippines':'+63','Mexico':'+52','Brazil':'+55','Argentina':'+54',
  'Chile':'+56','Colombia':'+57','Peru':'+51',
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
 * Profile a user from name + browser signals (timezone, language)
 * No random data — real signals only
 */
router.post('/scrape-user-data', async (req, res) => {
  try {
    const { name, email, timezone, language } = req.body;

    // Run public data profiling (timezone → country is the primary signal)
    const profile = await userIntelligenceEngine.scrapePublicData(
      name || '', email || '', timezone || null, language || null
    );

    // Also run IP-based geo as a cross-check
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.socket?.remoteAddress || req.ip;
    const ipData = await userIntelligenceEngine.resolveIP(ip);

    // Merge: timezone takes priority, then IP
    const country  = profile.country  || ipData?.country  || null;
    const city     = ipData?.city     || null;
    const dialCode = country ? (Object.entries(COUNTRY_DIAL).find(([c]) => c === country)?.[1] || null) : null;

    res.json({
      success: true,
      data: {
        country,
        city,
        timezone: profile.timezone || ipData?.timezone || null,
        dialCode,
        gender:    profile.gender    || null,
        nameOrigin: profile.nameOrigin || null,
        interests:  profile.interests  || [],
        // confidence signals for frontend debugging
        signals: {
          fromTimezone: !!profile.country,
          fromLanguage: !profile.country && !!profile.language,
          fromIP:       !profile.country && !!ipData?.country,
          fromName:     !profile.country && !!profile.nameOrigin,
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
