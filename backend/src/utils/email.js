/**
 * Email service using Resend
 * Sends transactional emails for password reset, welcome, winning tickets, etc.
 */

import { Resend } from 'resend';
import logger from '../config/logger.js';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'Daily Dollar Lotto <onboarding@resend.dev>';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@dailydollarlotto.com';

// For local testing with onboarding@resend.dev: Resend only delivers to your account email.
// Set RESEND_TEST_EMAIL to the exact email you used to sign up for Resend.
const RESEND_TEST_EMAIL = process.env.RESEND_TEST_EMAIL?.trim() || null;

function getSignature() {
  return `
Thanks from the Daily Dollar Lotto Team!
This is an automated message. Please do not reply.
For support: ${SUPPORT_EMAIL}
© ${new Date().getFullYear()} Daily Dollar Lotto. Play responsibly. 18+.
`;
}

function getHtmlSignature() {
  return `<hr style="border: none; border-top: 1px solid #FFD700; margin: 24px 0;" />
<div style="text-align: center; color: #666;">
  <p style="font-size: 12px;">Thanks from the Daily Dollar Lotto Team! For support: <a href="mailto:${SUPPORT_EMAIL}" style="color: #FFD700;">${SUPPORT_EMAIL}</a></p>
  <p style="font-size: 11px;">© ${new Date().getFullYear()} Daily Dollar Lotto. Play responsibly. 18+.</p>
</div>`;
}

/**
 * Send email - no-op if RESEND_API_KEY not configured
 */
async function sendEmail({ to, subject, html, text }) {
  if (!resend) {
    logger.warn('Email not sent (RESEND_API_KEY not configured):', { to, subject });
    return { success: true };
  }

  try {
    // When using resend.dev test sender, Resend only delivers to your account email.
    // Override "to" so local testing works.
    const recipient = (RESEND_TEST_EMAIL && FROM_EMAIL.includes('resend.dev'))
      ? RESEND_TEST_EMAIL
      : to;
    if (recipient !== to) {
      logger.info('Email redirected to RESEND_TEST_EMAIL for local testing:', { original: to, sentTo: recipient });
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject,
      html: html || text?.replace(/\n/g, '<br>'),
      text,
    });

    if (error) {
      logger.error('Email send failed:', error);
      return { success: false, error: error.message };
    }

    logger.info('Email sent:', { to: to.substring(0, 3) + '***', subject });
    return { success: true, id: data?.id };
  } catch (err) {
    logger.error('Email send error:', err);
    return { success: false, error: err.message };
  }
}

