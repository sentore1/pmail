import prisma from '../utils/prisma.js';

export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user.id;

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } },
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        country: true,
        knoccPrice: true,
        verified: true,
      },
      take: 20,
    });

    // Check which users are already contacts
    const contactIds = await prisma.contact.findMany({
      where: { userId },
      select: { contactId: true },
    });

    const contactIdSet = new Set(contactIds.map((c) => c.contactId));

    const usersWithStatus = users.map((user) => ({
      ...user,
      isContact: contactIdSet.has(user.id),
    }));

    res.json({ users: usersWithStatus });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
};

export const getContacts = async (req, res) => {
  try {
    const userId = req.user.id;

    const contacts = await prisma.contact.findMany({
      where: { userId },
      include: {
        contact: {
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
        approvedAt: 'desc',
      },
    });

    res.json({ contacts: contacts.map((c) => c.contact) });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ error: 'Failed to get contacts' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phoneNumber, age, gender, country, knoccPrice } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(age && { age: parseInt(age) }),
        ...(gender && { gender }),
        ...(country && { country }),
        ...(knoccPrice !== undefined && { knoccPrice: parseFloat(knoccPrice) }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        age: true,
        gender: true,
        country: true,
        knoccPrice: true,
        verified: true,
        walletBalance: true,
      },
    });

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const blockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { userId } = req.params;

    if (blockerId === userId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    // Check if user exists
    const userToBlock = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToBlock) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already blocked
    const existingBlock = await prisma.blockedUser.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId: userId,
        },
      },
    });

    if (existingBlock) {
      return res.status(400).json({ error: 'User is already blocked' });
    }

    // Create block
    await prisma.blockedUser.create({
      data: {
        blockerId,
        blockedId: userId,
      },
    });

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const blockerId = req.user.id;
    const { userId } = req.params;

    // Find and delete the block
    const deletedBlock = await prisma.blockedUser.deleteMany({
      where: {
        blockerId,
        blockedId: userId,
      },
    });

    if (deletedBlock.count === 0) {
      return res.status(404).json({ error: 'User is not blocked' });
    }

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
};

export const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user.id;

    const blockedUsers = await prisma.blockedUser.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
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
        blockedAt: 'desc',
      },
    });

    res.json({ blockedUsers: blockedUsers.map((b) => ({ ...b.blocked, blockedAt: b.blockedAt })) });
  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({ error: 'Failed to get blocked users' });
  }
};
