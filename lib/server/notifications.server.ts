"use server";

import prisma from "../prisma";
import sgMail from "@sendgrid/mail";
import { ActorType, NotificationType } from "@/lib/generated/prisma";
import { buildSlug } from "@/app/(main)/profile/utils/buildSlug";
import { getAppUrl } from "@/lib/server/appUrl";

// ─── SendGrid client (used in both dev + production) ──────────────────────────
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const EMAIL_FROM = process.env.EMAIL_FROM;

// ─── Public: create notification + fire email ─────────────────────────────────
export async function createNotification({
  userId,
  fromUserId,
  recipientActorType = "USER",
  recipientCommunityId,
  fromActorType = "USER",
  fromCommunityId,
  type,
  entityId,
}: {
  userId: string;
  fromUserId: string;
  recipientActorType?: ActorType;
  recipientCommunityId?: string | null;
  fromActorType?: ActorType;
  fromCommunityId?: string | null;
  type: NotificationType;
  entityId?: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId,
      fromUserId,
      recipientActorType,
      recipientCommunityId: recipientCommunityId ?? null,
      fromActorType,
      fromCommunityId: fromCommunityId ?? null,
      type,
      entityId,
    },
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
  if (type !== "CONNECTION_REQUEST" && type !== "CONNECTION_ACCEPTED")
    return;

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
    console.warn("⚠️ No recipient email found — skipping.");
    return;
  }

  if (!sender?.username) {
    console.warn("⚠️ No sender username found — skipping.");
    return;
  }

  const slug = buildSlug(sender.username, sender.id);
  const appUrl = getAppUrl();

  const { subject, html } = buildEmailContent({
    type,
    senderName: sender.username,
    profileUrl: `${appUrl}/profile/${slug}`,
    notificationsUrl: `${appUrl}/notifications`,
  });

  if (!process.env.SENDGRID_API_KEY || !EMAIL_FROM) {
    console.error("❌ SENDGRID_API_KEY or EMAIL_FROM not set — cannot send email.");
    return;
  }

  try {
    const [result] = await sgMail.send({
      from: { email: EMAIL_FROM, name: "AU Connect" },
      to: recipient.email,
      subject,
      html,
    });

    console.log(
      `✅ Email sent via SendGrid → ${recipient.email} | status: ${result.statusCode}`
    );
  } catch (error) {
    console.error("❌ Email sending failed:", error);
  }
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
