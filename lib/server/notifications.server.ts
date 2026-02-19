"use server";

import prisma from "../prisma";
import { Resend } from "resend";
import nodemailer from "nodemailer";
import { NotificationType } from "@/lib/generated/prisma";
import { buildSlug } from "@/app/profile/utils/buildSlug";

// ─── Config ───────────────────────────────────────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";
const IS_DEV = process.env.NODE_ENV === "development";

// ─── Resend client (production) ───────────────────────────────────────────────
function getResendClient() {
  if (!RESEND_API_KEY) {
    console.warn("⚠️  RESEND_API_KEY not set — Resend emails disabled.");
    return null;
  }
  return new Resend(RESEND_API_KEY);
}

// ─── Gmail SMTP transporter (development) ─────────────────────────────────────
function getGmailTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn("⚠️  GMAIL_USER or GMAIL_APP_PASSWORD not set — Gmail disabled.");
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

// ─── Public: create notification + fire email ─────────────────────────────────
export async function createNotification({
  userId,
  fromUserId,
  type,
  entityId,
}: {
  userId: string;
  fromUserId: string;
  type: NotificationType;
  entityId?: string;
}) {
  const notification = await prisma.notification.create({
    data: { userId, fromUserId, type, entityId },
  });

  await sendNotificationEmail(userId, fromUserId, type);

  return notification;
}

// ─── Email dispatcher ─────────────────────────────────────────────────────────
async function sendNotificationEmail(
  recipientId: string,
  senderId: string,
  type: NotificationType,
) {
  // Only send emails for connection events
  if (type !== "CONNECTION_REQUEST" && type !== "CONNECTION_ACCEPTED") return;

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

  if (!recipient?.email) {
    console.warn("⚠️  No recipient email found — skipping.");
    return;
  }
  if (!sender?.username) {
    console.warn("⚠️  No sender username found — skipping.");
    return;
  }

  const slug = buildSlug(sender.username, sender.id);
  const { subject, html } = buildEmailContent({
    type,
    senderName: sender.username,
    profileUrl: `${APP_URL}/profile/${slug}`,
    notificationsUrl: `${APP_URL}/notifications`,
  });

  // ── Development: Gmail SMTP ──────────────────────────────────────────────
  if (IS_DEV) {
    const transporter = getGmailTransporter();

    if (!transporter) {
      // Graceful fallback: print to console so dev isn't blocked
      console.log("\n─────────────────────────────────────────────────");
      console.log("📧 [DEV] Email preview (no Gmail credentials set):");
      console.log(`   To:      ${recipient.email}`);
      console.log(`   Subject: ${subject}`);
      console.log("─────────────────────────────────────────────────\n");
      return;
    }

    const result = await transporter.sendMail({
      from: `"AU Connect" <${process.env.GMAIL_USER}>`,
      to: recipient.email,
      subject,
      html,
    });

    console.log(`✅ [DEV] Email sent via Gmail SMTP → ${recipient.email} | messageId: ${result.messageId}`);
    return;
  }

  // ── Production: Resend ───────────────────────────────────────────────────
  const resend = getResendClient();
  if (!resend) return;

  const result = await resend.emails.send({
    from: EMAIL_FROM,
    to: recipient.email,
    subject,
    html,
  });

  console.log(`✅ [PROD] Email sent via Resend → ${recipient.email}`, result);
}

// ─── Email templates ──────────────────────────────────────────────────────────
function buildEmailContent({
  type,
  senderName,
  profileUrl,
  notificationsUrl,
}: {
  type: "CONNECTION_REQUEST" | "CONNECTION_ACCEPTED";
  senderName: string;
  profileUrl: string;
  notificationsUrl: string;
}): { subject: string; html: string } {
  if (type === "CONNECTION_REQUEST") {
    return {
      subject: `${senderName} sent you a connection request`,
      html: `
        <div style="font-family: Arial, sans-serif; background:#f4f6fb; padding:40px 0;">
          <div style="max-width:520px; margin:0 auto; background:white; border-radius:12px;
                      overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.08);">
            <div style="background: linear-gradient(90deg, #4f46e5, #7c3aed); padding:20px; text-align:center;">
              <h2 style="color:white; margin:0;">🤝 New Connection Request</h2>
            </div>
            <div style="padding:30px; text-align:center;">
              <p style="font-size:16px; color:#333;">
                <strong>${senderName}</strong> wants to connect with you.
              </p>
              <p style="font-size:14px; color:#666; margin-bottom:25px;">
                View their profile and respond to the connection request.
              </p>
              <div style="margin-bottom:25px;">
                <a href="${profileUrl}"
                   style="display:inline-block; padding:12px 24px; background:#4f46e5;
                          color:white; text-decoration:none; border-radius:8px;
                          font-weight:bold; margin-right:10px;">
                  View Profile
                </a>
                <a href="${notificationsUrl}"
                   style="display:inline-block; padding:12px 24px; border:2px solid #4f46e5;
                          color:#4f46e5; text-decoration:none; border-radius:8px; font-weight:bold;">
                  See Notifications
                </a>
              </div>
              <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />
              <p style="font-size:12px; color:#999;">
                You're receiving this because someone sent you a connection request on AU Connect.
              </p>
            </div>
          </div>
        </div>
      `,
    };
  }

  // CONNECTION_ACCEPTED
  return {
    subject: `${senderName} accepted your connection request`,
    html: `
      <div style="font-family: Arial, sans-serif; background:#f4f6fb; padding:40px 0;">
        <div style="max-width:520px; margin:0 auto; background:white; border-radius:12px;
                    overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(90deg, #10b981, #059669); padding:20px; text-align:center;">
            <h2 style="color:white; margin:0;">🎉 Connection Accepted</h2>
          </div>
          <div style="padding:30px; text-align:center;">
            <p style="font-size:16px; color:#333;">
              <strong>${senderName}</strong> accepted your connection request.
            </p>
            <div style="margin:25px 0;">
              <a href="${profileUrl}"
                 style="display:inline-block; padding:12px 24px; background:#10b981;
                        color:white; text-decoration:none; border-radius:8px; font-weight:bold;">
                View Profile
              </a>
            </div>
            <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />
            <p style="font-size:12px; color:#999;">
              You're receiving this because someone accepted your connection request on AU Connect.
            </p>
          </div>
        </div>
      </div>
    `,
  };
}