import prisma from '../utils/prisma.js';
import crypto from 'crypto';

// Generate unique invite code
const generateInviteCode = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Send invitation
export const sendInvitation = async (req, res) => {
  try {
    const { email, name } = req.body;
    const senderId = req.user.id;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'User already exists on Pmail',
        userExists: true 
      });
    }

    // Check if invitation already sent
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        senderId,
        email,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      return res.status(400).json({ 
        error: 'Invitation already sent to this email',
        alreadySent: true 
      });
    }

    // Create invitation
    const inviteCode = generateInviteCode();
    const invitation = await prisma.invitation.create({
      data: {
        senderId,
        email,
        name,
        inviteCode,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // TODO: Send invitation email here
    // You can integrate with services like SendGrid, AWS SES, etc.

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        status: invitation.status,
        inviteCode: invitation.inviteCode,
        sentAt: invitation.sentAt,
      },
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
};

// Send bulk invitations
export const sendBulkInvitations = async (req, res) => {
  try {
    const { contacts } = req.body; // Array of { email, name }
    const senderId = req.user.id;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'Contacts array is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const results = {
      success: [],
      failed: [],
      alreadyExists: [],
      alreadyInvited: [],
    };

    for (const contact of contacts) {
      try {
        const { email, name } = contact;

        // Validate email
        if (!email || !emailRegex.test(email)) {
          results.failed.push({ email, reason: 'Invalid email format' });
          continue;
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          results.alreadyExists.push({ email, name });
          continue;
        }

        // Check if invitation already sent
        const existingInvitation = await prisma.invitation.findFirst({
          where: {
            senderId,
            email,
            status: 'PENDING',
          },
        });

        if (existingInvitation) {
          results.alreadyInvited.push({ email, name });
          continue;
        }

        // Create invitation
        const inviteCode = generateInviteCode();
        const invitation = await prisma.invitation.create({
          data: {
            senderId,
            email,
            name,
            inviteCode,
            status: 'PENDING',
          },
        });

        results.success.push({
          email,
          name,
          inviteCode: invitation.inviteCode,
          sentAt: invitation.sentAt,
        });

        // TODO: Send invitation email asynchronously
      } catch (error) {
        console.error(`Error inviting ${contact.email}:`, error);
        results.failed.push({ 
          email: contact.email, 
          reason: error.message 
        });
      }
    }

    res.status(200).json({
      message: 'Bulk invitation process completed',
      results,
      summary: {
        total: contacts.length,
        successful: results.success.length,
        failed: results.failed.length,
        alreadyExists: results.alreadyExists.length,
        alreadyInvited: results.alreadyInvited.length,
      },
    });
  } catch (error) {
    console.error('Error sending bulk invitations:', error);
    res.status(500).json({ error: 'Failed to send bulk invitations' });
  }
};

// Get user's sent invitations
export const getSentInvitations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const where = { senderId: userId };
    if (status) {
      where.status = status.toUpperCase();
    }

    const invitations = await prisma.invitation.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        sentAt: true,
        acceptedAt: true,
        inviteCode: true,
      },
    });

    res.json({ invitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
};

// Get invitation statistics
export const getInvitationStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [total, pending, accepted, expired] = await Promise.all([
      prisma.invitation.count({ where: { senderId: userId } }),
      prisma.invitation.count({ where: { senderId: userId, status: 'PENDING' } }),
      prisma.invitation.count({ where: { senderId: userId, status: 'ACCEPTED' } }),
      prisma.invitation.count({ where: { senderId: userId, status: 'EXPIRED' } }),
    ]);

    res.json({
      stats: {
        total,
        pending,
        accepted,
        expired,
      },
    });
  } catch (error) {
    console.error('Error fetching invitation stats:', error);
    res.status(500).json({ error: 'Failed to fetch invitation stats' });
  }
};

// Resend invitation
export const resendInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user.id;

    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        senderId: userId,
      },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `Cannot resend ${invitation.status.toLowerCase()} invitation` 
      });
    }

    // Update sent date
    const updatedInvitation = await prisma.invitation.update({
      where: { id: invitationId },
      data: { sentAt: new Date() },
    });

    // TODO: Send invitation email

    res.json({
      message: 'Invitation resent successfully',
      invitation: updatedInvitation,
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    res.status(500).json({ error: 'Failed to resend invitation' });
  }
};

// Cancel invitation (POST /invitations/:id/cancel — keeps record, marks CANCELLED)
export const cancelInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user.id;

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, senderId: userId },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status !== 'PENDING') {
      return res.status(400).json({
        error: `Cannot cancel ${invitation.status.toLowerCase()} invitation`,
      });
    }

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'CANCELLED' },
    });

    res.json({ message: 'Invitation cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
};

// Accept invitation (used during registration)
export const acceptInvitation = async (inviteCode) => {
  try {
    const invitation = await prisma.invitation.findUnique({
      where: { inviteCode },
    });

    if (!invitation) {
      return { success: false, error: 'Invalid invite code' };
    }

    if (invitation.status !== 'PENDING') {
      return { 
        success: false, 
        error: `Invitation is ${invitation.status.toLowerCase()}` 
      };
    }

    // Update invitation status
    await prisma.invitation.update({
      where: { inviteCode },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    return { success: true, invitation };
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return { success: false, error: 'Failed to accept invitation' };
  }
};
