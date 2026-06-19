import prisma from '../utils/prisma.js';

export const sendKnoccRequest = async (req, res) => {
  try {
    const { recipientEmail, reason, message, paymentAmount } = req.body;
    const senderId = req.user.id;

    // Find recipient
    const recipient = await prisma.user.findUnique({
      where: { email: recipientEmail },
    });

    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Check if already connected
    const existingContact = await prisma.contact.findFirst({
      where: {
        userId: senderId,
        contactId: recipient.id,
      },
    });

    if (existingContact) {
      return res.status(400).json({ error: 'Already connected with this user' });
    }

    // Check if blocked
    const isBlocked = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: recipient.id },
          { blockerId: recipient.id, blockedId: senderId },
        ],
      },
    });

    if (isBlocked) {
      return res.status(403).json({ error: 'Cannot send request to this user' });
    }

    // Atomic wallet debit — prevents race condition double-spend
    const updatedSender = await prisma.user.updateMany({
      where: { id: senderId, walletBalance: { gte: paymentAmount } },
      data: { walletBalance: { decrement: paymentAmount } },
    });

    if (updatedSender.count === 0) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    // Create transaction
    await prisma.transaction.create({
      data: {
        userId: senderId,
        type: 'KNOCC_SENT',
        amount: -paymentAmount,
        description: `Knocc request sent to ${recipient.name}`,
      },
    });

    // Determine payment type
    const paymentType = paymentAmount >= 50 ? 'PRYRO' : 'PAID';

    // Create knocc request
    const knoccRequest = await prisma.knoccRequest.create({
      data: {
        senderId,
        recipientId: recipient.id,
        reason,
        message,
        paymentAmount,
        paymentType,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            country: true,
            verified: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      message: 'Knocc request sent successfully',
      request: knoccRequest,
    });
  } catch (error) {
    console.error('Send knocc request error:', error);
    res.status(500).json({ error: 'Failed to send knocc request' });
  }
};

export const getReceivedRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { filter } = req.query; // 'all', 'paid', 'pryro'

    const where = {
      recipientId: userId,
      status: 'PENDING',
    };

    if (filter === 'paid') {
      where.paymentType = 'PAID';
    } else if (filter === 'pryro') {
      where.paymentType = 'PRYRO';
    }

    const requests = await prisma.knoccRequest.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            country: true,
            verified: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ requests });
  } catch (error) {
    console.error('Get received requests error:', error);
    res.status(500).json({ error: 'Failed to get requests' });
  }
};

export const getSentRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await prisma.knoccRequest.findMany({
      where: { senderId: userId },
      select: {
        id: true,
        status: true,
        recipientId: true,
        recipient: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ requests });
  } catch (error) {
    console.error('Get sent requests error:', error);
    res.status(500).json({ error: 'Failed to get sent requests' });
  }
};

export const respondToRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'decline'
    const userId = req.user.id;

    const request = await prisma.knoccRequest.findFirst({
      where: {
        id,
        recipientId: userId,
        status: 'PENDING',
      },
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (action === 'approve') {
      // Update request status
      await prisma.knoccRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          respondedAt: new Date(),
        },
      });

      // Add to contacts bidirectionally — skip if already exists
      await prisma.contact.createMany({
        data: [
          { userId, contactId: request.senderId },
          { userId: request.senderId, contactId: userId },
        ],
        skipDuplicates: true,
      });

      // Add payment to recipient's wallet
      await prisma.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: request.paymentAmount } },
      });

      // Create transaction
      await prisma.transaction.create({
        data: {
          userId,
          type: 'KNOCC_RECEIVED',
          amount: request.paymentAmount,
          description: `Knocc request approved from sender`,
        },
      });

      res.json({ message: 'Request approved successfully' });
    } else if (action === 'decline') {
      // Atomic: update status + refund in a single transaction
      await prisma.$transaction([
        prisma.knoccRequest.update({
          where: { id },
          data: { status: 'DECLINED', respondedAt: new Date() },
        }),
        prisma.user.update({
          where: { id: request.senderId },
          data: { walletBalance: { increment: request.paymentAmount } },
        }),
        prisma.transaction.create({
          data: {
            userId: request.senderId,
            type: 'REFUND',
            amount: request.paymentAmount,
            description: 'Knocc request declined - refund',
          },
        }),
      ]);
      res.json({ message: 'Request declined successfully' });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Respond to request error:', error);
    res.status(500).json({ error: 'Failed to respond to request' });
  }
};
