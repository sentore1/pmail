/**
 * Email Learning Engine
 *
 * Learns about a user from their own sent emails already in the Pmail database.
 * No external services, no OAuth, no Google Cloud needed.
 *
 * What it analyzes:
 *   - Subject lines → topic categories
 *   - Email bodies  → keywords, writing style, tone
 *   - Recipients    → communication network breadth
 *   - Send frequency → activity level
 */

import prisma from '../utils/prisma.js';

// ── Topic keyword map ─────────────────────────────────────────────────────────
const TOPICS = {
  tech:       ['code','software','api','bug','deploy','server','database','feature','git',
               'engineer','app','fix','update','build','dev','tech','system','error','debug',
               'repo','commit','release','sprint','ticket','pr','merge','branch'],
  business:   ['meeting','invoice','proposal','contract','client','project','deadline',
               'budget','team','revenue','quarterly','report','strategy','goal','kpi',
               'stakeholder','deliverable','agenda','follow up','follow-up','partnership',
               'agreement','negotiation','pricing','quote','offer','deal','sign'],
  creative:   ['design','logo','brand','creative','artwork','photo','video','content',
               'write','edit','draft','script','copy','mockup','wireframe','ui','ux',
               'illustration','campaign','launch','shoot','production','concept'],
  health:     ['health','medical','doctor','appointment','medicine','wellness','fitness',
               'diet','exercise','hospital','clinic','prescription','therapy','mental',
               'checkup','symptom','recovery','nutrition','sleep','stress'],
  finance:    ['payment','invoice','salary','tax','investment','budget','expense','cost',
               'price','finance','accounting','payroll','reimbursement','transfer','bank',
               'crypto','bitcoin','wallet','transaction','funds','revenue','profit'],
  personal:   ['lunch','dinner','party','trip','vacation','family','friend','birthday',
               'weekend','holiday','event','celebration','catch up','coffee','hello',
               'hi ','hey ','hope you','checking in','just wanted'],
  education:  ['course','class','study','research','paper','university','degree',
               'certificate','assignment','exam','lecture','workshop','training','learn',
               'skill','scholarship','thesis','professor','campus','enrollment'],
  legal:      ['contract','agreement','terms','legal','attorney','lawsuit','compliance',
               'gdpr','privacy','policy','nda','liability','dispute','court','clause',
               'intellectual property','patent','trademark','copyright'],
  networking: ['connect','introduction','linkedin','referral','opportunity','collaboration',
               'synergy','explore','reach out','introduce','recommend','mutual'],
};

// ── Writing style signals ─────────────────────────────────────────────────────
const STYLE_SIGNALS = {
  formal:   ['dear ','sincerely','regards','please find','attached herewith',
             'i am writing','pursuant','accordingly','kindly','henceforth'],
  casual:   ['hey ','hi ','lol','haha','thanks!','cheers','btw','fyi','yep','nope',
             'awesome','cool','np','tbh','imo','gonna','wanna'],
  concise:  [],   // detected by avg word count per email
  verbose:  [],   // detected by avg word count per email
};

/**
 * Main entry point.
 * Reads the user's sent emails from Pmail DB and builds an interest / style profile.
 *
 * @param {string} userId
 * @returns {{ topics: string[], style: string, activityLevel: string,
 *             networkSize: number, emailsAnalyzed: number }}
 */
export async function learnFromSentEmails(userId) {
  // Fetch last 200 sent (non-draft) emails
  const sentEmails = await prisma.email.findMany({
    where: { senderId: userId, isDraft: false },
    select: {
      subject: true,
      body: true,
      sentAt: true,
      recipients: {
        select: { recipientId: true },
      },
    },
    orderBy: { sentAt: 'desc' },
    take: 200,
  });

  if (sentEmails.length === 0) {
    return {
      topics: [],
      style: 'unknown',
      activityLevel: 'new',
      networkSize: 0,
      emailsAnalyzed: 0,
    };
  }

  // ── Topic scoring ─────────────────────────────────────────────────────────
  const topicScores = Object.fromEntries(Object.keys(TOPICS).map(t => [t, 0]));

  let totalWords = 0;
  let formalScore = 0;
  let casualScore = 0;
  const uniqueRecipients = new Set();

  for (const email of sentEmails) {
    const text = `${email.subject || ''} ${email.body || ''}`.toLowerCase();
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    totalWords += wordCount;

    // Topics
    for (const [topic, keywords] of Object.entries(TOPICS)) {
      const hits = keywords.filter(kw => text.includes(kw)).length;
      topicScores[topic] += hits;
    }

    // Style
    formalScore += STYLE_SIGNALS.formal.filter(s => text.includes(s)).length;
    casualScore += STYLE_SIGNALS.casual.filter(s => text.includes(s)).length;

    // Network
    for (const r of email.recipients) {
      uniqueRecipients.add(r.recipientId);
    }
  }

  // ── Derive top topics (score > 0, sorted by frequency) ───────────────────
  const topics = Object.entries(topicScores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic);

  // ── Writing style ─────────────────────────────────────────────────────────
  const avgWords = totalWords / sentEmails.length;
  let style = 'balanced';
  if (formalScore > casualScore * 2)  style = 'formal';
  else if (casualScore > formalScore * 2) style = 'casual';
  if (avgWords < 30) style = style === 'balanced' ? 'concise' : `${style}-concise`;
  if (avgWords > 150) style = style === 'balanced' ? 'detailed' : `${style}-detailed`;

  // ── Activity level ────────────────────────────────────────────────────────
  const newest = sentEmails[0]?.sentAt;
  const oldest = sentEmails[sentEmails.length - 1]?.sentAt;
  const spanDays = newest && oldest
    ? (new Date(newest) - new Date(oldest)) / (1000 * 60 * 60 * 24)
    : 0;
  const emailsPerDay = spanDays > 0 ? sentEmails.length / spanDays : 0;

  let activityLevel = 'low';
  if (emailsPerDay >= 5)       activityLevel = 'very-high';
  else if (emailsPerDay >= 2)  activityLevel = 'high';
  else if (emailsPerDay >= 0.5) activityLevel = 'moderate';

  // ── Persist to DB ─────────────────────────────────────────────────────────
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { interests: true },
  });

  const existingInterests = existingUser?.interests
    ? JSON.parse(existingUser.interests)
    : [];

  // Merge new topics with existing (new ones take priority in ordering)
  const mergedInterests = [...new Set([...topics, ...existingInterests])];

  await prisma.user.update({
    where: { id: userId },
    data: {
      gmailLearnedTopics: JSON.stringify(topics),
      gmailLastSynced: new Date(),
      interests: JSON.stringify(mergedInterests),
    },
  });

  return {
    topics,
    style,
    activityLevel,
    networkSize: uniqueRecipients.size,
    emailsAnalyzed: sentEmails.length,
  };
}

/**
 * Get the current learned profile for a user without re-running the analysis.
 */
export async function getLearningProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      gmailLearnedTopics: true,
      gmailLastSynced: true,
      gmailAccessEnabled: true,
      interests: true,
    },
  });

  return {
    connected: user?.gmailAccessEnabled || false,
    lastSynced: user?.gmailLastSynced || null,
    learnedTopics: user?.gmailLearnedTopics ? JSON.parse(user.gmailLearnedTopics) : [],
    allInterests: user?.interests ? JSON.parse(user.interests) : [],
  };
}