export const emailService = {
  async sendPasswordReset(to, username, code) {
    return sendEmail({
      to,
      subject: 'Reset Your Daily Dollar Lotto Password',
      text: `Hi ${username},

We received a request to reset your password.

Your reset code is: ${code}

This code expires in 1 hour.

If you didn't request this, please ignore this email.
${getSignature()}`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A1628; color: #fff; padding: 32px; border-radius: 12px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #FFD700; margin: 0;">Daily Dollar Lotto</h1>
  </div>
  <h2 style="color: #fff;">Hi ${username},</h2>
  <p>We received a request to reset your password.</p>
  <div style="background: #1E3A5F; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
    <p style="margin: 0; color: #FFD700; font-size: 12px;">Your reset code is:</p>
    <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: bold; color: #FFD700; letter-spacing: 4px;">${code}</p>
  </div>
  <p style="color: #888; font-size: 12px;">This code expires in 1 hour.</p>
  ${getHtmlSignature()}
</div>`,
    });
  },

  async sendPasswordChanged(to, username) {
    return sendEmail({
      to,
      subject: 'Your Daily Dollar Lotto Password Has Been Changed',
      text: `Hi ${username},

Your password was successfully changed. If you didn't make this change, contact ${SUPPORT_EMAIL} immediately.
${getSignature()}`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A1628; color: #fff; padding: 32px; border-radius: 12px;">
  <h2 style="color: #fff;">Hi ${username},</h2>
  <p>Your password was successfully changed. ✓</p>
  <p style="color: #888;">If you didn't make this change, contact <a href="mailto:${SUPPORT_EMAIL}" style="color: #FFD700;">${SUPPORT_EMAIL}</a> immediately.</p>
  ${getHtmlSignature()}
</div>`,
    });
  },

  async sendWelcome(to, username) {
    return sendEmail({
      to,
      subject: 'Welcome to Daily Dollar Lotto! 🎰',
      text: `Hi ${username},

Welcome to Daily Dollar Lotto! Your account is ready. Add funds and buy your first ticket for a chance to win!
${getSignature()}`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A1628; color: #fff; padding: 32px; border-radius: 12px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #FFD700; margin: 0;">Daily Dollar Lotto</h1>
  </div>
  <h2 style="color: #fff;">Hi ${username},</h2>
  <p>Welcome to Daily Dollar Lotto! 🎉 Your account is ready. Add funds and buy your first ticket!</p>
  ${getHtmlSignature()}
</div>`,
    });
  },

  async sendPurchaseConfirmation(to, username, ticketId, drawDate, prizePool) {
    return sendEmail({
      to,
      subject: `Ticket Confirmed: ${ticketId} - Good Luck! 🎟️`,
      text: `Hi ${username},

Your ticket ${ticketId} has been confirmed for the draw on ${drawDate}. Current prize pool: $${prizePool}.
Good luck!
${getSignature()}`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A1628; color: #fff; padding: 32px; border-radius: 12px;">
  <h2 style="color: #fff;">Hi ${username},</h2>
  <p>Your ticket has been confirmed! 🎉</p>
  <div style="background: #1E3A5F; padding: 20px; border-radius: 8px; margin: 24px 0;">
    <p style="margin: 0; color: #888;">Ticket:</p>
    <p style="margin: 4px 0 0 0; font-size: 18px; color: #FFD700;">${ticketId}</p>
    <p style="margin: 16px 0 0 0; color: #888;">Draw:</p>
    <p style="margin: 4px 0 0 0;">${drawDate}</p>
    <p style="margin: 16px 0 0 0; color: #888;">Prize Pool:</p>
    <p style="margin: 4px 0 0 0; font-weight: bold; color: #22C55E;">$${prizePool}</p>
  </div>
  <p style="color: #FFD700;">Good luck! 🤞</p>
  ${getHtmlSignature()}
</div>`,
    });
  },

  async sendWinnerNotification(to, username, ticketId, prizeAmount, drawDate) {
    return sendEmail({
      to,
      subject: '🎉 CONGRATULATIONS! You Won the Daily Dollar Lotto! 🎉',
      text: `Hi ${username},

YOU'RE A WINNER! Your ticket ${ticketId} won $${prizeAmount} in the ${drawDate} draw. Your winnings have been credited to your wallet!
${getSignature()}`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A1628; color: #fff; padding: 32px; border-radius: 12px;">
  <div style="text-align: center; background: linear-gradient(135deg, #FFD700, #FFA500); padding: 24px; border-radius: 12px; margin-bottom: 24px;">
    <h1 style="color: #0A1628; margin: 0;">YOU'RE A WINNER!</h1>
  </div>
  <h2 style="color: #fff;">Hi ${username},</h2>
  <p style="font-size: 18px;">🎊 INCREDIBLE NEWS! 🎊</p>
  <div style="background: #1E3A5F; padding: 20px; border-radius: 8px; margin: 24px 0; border: 2px solid #FFD700;">
    <p style="margin: 0; color: #888;">Winning Ticket:</p>
    <p style="margin: 4px 0 0 0; font-size: 18px; color: #FFD700;">${ticketId}</p>
    <p style="margin: 16px 0 0 0; color: #888;">Draw Date:</p>
    <p style="margin: 4px 0 0 0;">${drawDate}</p>
    <p style="margin: 16px 0 0 0; color: #888;">Prize Amount:</p>
    <p style="margin: 4px 0 0 0; font-size: 24px; font-weight: bold; color: #22C55E;">$${prizeAmount}</p>
  </div>
  <p>Your winnings have been credited to your wallet!</p>
  ${getHtmlSignature()}
</div>`,
    });
  },

  async sendDrawResults(to, username, ticketId, drawDate, winningTicket, prizeAmount) {
    return sendEmail({
      to,
      subject: `Draw Results for ${drawDate} - Better Luck Next Time!`,
      text: `Hi ${username},

The draw for ${drawDate} is complete. Your ticket ${ticketId} wasn't selected this time. Winning ticket: ${winningTicket}. Prize: $${prizeAmount}. Try again tomorrow!
${getSignature()}`,
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A1628; color: #fff; padding: 32px; border-radius: 12px;">
  <h2 style="color: #fff;">Hi ${username},</h2>
  <p>The draw for ${drawDate} is complete.</p>
  <div style="background: #1E3A5F; padding: 20px; border-radius: 8px; margin: 24px 0;">
    <p style="margin: 0; color: #888;">Your Ticket:</p>
    <p style="margin: 4px 0 0 0;">${ticketId}</p>
    <p style="margin: 16px 0 0 0; color: #888;">Winning Ticket:</p>
    <p style="margin: 4px 0 0 0; color: #FFD700;">${winningTicket}</p>
  </div>
  <p>Unfortunately not this time. Every ticket has an equal chance - try again tomorrow! 🍀</p>
  ${getHtmlSignature()}
</div>`,
    });
  },
};
