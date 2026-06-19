import prisma from '../utils/prisma.js';

export const sendEmail = async (req, res) => {
  try {
    const { to, cc, bcc, subject, body } = req.body;
    const senderId = req.user.id;

    // Create email
    const email = await prisma.email.create({
      data: {
        subject,
        body,
        senderId,
      },
    });

    // Create recipients
    const recipients = [];
    
    // TO recipients
    if (to && to.length > 0) {
      for (const recipientEmail of to) {
        const recipient = await prisma.user.findUnique({
          where: { email: recipientEmail },
        });
        if (recipient) {
          recipients.push({
            emailId: email.id,
            recipientId: recipient.id,
            type: 'TO',
          });
        }
      }
    }

    // CC recipients
    if (cc && cc.length > 0) {
      for (const recipientEmail of cc) {
        const recipient = await prisma.user.findUnique({
          where: { email: recipientEmail },
        });
        if (recipient) {
          recipients.push({
            emailId: email.id,
            recipientId: recipient.id,
            type: 'CC',
          });
        }
      }
    }

    // BCC recipients
    if (bcc && bcc.length > 0) {
      for (const recipientEmail of bcc) {
        const recipient = await prisma.user.findUnique({
          where: { email: recipientEmail },
        });
        if (recipient) {
          recipients.push({
            emailId: email.id,
            recipientId: recipient.id,
            type: 'BCC',
          });
        }
      }
    }

    await prisma.emailRecipient.createMany({
      data: recipients,
    });

    res.status(201).json({
      message: 'Email sent successfully',
      email,
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
};

export const getInbox = async (req, res) => {
  try {
    const userId = req.user.id;

    const emails = await prisma.emailRecipient.findMany({
      where: {
        recipientId: userId,
        email: {
          isBin: false,
          isArchived: false,
        },
      },
      include: {
        email: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                verified: true,
              },
            },
          },
        },
      },
      orderBy: {
        email: {
          sentAt: 'desc',
        },
      },
    });

    res.json({ emails });
  } catch (error) {
    console.error('Get inbox error:', error);
    res.status(500).json({ error: 'Failed to get inbox' });
  }
};

export const getSentEmails = async (req, res) => {
  try {
    const userId = req.user.id;

    const emails = await prisma.email.findMany({
      where: {
        senderId: userId,
        isBin: false,
      },
      include: {
        recipients: {
          include: {
            recipient: {
              select: {
                id: true,
                name: true,
                email: true,
                verified: true,
              },
            },
          },
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
    });

    res.json({ emails });
  } catch (error) {
    console.error('Get sent emails error:', error);
    res.status(500).json({ error: 'Failed to get sent emails' });
  }
};

export const getEmailById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const emailRecipient = await prisma.emailRecipient.findFirst({
      where: {
        emailId: id,
        recipientId: userId,
      },
      include: {
        email: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                verified: true,
              },
            },
            recipients: {
              include: {
                recipient: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    verified: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!emailRecipient) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Mark as read
    await prisma.emailRecipient.update({
      where: { id: emailRecipient.id },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({ email: emailRecipient.email });
  } catch (error) {
    console.error('Get email error:', error);
    res.status(500).json({ error: 'Failed to get email' });
  }
};

export const deleteEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is sender
    const email = await prisma.email.findFirst({
      where: {
        id,
        senderId: userId,
      },
    });

    if (email) {
      await prisma.email.update({
        where: { id },
        data: { isBin: true },
      });
    } else {
      // Check if user is recipient
      const emailRecipient = await prisma.emailRecipient.findFirst({
        where: {
          emailId: id,
          recipientId: userId,
        },
      });

      if (!emailRecipient) {
        return res.status(404).json({ error: 'Email not found' });
      }

      await prisma.email.update({
        where: { id },
        data: { isBin: true },
      });
    }

    res.json({ message: 'Email moved to bin' });
  } catch (error) {
    console.error('Delete email error:', error);
    res.status(500).json({ error: 'Failed to delete email' });
  }
};

export const starEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is sender or recipient
    const email = await prisma.email.findFirst({
      where: {
        id,
        OR: [
          { senderId: userId },
          { recipients: { some: { recipientId: userId } } },
        ],
      },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found' });
    }

    // Toggle star status
    const updatedEmail = await prisma.email.update({
      where: { id },
      data: { isStarred: !email.isStarred },
    });

    res.json({ 
      message: updatedEmail.isStarred ? 'Email starred' : 'Email unstarred',
      isStarred: updatedEmail.isStarred
    });
  } catch (error) {
    console.error('Star email error:', error);
    res.status(500).json({ error: 'Failed to star email' });
  }
};

export const getStarredEmails = async (req, res) => {
  try {
    const userId = req.user.id;

    const emails = await prisma.email.findMany({
      where: {
        isStarred: true,
        isBin: false,
        OR: [
          { senderId: userId },
          { recipients: { some: { recipientId: userId } } },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            verified: true,
          },
        },
        recipients: {
          include: {
            recipient: {
              select: {
                id: true,
                name: true,
                email: true,
                verified: true,
              },
            },
          },
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
    });

    res.json({ emails });
  } catch (error) {
    console.error('Get starred emails error:', error);
    res.status(500).json({ error: 'Failed to get starred emails' });
  }
};

export const getBinEmails = async (req, res) => {
  try {
    const userId = req.user.id;

    const emails = await prisma.email.findMany({
      where: {
        isBin: true,
        OR: [
          { senderId: userId },
          { recipients: { some: { recipientId: userId } } },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            verified: true,
          },
        },
        recipients: {
          include: {
            recipient: {
              select: {
                id: true,
                name: true,
                email: true,
                verified: true,
              },
            },
          },
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
    });

    res.json({ emails });
  } catch (error) {
    console.error('Get bin emails error:', error);
    res.status(500).json({ error: 'Failed to get bin emails' });
  }
};

export const restoreEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is sender or recipient
    const email = await prisma.email.findFirst({
      where: {
        id,
        isBin: true,
        OR: [
          { senderId: userId },
          { recipients: { some: { recipientId: userId } } },
        ],
      },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found in bin' });
    }

    await prisma.email.update({
      where: { id },
      data: { isBin: false },
    });

    res.json({ message: 'Email restored from bin' });
  } catch (error) {
    console.error('Restore email error:', error);
    res.status(500).json({ error: 'Failed to restore email' });
  }
};

export const permanentlyDeleteEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is sender
    const email = await prisma.email.findFirst({
      where: {
        id,
        senderId: userId,
      },
    });

    if (!email) {
      return res.status(404).json({ error: 'Email not found or you do not have permission to delete it' });
    }

    await prisma.email.delete({
      where: { id },
    });

    res.json({ message: 'Email permanently deleted' });
  } catch (error) {
    console.error('Permanently delete email error:', error);
    res.status(500).json({ error: 'Failed to permanently delete email' });
  }
};
