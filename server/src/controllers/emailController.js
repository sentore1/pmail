import prisma from '../utils/prisma.js';

// Helper: base select for email with sender, recipients, attachments, per-user flags
const emailSelect = (userId) => ({
  id: true,
  subject: true,
  body: true,
  isDraft: true,
  sentAt: true,
  sender: {
    select: { id: true, name: true, email: true, verified: true },
  },
  recipients: {
    include: {
      recipient: {
        select: { id: true, name: true, email: true, verified: true },
      },
    },
  },
  attachments: {
    select: { id: true, filename: true, mimeType: true, size: true },
  },
  stars: {
    where: { userId },
    select: { id: true },
  },
  deletes: {
    where: { userId },
    select: { id: true },
  },
});

// Shape raw email record into a clean response object
const shapeEmail = (email, userId) => ({
  ...email,
  isStarred: email.stars?.length > 0,
  isDeleted: email.deletes?.length > 0,
  stars: undefined,
  deletes: undefined,
});

// ─── Send email ─────────────────────────────────────────────────────────────

export const sendEmail = async (req, res) => {
  try {
    const { to, cc, bcc, subject, body, attachments: rawAttachments = [] } = req.body;
    const senderId = req.user.id;

    if (!to || to.length === 0) {
      return res.status(400).json({ error: 'At least one recipient is required' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    // Create the email
    const email = await prisma.email.create({
      data: {
        subject,
        body: body || '',
        senderId,
        isDraft: false,
        attachments: {
          create: rawAttachments.map((a) => ({
            filename: a.filename,
            mimeType: a.mimeType,
            size: a.size,
            data: a.data,
          })),
        },
      },
    });

    // Resolve recipients — collect unknown emails to warn
    const unknownEmails = [];
    const recipientRows = [];

    const resolveRecipients = async (emails, type) => {
      for (const recipientEmail of emails) {
        const user = await prisma.user.findUnique({ where: { email: recipientEmail } });
        if (user) {
          recipientRows.push({ emailId: email.id, recipientId: user.id, type });
        } else {
          unknownEmails.push(recipientEmail);
        }
      }
    };

    await resolveRecipients(to, 'TO');
    if (cc?.length) await resolveRecipients(cc, 'CC');
    if (bcc?.length) await resolveRecipients(bcc, 'BCC');

    if (recipientRows.length > 0) {
      await prisma.emailRecipient.createMany({ data: recipientRows });
    }

    res.status(201).json({
      message: 'Email sent successfully',
      email,
      unknownRecipients: unknownEmails.length > 0 ? unknownEmails : undefined,
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
};

// ─── Drafts ──────────────────────────────────────────────────────────────────

export const saveDraft = async (req, res) => {
  try {
    const { id, to, cc, bcc, subject, body, attachments: rawAttachments = [] } = req.body;
    const senderId = req.user.id;

    if (id) {
      // Update existing draft
      const existing = await prisma.email.findFirst({
        where: { id, senderId, isDraft: true },
      });
      if (!existing) {
        return res.status(404).json({ error: 'Draft not found' });
      }

      // Replace attachments
      await prisma.attachment.deleteMany({ where: { emailId: id } });

      const draft = await prisma.email.update({
        where: { id },
        data: {
          subject: subject || '',
          body: body || '',
          sentAt: new Date(),
          attachments: {
            create: rawAttachments.map((a) => ({
              filename: a.filename,
              mimeType: a.mimeType,
              size: a.size,
              data: a.data,
            })),
          },
        },
      });

      // Replace recipient hints (we store them even for drafts so we can restore To/CC/BCC)
      await prisma.emailRecipient.deleteMany({ where: { emailId: id } });
      await saveRecipientHints(draft.id, to, cc, bcc);

      return res.json({ message: 'Draft updated', draft });
    }

    // Create new draft
    const draft = await prisma.email.create({
      data: {
        subject: subject || '',
        body: body || '',
        senderId,
        isDraft: true,
        attachments: {
          create: rawAttachments.map((a) => ({
            filename: a.filename,
            mimeType: a.mimeType,
            size: a.size,
            data: a.data,
          })),
        },
      },
    });

    await saveRecipientHints(draft.id, to, cc, bcc);

    res.status(201).json({ message: 'Draft saved', draft });
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
};

// Store To/CC/BCC as recipients (resolved only for registered users)
async function saveRecipientHints(emailId, to, cc, bcc) {
  const rows = [];
  const addHints = async (emails, type) => {
    if (!emails?.length) return;
    for (const e of emails) {
      const user = await prisma.user.findUnique({ where: { email: e } });
      if (user) rows.push({ emailId, recipientId: user.id, type });
    }
  };
  await addHints(to, 'TO');
  await addHints(cc, 'CC');
  await addHints(bcc, 'BCC');
  if (rows.length) await prisma.emailRecipient.createMany({ data: rows });
}

export const getDrafts = async (req, res) => {
  try {
    const userId = req.user.id;

    const drafts = await prisma.email.findMany({
      where: { senderId: userId, isDraft: true },
      include: {
        recipients: {
          include: {
            recipient: { select: { id: true, name: true, email: true } },
          },
        },
        attachments: {
          select: { id: true, filename: true, mimeType: true, size: true },
        },
      },
      orderBy: { sentAt: 'desc' },
    });

    res.json({ drafts });
  } catch (error) {
    console.error('Get drafts error:', error);
    res.status(500).json({ error: 'Failed to get drafts' });
  }
};

export const deleteDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const draft = await prisma.email.findFirst({
      where: { id, senderId: userId, isDraft: true },
    });
    if (!draft) return res.status(404).json({ error: 'Draft not found' });

    await prisma.email.delete({ where: { id } });
    res.json({ message: 'Draft deleted' });
  } catch (error) {
    console.error('Delete draft error:', error);
    res.status(500).json({ error: 'Failed to delete draft' });
  }
};

// ─── Inbox / folders ─────────────────────────────────────────────────────────

export const getInbox = async (req, res) => {
  try {
    const userId = req.user.id;

    const recipientRows = await prisma.emailRecipient.findMany({
      where: {
        recipientId: userId,
        email: {
          isDraft: false,
          deletes: { none: { userId } },
          isArchived: false,
        },
      },
      include: {
        email: {
          include: {
            sender: { select: { id: true, name: true, email: true, verified: true } },
            attachments: { select: { id: true, filename: true, mimeType: true, size: true } },
            stars: { where: { userId }, select: { id: true } },
          },
        },
      },
      orderBy: { email: { sentAt: 'desc' } },
    });

    const emails = recipientRows.map((row) => ({
      ...row.email,
      isRead: row.isRead,
      readAt: row.readAt,
      recipientType: row.type,
      isStarred: row.email.stars?.length > 0,
      stars: undefined,
    }));

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
        isDraft: false,
        deletes: { none: { userId } },
      },
      include: {
        recipients: {
          include: {
            recipient: { select: { id: true, name: true, email: true, verified: true } },
          },
        },
        attachments: { select: { id: true, filename: true, mimeType: true, size: true } },
        stars: { where: { userId }, select: { id: true } },
      },
      orderBy: { sentAt: 'desc' },
    });

    const shaped = emails.map((e) => ({
      ...e,
      isStarred: e.stars?.length > 0,
      stars: undefined,
    }));

    res.json({ emails: shaped });
  } catch (error) {
    console.error('Get sent emails error:', error);
    res.status(500).json({ error: 'Failed to get sent emails' });
  }
};

export const getEmailById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Try as recipient first
    const recipientRow = await prisma.emailRecipient.findFirst({
      where: { emailId: id, recipientId: userId },
      include: {
        email: {
          include: {
            sender: { select: { id: true, name: true, email: true, verified: true } },
            recipients: {
              include: {
                recipient: { select: { id: true, name: true, email: true, verified: true } },
              },
            },
            attachments: { select: { id: true, filename: true, mimeType: true, size: true } },
            stars: { where: { userId }, select: { id: true } },
          },
        },
      },
    });

    if (recipientRow) {
      // Mark as read
      await prisma.emailRecipient.update({
        where: { id: recipientRow.id },
        data: { isRead: true, readAt: new Date() },
      });

      const email = {
        ...recipientRow.email,
        isRead: true,
        recipientType: recipientRow.type,
        isStarred: recipientRow.email.stars?.length > 0,
        stars: undefined,
      };
      return res.json({ email });
    }

    // Try as sender (for sent/draft view)
    const senderEmail = await prisma.email.findFirst({
      where: { id, senderId: userId },
      include: {
        sender: { select: { id: true, name: true, email: true, verified: true } },
        recipients: {
          include: {
            recipient: { select: { id: true, name: true, email: true, verified: true } },
          },
        },
        attachments: { select: { id: true, filename: true, mimeType: true, size: true } },
        stars: { where: { userId }, select: { id: true } },
      },
    });

    if (senderEmail) {
      const email = {
        ...senderEmail,
        isStarred: senderEmail.stars?.length > 0,
        stars: undefined,
      };
      return res.json({ email });
    }

    return res.status(404).json({ error: 'Email not found' });
  } catch (error) {
    console.error('Get email error:', error);
    res.status(500).json({ error: 'Failed to get email' });
  }
};

