import prisma from '../utils/prisma.js';

// GET /api/admin/earnings
// Summary of all platform fees collected
export const getEarnings = async (req, res) => {
  try {
    const { source, from, to, page = 1, limit = 50 } = req.query;

    const where = {
      ...(source && { source }),
      ...(from || to ? {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to   && { lte: new Date(to) }),
        },
      } : {}),
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [earnings, total, aggregate] = await Promise.all([
      prisma.platformEarning.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          // join user name for display
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.platformEarning.count({ where }),
      prisma.platformEarning.aggregate({
        where,
        _sum: { feeAmount: true, depositAmount: true },
        _count: true,
      }),
    ]);

    // Breakdown by source
    const bySource = await prisma.platformEarning.groupBy({
      by: ['source'],
      where,
      _sum: { feeAmount: true },
      _count: true,
    });

    res.json({
      summary: {
        totalFees: aggregate._sum.feeAmount || 0,
        totalDeposits: aggregate._sum.depositAmount || 0,
        totalTransactions: aggregate._count,
        bySource: bySource.map(s => ({
          source: s.source,
          fees: s._sum.feeAmount || 0,
          count: s._count,
        })),
      },
      earnings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Admin earnings error:', err);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
};

// GET /api/admin/earnings/stats
// Quick totals — today, this month, all time
export const getEarningsStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allTime, thisMonth, today] = await Promise.all([
      prisma.platformEarning.aggregate({ _sum: { feeAmount: true }, _count: true }),
      prisma.platformEarning.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { feeAmount: true }, _count: true,
      }),
      prisma.platformEarning.aggregate({
        where: { createdAt: { gte: startOfDay } },
        _sum: { feeAmount: true }, _count: true,
      }),
    ]);

    res.json({
      allTime:   { fees: allTime._sum.feeAmount   || 0, count: allTime._count },
      thisMonth: { fees: thisMonth._sum.feeAmount || 0, count: thisMonth._count },
      today:     { fees: today._sum.feeAmount     || 0, count: today._count },
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

import { evaluateSignupBehavior, THRESHOLDS } from '../services/humanEntropyScorer.js';

// ── GET /api/admin/settings ───────────────────────────────────────────────────
export const getSettings = async (req, res) => {
  try {
    const settings = await prisma.platformSettings.upsert({
      where: { id: 'global' },
      update: {},
      create: { id: 'global', activeGateway: 'MOMO' },
    });
    res.json({ settings });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to get settings' });
  }
};

// ── PUT /api/admin/settings ───────────────────────────────────────────────────
export const updateSettings = async (req, res) => {
  try {
    const { activeGateway } = req.body;
    if (!['MOMO', 'STRIPE', 'LIGHTNING'].includes(activeGateway)) {
      return res.status(400).json({ error: 'activeGateway must be MOMO, STRIPE, or LIGHTNING' });
    }
    const settings = await prisma.platformSettings.upsert({
      where: { id: 'global' },
      update: { activeGateway },
      create: { id: 'global', activeGateway },
    });
    res.json({ settings });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// ── GET /api/admin/entropy ────────────────────────────────────────────────
// List all signup entropy records with optional filters.
// Query params:
//   verdict   = HUMAN | UNCERTAIN | BOT  (filter by auto verdict)
//   labeled   = true | false             (filter by whether admin has labeled)
//   page, limit
export const getEntropySignups = async (req, res) => {
  try {
    const { verdict, labeled, page = 1, limit = 50 } = req.query;

    const where = {
      ...(verdict && { verdict }),
      ...(labeled === 'true'  && { manualLabel: { not: null } }),
      ...(labeled === 'false' && { manualLabel: null }),
    };

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);

    const [records, total] = await Promise.all([
      prisma.suspiciousActivity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        select: {
          id:          true,
          ip:          true,
          userAgent:   true,
          score:       true,
          flags:       true,
          verdict:     true,
          manualLabel: true,
          shadowBanned:true,
          username:    true,
          createdAt:   true,
          // rawFeatures omitted from list — too large; fetch via /entropy/:id
        },
      }),
      prisma.suspiciousActivity.count({ where }),
    ]);

    res.json({
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Admin entropy list error:', err);
    res.status(500).json({ error: 'Failed to fetch entropy records' });
  }
};

// ── GET /api/admin/entropy/:id ────────────────────────────────────────────
// Full record including rawFeatures JSON — for detailed review.
export const getEntropyRecord = async (req, res) => {
  try {
    const record = await prisma.suspiciousActivity.findUnique({
      where: { id: req.params.id },
    });
    if (!record) return res.status(404).json({ error: 'Record not found' });

    // Parse rawFeatures back to object for readability
    let parsedFeatures = null;
    try { parsedFeatures = JSON.parse(record.rawFeatures); } catch {}

    res.json({ ...record, rawFeatures: parsedFeatures });
  } catch (err) {
    console.error('Admin entropy record error:', err);
    res.status(500).json({ error: 'Failed to fetch record' });
  }
};

// ── PATCH /api/admin/entropy/:id/label ───────────────────────────────────
// Admin manually labels a record as HUMAN or BOT.
// Body: { label: "HUMAN" | "BOT" }
// This is the core feedback loop — labeled records let you compare what the
// algorithm decided vs ground truth, then tune THRESHOLDS to close the gap.
export const labelEntropyRecord = async (req, res) => {
  try {
    const { label } = req.body;
    if (!['HUMAN', 'BOT'].includes(label)) {
      return res.status(400).json({ error: 'label must be HUMAN or BOT' });
    }

    const record = await prisma.suspiciousActivity.findUnique({
      where: { id: req.params.id },
    });
    if (!record) return res.status(404).json({ error: 'Record not found' });

    // If admin labels a BOT that the algorithm called HUMAN — that's a false negative.
    // If admin labels a HUMAN that the algorithm called BOT — that's a false positive.
    // Both are logged here via the manualLabel field for stats calculation.
    await prisma.suspiciousActivity.update({
      where: { id: req.params.id },
      data:  { manualLabel: label },
    });

    res.json({
      message: 'Label saved',
      algorithmVerdict: record.verdict,
      manualLabel: label,
      match: record.verdict === label,
    });
  } catch (err) {
    console.error('Admin entropy label error:', err);
    res.status(500).json({ error: 'Failed to save label' });
  }
};

// ── GET /api/admin/entropy/stats ─────────────────────────────────────────
// Accuracy report based on manually labelled records.
// Reports: precision, recall, false positive rate, false negative rate.
// Also re-scores every labelled record with current thresholds so you can
// see immediately how a threshold change would affect accuracy.
export const getEntropyStats = async (req, res) => {
  try {
    // All records that have been manually reviewed
    const labeled = await prisma.suspiciousActivity.findMany({
      where:  { manualLabel: { not: null } },
      select: { verdict: true, manualLabel: true, score: true, rawFeatures: true },
    });

    if (labeled.length === 0) {
      return res.json({
        message: 'No labeled records yet. Use PATCH /api/admin/entropy/:id/label to start labeling.',
        total: 0,
      });
    }

    // Confusion matrix
    let tp = 0; // algorithm said BOT,   actually BOT   (true positive)
    let tn = 0; // algorithm said HUMAN, actually HUMAN (true negative)
    let fp = 0; // algorithm said BOT,   actually HUMAN (false positive — worst: real user blocked)
    let fn = 0; // algorithm said HUMAN, actually BOT   (false negative — bot got through)

    // Re-score with CURRENT thresholds to simulate a threshold change effect
    let simTp = 0, simTn = 0, simFp = 0, simFn = 0;

    for (const r of labeled) {
      const algoBot   = r.verdict     === 'BOT';
      const actualBot = r.manualLabel === 'BOT';

      if (algoBot  && actualBot)  tp++;
      if (!algoBot && !actualBot) tn++;
      if (algoBot  && !actualBot) fp++;
      if (!algoBot && actualBot)  fn++;

      // Re-score with live thresholds
      try {
        const raw = JSON.parse(r.rawFeatures);
        const { verdict: simVerdict } = evaluateSignupBehavior(raw, THRESHOLDS);
        const simBot = simVerdict === 'BOT';
        if (simBot  && actualBot)  simTp++;
        if (!simBot && !actualBot) simTn++;
        if (simBot  && !actualBot) simFp++;
        if (!simBot && actualBot)  simFn++;
      } catch {}
    }

    const total  = labeled.length;
    const pct    = (n) => total > 0 ? Math.round((n / total) * 1000) / 10 : 0;

    // Precision = of all BOT verdicts, how many were actually bots
    const precision = tp + fp > 0 ? Math.round((tp / (tp + fp)) * 1000) / 10 : null;
    // Recall    = of all actual bots, how many did we catch
    const recall    = tp + fn > 0 ? Math.round((tp / (tp + fn)) * 1000) / 10 : null;

    const simPrecision = simTp + simFp > 0 ? Math.round((simTp / (simTp + simFp)) * 1000) / 10 : null;
    const simRecall    = simTp + simFn > 0 ? Math.round((simTp / (simTp + simFn)) * 1000) / 10 : null;

    res.json({
      totalLabeled: total,
      // Historical (verdicts stored at time of signup)
      historical: {
        truePositives:  tp,  // bots correctly caught
        trueNegatives:  tn,  // humans correctly passed
        falsePositives: fp,  // humans incorrectly blocked  ← most important to minimize
        falseNegatives: fn,  // bots that slipped through
        falsePositiveRate: pct(fp),
        falseNegativeRate: pct(fn),
        precision,
        recall,
      },
      // Simulated with CURRENT thresholds (shows effect of any recent tuning)
      simulated: {
        truePositives:  simTp,
        trueNegatives:  simTn,
        falsePositives: simFp,
        falseNegatives: simFn,
        falsePositiveRate: pct(simFp),
        falseNegativeRate: pct(simFn),
        precision: simPrecision,
        recall:    simRecall,
      },
      // Current threshold config — shown so you know what produced the simulated result
      currentThresholds: THRESHOLDS,
    });
  } catch (err) {
    console.error('Admin entropy stats error:', err);
    res.status(500).json({ error: 'Failed to compute stats' });
  }
};
