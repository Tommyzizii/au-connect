import prisma from "./prisma";
import { Resend } from "resend";
import nodemailer from "nodemailer";

// ─── Resend (production) ──────────────────────────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// ─── Config ───────────────────────────────────────────────────────────────────
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";
const IS_DEV = process.env.NODE_ENV === "development";

function createGmailTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function createNotification({
  userId,
  fromUserId,
  type,
  entityId,
}: {
  userId: string;
  fromUserId: string;
  type: "CONNECTION_REQUEST" | "CONNECTION_ACCEPTED";
  entityId?: string;
}) {
  const notification = await prisma.notification.create({
    data: { userId, fromUserId, type, entityId },
  });

  // Fire-and-forget — never block the response
  sendNotificationEmail(userId, fromUserId, type).catch((err) =>
    console.error("❌ Email notification failed:", err),
  );

  return notification;
}

// ─── Email dispatcher ─────────────────────────────────────────────────────────
async function sendNotificationEmail(
  recipientId: string,
  senderId: string,
  type: "CONNECTION_REQUEST" | "CONNECTION_ACCEPTED",
) {
  const [recipient, sender] = await Promise.all([
    prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true, username: true },
    }),
    prisma.user.findUnique({
      where: { id: senderId },
      select: { id: true, username: true },
    }),
  ]);

  if (!recipient?.email || !sender?.username) {
    console.warn("⚠️  Missing recipient email or sender username — skipping email");
    return;
  }

  const { subject, html } = buildEmailContent({
    type,
    recipientName: recipient.username || "there",
    senderName: sender.username,
    profileUrl: `${APP_URL}/profile/${sender.username}-${sender.id}`,
    notificationsUrl: `${APP_URL}/notifications`,
  });

  // Development → Gmail SMTP (sends to any address)
  if (IS_DEV) {
    const transporter = createGmailTransporter();

    if (transporter) {
      const fromAddress = process.env.GMAIL_USER;
      const result = await transporter.sendMail({
        from: `"AU Connect" <${fromAddress}>`,
        to: recipient.email,
        subject,
        html,
      });
      console.log(`✅ [DEV] Email sent via Gmail SMTP:`, result.messageId);
      return result;
    }

    // Fallback: log to console so you can see what would be sent
    console.log("─────────────────────────────────────────");
    console.log("📧 [DEV] No Gmail credentials — email preview:");
    console.log(`   To:      ${recipient.email}`);
    console.log(`   Subject: ${subject}`);
    console.log("─────────────────────────────────────────");
    return;
  }

  // Production → Resend (requires verified domain in EMAIL_FROM)
  if (!resend) {
    console.error("❌ RESEND_API_KEY not set — cannot send production email");
    return;
  }

  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to: recipient.email,
    subject,
    html,
  });

  console.log(`✅ [PROD] Email sent via Resend:`, result);
  return result;
}

// ─── Email templates ──────────────────────────────────────────────────────────
function buildEmailContent({
  type,
  recipientName,
  senderName,
  profileUrl,
  notificationsUrl,
}: {
  type: "CONNECTION_REQUEST" | "CONNECTION_ACCEPTED";
  recipientName: string;
  senderName: string;
  profileUrl: string;
  notificationsUrl: string;
}): { subject: string; html: string } {
  const base = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;
  `;

  if (type === "CONNECTION_REQUEST") {
    return {
      subject: `${senderName} sent you a connection request`,
      html: `
        <!DOCTYPE html><html><head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="${base}">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🤝 New Connection Request</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi ${recipientName},</p>
            <p style="font-size: 16px;">
              <strong>${senderName}</strong> wants to connect with you!
            </p>

            <div style="background: white; border-radius: 8px; padding: 20px;
                        margin: 25px 0; border-left: 4px solid #667eea;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                View their profile and respond to the connection request.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${profileUrl}"
                 style="display: inline-block; background: #667eea; color: white;
                        padding: 12px 30px; text-decoration: none; border-radius: 6px;
                        font-weight: 600; margin: 5px;">
                View Profile
              </a>
              <a href="${notificationsUrl}"
                 style="display: inline-block; background: white; color: #667eea;
                        padding: 12px 30px; text-decoration: none; border-radius: 6px;
                        font-weight: 600; border: 2px solid #667eea; margin: 5px;">
                See Notifications
              </a>
            </div>

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;
                      color: #666; font-size: 12px; text-align: center;">
              You're receiving this because someone sent you a connection request on AU Connect.
            </p>
          </div>
        </body></html>
      `,
    };
  }

  // CONNECTION_ACCEPTED
  return {
    subject: `${senderName} accepted your connection request`,
    html: `
      <!DOCTYPE html><html><head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="${base}">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🎉 Connection Accepted!</h1>
        </div>

        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px;">Hi ${recipientName},</p>
          <p style="font-size: 16px;">
            Great news! <strong>${senderName}</strong> accepted your connection request.
            You're now connected!
          </p>

          <div style="background: white; border-radius: 8px; padding: 20px;
                      margin: 25px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              Start engaging with their posts or send them a message.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${profileUrl}"
               style="display: inline-block; background: #10b981; color: white;
                      padding: 12px 30px; text-decoration: none; border-radius: 6px;
                      font-weight: 600; margin: 5px;">
              View Profile
            </a>
            <a href="${notificationsUrl}"
               style="display: inline-block; background: white; color: #10b981;
                      padding: 12px 30px; text-decoration: none; border-radius: 6px;
                      font-weight: 600; border: 2px solid #10b981; margin: 5px;">
              See Notifications
            </a>
          </div>

          <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;
                    color: #666; font-size: 12px; text-align: center;">
            You're receiving this because your connection request was accepted on AU Connect.
          </p>
        </div>
      </body></html>
    `,
  };
}

// ─── Client-side helpers (unchanged) ─────────────────────────────────────────
export async function fetchNotifications() {
  const res = await fetch("/api/connect/v1/notifications", {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load notifications");
  return res.json();
}

export async function markNotificationRead(id: string) {
  await fetch(`/api/connect/v1/notifications/${id}`, {
    method: "PATCH",
    credentials: "include",
  });
}

export async function fetchUnreadCount() {
  const res = await fetch("/api/connect/v1/notifications/unread-count", {
    credentials: "include",
  });
  return res.json();
}

export async function markAllNotificationsRead() {
  const res = await fetch("/api/connect/v1/notifications/mark-all-read", {
    method: "PATCH",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to mark all notifications as read");
  return res.json();
}