// ─── Per-user star ────────────────────────────────────────────────────────────

export const starEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify user has access to this email
    const hasAccess = await prisma.email.findFirst({
      where: {
        id,
        OR: [
          { senderId: userId },
          { recipients: { some: { recipientId: userId } } },
        ],
      },
    });
    if (!hasAccess) return res.status(404).json({ error: 'Email not found' });

    const existing = await prisma.emailStar.findUnique({
      where: { emailId_userId: { emailId: id, userId } },
    });

    if (existing) {
      await prisma.emailStar.delete({
        where: { emailId_userId: { emailId: id, userId } },
      });
      return res.json({ message: 'Email unstarred', isStarred: false });
    }

    await prisma.emailStar.create({ data: { emailId: id, userId } });
    res.json({ message: 'Email starred', isStarred: true });
  } catch (error) {
    console.error('Star email error:', error);
    res.status(500).json({ error: 'Failed to star email' });
  }
};

export const getStarredEmails = async (req, res) => {
  try {
    const userId = req.user.id;

    const stars = await prisma.emailStar.findMany({
      where: { userId },
      include: {
        email: {
          include: {
            sender: { select: { id: true, name: true, email: true, verified: true } },
            recipients: {
              include: {
                recipient: { select: { id: true, name: true, email: true, verified: true } },
              },
            },
            attachments: { select: { id: true, filename: true, mimeType: true, size: true } },
            deletes: { where: { userId }, select: { id: true } },
          },
        },
      },
      orderBy: { starredAt: 'desc' },
    });

    const emails = stars
      .filter((s) => s.email.deletes?.length === 0)
      .map((s) => ({ ...s.email, isStarred: true, deletes: undefined }));

    res.json({ emails });
  } catch (error) {
    console.error('Get starred emails error:', error);
    res.status(500).json({ error: 'Failed to get starred emails' });
  }
};

