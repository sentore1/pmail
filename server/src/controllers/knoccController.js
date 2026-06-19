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

    // Check wallet balance
    if (req.user.walletBalance < paymentAmount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    // Deduct from sender's wallet
    await prisma.user.update({
      where: { id: senderId },
      data: { walletBalance: { decrement: paymentAmount } },
    });

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

      // Add to contacts (bidirectional)
      await prisma.contact.createMany({
        data: [
          { userId, contactId: request.senderId },
          { userId: request.senderId, contactId: userId },
        ],
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
      // Update request status
      await prisma.knoccRequest.update({
        where: { id },
        data: {
          status: 'DECLINED',
          respondedAt: new Date(),
        },
      });

      // Refund sender
      await prisma.user.update({
        where: { id: request.senderId },
        data: { walletBalance: { increment: request.paymentAmount } },
      });

      // Create transaction
      await prisma.transaction.create({
        data: {
          userId: request.senderId,
          type: 'REFUND',
          amount: request.paymentAmount,
          description: `Knocc request declined - refund`,
        },
      });

      res.json({ message: 'Request declined successfully' });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Respond to request error:', error);
    res.status(500).json({ error: 'Failed to respond to request' });
  }
};
