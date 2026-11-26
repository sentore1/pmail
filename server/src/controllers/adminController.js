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