// ─── Per-user delete / bin ────────────────────────────────────────────────────

export const deleteEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const hasAccess = await prisma.email.findFirst({
      where: {
        id,
        OR: [
          { senderId: userId },
          { recipients: { some: { recipientId: userId } } },
        ],
      },
    });
    if (!hasAccess) return res.status(404).json({ error: 'Email not found' });

    await prisma.emailDelete.upsert({
      where: { emailId_userId: { emailId: id, userId } },
      update: {},
      create: { emailId: id, userId },
    });

    res.json({ message: 'Email moved to bin' });
  } catch (error) {
    console.error('Delete email error:', error);
    res.status(500).json({ error: 'Failed to delete email' });
  }
};

export const getBinEmails = async (req, res) => {
  try {
    const userId = req.user.id;

    const deleted = await prisma.emailDelete.findMany({
      where: { userId },
      include: {
        email: {
          include: {
            sender: { select: { id: true, name: true, email: true, verified: true } },
            recipients: {
              include: {
                recipient: { select: { id: true, name: true, email: true, verified: true } },
              },
            },
            attachments: { select: { id: true, filename: true, mimeType: true, size: true } },
            stars: { where: { userId }, select: { id: true } },
          },
        },
      },
      orderBy: { deletedAt: 'desc' },
    });

    const emails = deleted.map((d) => ({
      ...d.email,
      isStarred: d.email.stars?.length > 0,
      stars: undefined,
    }));

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

    const deleted = await prisma.emailDelete.findUnique({
      where: { emailId_userId: { emailId: id, userId } },
    });
    if (!deleted) return res.status(404).json({ error: 'Email not found in bin' });

    await prisma.emailDelete.delete({
      where: { emailId_userId: { emailId: id, userId } },
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

    // Only the sender can permanently delete
    const email = await prisma.email.findFirst({ where: { id, senderId: userId } });
    if (!email) {
      return res.status(404).json({ error: 'Email not found or insufficient permission' });
    }

    await prisma.email.delete({ where: { id } });
    res.json({ message: 'Email permanently deleted' });
  } catch (error) {
    console.error('Permanently delete email error:', error);
    res.status(500).json({ error: 'Failed to permanently delete email' });
  }
};

// ─── Attachment download ──────────────────────────────────────────────────────

export const getAttachment = async (req, res) => {
  try {
    const { emailId, attachmentId } = req.params;
    const userId = req.user.id;

    // Verify access
    const hasAccess = await prisma.email.findFirst({
      where: {
        id: emailId,
        OR: [
          { senderId: userId },
          { recipients: { some: { recipientId: userId } } },
        ],
      },
    });
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, emailId },
    });
    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

    const buffer = Buffer.from(attachment.data, 'base64');
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Get attachment error:', error);
    res.status(500).json({ error: 'Failed to get attachment' });
  }
};
