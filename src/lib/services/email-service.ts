// Automated Email Service for Daily Dollar Lotto
// Sends emails in background via API - no user interaction required

// Email configuration
const EMAIL_CONFIG = {
  senderName: 'Daily Dollar Lotto',
  senderEmail: 'noreply@dailydollarlotto.com',
  supportEmail: 'support@dailydollarlotto.com',
  // API endpoint for sending emails (configure in ENV tab)
  apiEndpoint: process.env.EXPO_PUBLIC_EMAIL_API_URL || 'https://api.dailydollarlotto.com/email/send',
  apiKey: process.env.EXPO_PUBLIC_EMAIL_API_KEY || '',
};

// Email templates
interface EmailTemplate {
  subject: string;
  body: string;
  html?: string;
}

// Generate email signature
const getSignature = (): string => {
  return `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thanks from the Daily Dollar Lotto Team!

This is an automated message from Daily Dollar Lotto.
Please do not reply directly to this email.

For support, contact us at: ${EMAIL_CONFIG.supportEmail}

© ${new Date().getFullYear()} Daily Dollar Lotto. All rights reserved.
Play responsibly. Must be 18+ to participate.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
};

// Generate HTML signature
const getHtmlSignature = (): string => {
  return `
    <hr style="border: none; border-top: 1px solid #FFD700; margin: 24px 0;" />
    <div style="text-align: center; color: #666;">
      <p style="font-size: 16px; color: #FFD700; font-weight: bold;">Thanks from the Daily Dollar Lotto Team! 🎰</p>
      <p style="font-size: 12px; margin-top: 16px;">
        This is an automated message from Daily Dollar Lotto.<br/>
        Please do not reply directly to this email.
      </p>
      <p style="font-size: 12px;">
        For support, contact us at: <a href="mailto:${EMAIL_CONFIG.supportEmail}" style="color: #FFD700;">${EMAIL_CONFIG.supportEmail}</a>
      </p>
      <p style="font-size: 11px; color: #888; margin-top: 16px;">
        © ${new Date().getFullYear()} Daily Dollar Lotto. All rights reserved.<br/>
        Play responsibly. Must be 18+ to participate.
      </p>
    </div>
  `;
};

// Email Templates
export const EmailTemplates = {
  // Account Verification Email
  accountVerification: (username: string, verificationCode: string): EmailTemplate => ({
    subject: 'Verify Your Daily Dollar Lotto Account',
    body: `Hi ${username},

Welcome to Daily Dollar Lotto!

Thank you for creating an account with us. To complete your registration and start playing, please verify your email address.

Your verification code is: ${verificationCode}

This code will expire in 24 hours.

If you didn't create an account with Daily Dollar Lotto, please ignore this email.
${getSignature()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A1628; color: #fff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #FFD700; margin: 0;">Daily Dollar Lotto</h1>
        </div>
        <h2 style="color: #fff;">Hi ${username},</h2>
        <p>Welcome to Daily Dollar Lotto! 🎉</p>
        <p>Thank you for creating an account with us. To complete your registration and start playing, please verify your email address.</p>
        <div style="background: #1E3A5F; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <p style="margin: 0; color: #FFD700; font-size: 12px;">Your verification code is:</p>
          <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: bold; color: #FFD700; letter-spacing: 4px;">${verificationCode}</p>
        </div>
        <p style="color: #888; font-size: 12px;">This code will expire in 24 hours.</p>
        ${getHtmlSignature()}
      </div>
    `,
  }),

  // Welcome Email
  welcomeEmail: (username: string): EmailTemplate => ({
    subject: 'Welcome to Daily Dollar Lotto! 🎰',
    body: `Hi ${username},

Your account has been verified! Welcome to the Daily Dollar Lotto family!

Here's how it works:
• Buy ONE $1 ticket per day
• Wait for the daily draw at midnight UTC
• One lucky winner takes the entire pot!

You have a maximum of 365 tickets per year to promote responsible play.

Ready to try your luck? Open the app and buy your first ticket today!

Good luck!
${getSignature()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A1628; color: #fff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #FFD700; margin: 0;">Daily Dollar Lotto</h1>
        </div>
        <h2 style="color: #fff;">Hi ${username},</h2>
        <p>Your account has been verified! Welcome to the Daily Dollar Lotto family! 🎊</p>
        <div style="background: #1E3A5F; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="color: #FFD700; margin-top: 0;">Here's how it works:</h3>
          <ul style="color: #fff;">
            <li>Buy ONE $1 ticket per day</li>
            <li>Wait for the daily draw at midnight UTC</li>
            <li>One lucky winner takes the entire pot!</li>
          </ul>
        </div>
        <p>You have a maximum of 365 tickets per year to promote responsible play.</p>
        <p style="color: #FFD700;">Ready to try your luck? Open the app and buy your first ticket today!</p>
        <p>Good luck! 🍀</p>
        ${getHtmlSignature()}
      </div>
    `,
  }),

  // Password Reset Email
  passwordReset: (username: string, resetCode: string): EmailTemplate => ({
    subject: 'Reset Your Daily Dollar Lotto Password',
    body: `Hi ${username},

We received a request to reset your password for your Daily Dollar Lotto account.

Your password reset code is: ${resetCode}

This code will expire in 1 hour for security reasons.

If you didn't request a password reset, please ignore this email.
${getSignature()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A1628; color: #fff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #FFD700; margin: 0;">Daily Dollar Lotto</h1>
        </div>
        <h2 style="color: #fff;">Hi ${username},</h2>
        <p>We received a request to reset your password for your Daily Dollar Lotto account.</p>
        <div style="background: #1E3A5F; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <p style="margin: 0; color: #FFD700; font-size: 12px;">Your password reset code is:</p>
          <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: bold; color: #FFD700; letter-spacing: 4px;">${resetCode}</p>
        </div>
        <p style="color: #888; font-size: 12px;">This code will expire in 1 hour for security reasons.</p>
        <p style="color: #888; font-size: 12px;">If you didn't request a password reset, please ignore this email.</p>
        ${getHtmlSignature()}
      </div>
    `,
  }),

  // Password Changed Confirmation
  passwordChanged: (username: string): EmailTemplate => ({
    subject: 'Your Daily Dollar Lotto Password Has Been Changed',
    body: `Hi ${username},

This is a confirmation that your Daily Dollar Lotto password was successfully changed.

If you made this change, no further action is required.

If you did NOT change your password, please contact our support team immediately at ${EMAIL_CONFIG.supportEmail}.
${getSignature()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A1628; color: #fff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #FFD700; margin: 0;">Daily Dollar Lotto</h1>
        </div>
        <h2 style="color: #fff;">Hi ${username},</h2>
        <p>This is a confirmation that your Daily Dollar Lotto password was successfully changed. ✓</p>
        <p>If you made this change, no further action is required.</p>
        <div style="background: #EF4444; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0; color: #fff;">If you did NOT change your password, please contact our support team immediately.</p>
        </div>
        ${getHtmlSignature()}
      </div>
    `,
  }),

  // Ticket Purchase Confirmation
  purchaseConfirmation: (
    username: string,
    ticketId: string,
    purchaseDate: string,
    drawDate: string,
    prizePool: string
  ): EmailTemplate => ({
    subject: `Ticket Confirmed: ${ticketId} - Good Luck! 🎟️`,
    body: `Hi ${username},

Great news! Your ticket purchase has been confirmed!

TICKET DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━
Ticket ID: ${ticketId}
Purchase Date: ${purchaseDate}
Draw Date: ${drawDate}
Current Prize Pool: ${prizePool}
━━━━━━━━━━━━━━━━━━━━━━━━

Your ticket has been entered into today's draw. The winner will be selected at midnight UTC.

Good luck!
${getSignature()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A1628; color: #fff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #FFD700; margin: 0;">Daily Dollar Lotto</h1>
        </div>
        <h2 style="color: #fff;">Hi ${username},</h2>
        <p>Great news! Your ticket purchase has been confirmed! 🎉</p>
        <div style="background: #1E3A5F; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="color: #FFD700; margin-top: 0; border-bottom: 1px solid #FFD700; padding-bottom: 8px;">TICKET DETAILS</h3>
          <table style="width: 100%; color: #fff;">
            <tr><td style="padding: 8px 0; color: #888;">Ticket ID:</td><td style="padding: 8px 0; font-weight: bold; color: #FFD700;">${ticketId}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Purchase Date:</td><td style="padding: 8px 0;">${purchaseDate}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Draw Date:</td><td style="padding: 8px 0;">${drawDate}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Prize Pool:</td><td style="padding: 8px 0; font-weight: bold; color: #22C55E;">${prizePool}</td></tr>
          </table>
        </div>
        <p>Your ticket has been entered into today's draw. The winner will be selected at midnight UTC.</p>
        <p style="color: #FFD700;">Keep your fingers crossed! 🤞</p>
        ${getHtmlSignature()}
      </div>
    `,
  }),

  // Winner Notification Email
  winnerNotification: (
    username: string,
    ticketId: string,
    prizeAmount: string,
    drawDate: string
  ): EmailTemplate => ({
    subject: '🎉 CONGRATULATIONS! You Won the Daily Dollar Lotto! 🎉',
    body: `Hi ${username},

🎊 INCREDIBLE NEWS! YOU'RE A WINNER! 🎊

WINNING DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━
Winning Ticket: ${ticketId}
Draw Date: ${drawDate}
Prize Amount: ${prizeAmount}
━━━━━━━━━━━━━━━━━━━━━━━━

CONGRATULATIONS! Your ticket was selected as the winner in the Daily Dollar Lotto draw!

Your winnings of ${prizeAmount} have been automatically credited to your wallet balance.

To withdraw your winnings:
1. Open the Daily Dollar Lotto app
2. Go to Profile > Wallet
3. Select "Withdraw" and choose your preferred method

Celebrate responsibly!
${getSignature()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A1628; color: #fff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #FFD700; margin: 0;">🎉 Daily Dollar Lotto 🎉</h1>
        </div>
        <div style="text-align: center; background: linear-gradient(135deg, #FFD700, #FFA500); padding: 24px; border-radius: 12px; margin-bottom: 24px;">
          <h1 style="color: #0A1628; margin: 0;">YOU'RE A WINNER!</h1>
        </div>
        <h2 style="color: #fff;">Hi ${username},</h2>
        <p style="font-size: 18px;">🎊 INCREDIBLE NEWS! 🎊</p>
        <div style="background: #1E3A5F; padding: 20px; border-radius: 8px; margin: 24px 0; border: 2px solid #FFD700;">
          <h3 style="color: #FFD700; margin-top: 0;">🏆 WINNING DETAILS</h3>
          <table style="width: 100%; color: #fff;">
            <tr><td style="padding: 8px 0; color: #888;">Winning Ticket:</td><td style="padding: 8px 0; font-weight: bold; color: #FFD700;">${ticketId}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Draw Date:</td><td style="padding: 8px 0;">${drawDate}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Prize Amount:</td><td style="padding: 8px 0; font-size: 24px; font-weight: bold; color: #22C55E;">${prizeAmount}</td></tr>
          </table>
        </div>
        <p>Your winnings have been automatically credited to your wallet balance!</p>
        <p style="color: #FFD700;">Celebrate responsibly! 🎉</p>
        ${getHtmlSignature()}
      </div>
    `,
  }),

  // Draw Results (Non-Winner)
  drawResults: (
    username: string,
    ticketId: string,
    drawDate: string,
    winningTicket: string,
    prizeAmount: string
  ): EmailTemplate => ({
    subject: `Draw Results for ${drawDate} - Better Luck Next Time!`,
    body: `Hi ${username},

The Daily Dollar Lotto draw for ${drawDate} has been completed.

DRAW RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━
Your Ticket: ${ticketId}
Winning Ticket: ${winningTicket}
Prize Amount: ${prizeAmount}
━━━━━━━━━━━━━━━━━━━━━━━━

Unfortunately, your ticket wasn't selected this time. But don't give up!

Remember: Every ticket has an equal chance of winning. Try again tomorrow!

Good luck!
${getSignature()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A1628; color: #fff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #FFD700; margin: 0;">Daily Dollar Lotto</h1>
        </div>
        <h2 style="color: #fff;">Hi ${username},</h2>
        <p>The Daily Dollar Lotto draw for ${drawDate} has been completed.</p>
        <div style="background: #1E3A5F; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="color: #FFD700; margin-top: 0;">DRAW RESULTS</h3>
          <table style="width: 100%; color: #fff;">
            <tr><td style="padding: 8px 0; color: #888;">Your Ticket:</td><td style="padding: 8px 0;">${ticketId}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Winning Ticket:</td><td style="padding: 8px 0; color: #FFD700;">${winningTicket}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Prize Amount:</td><td style="padding: 8px 0; color: #22C55E;">${prizeAmount}</td></tr>
          </table>
        </div>
        <p>Unfortunately, your ticket wasn't selected this time. But don't give up!</p>
        <p style="color: #FFD700;">Every ticket has an equal chance of winning. Try again tomorrow! 🍀</p>
        ${getHtmlSignature()}
      </div>
    `,
  }),

  // Funds Added Confirmation
  fundsAdded: (
    username: string,
    amount: string,
    newBalance: string,
    transactionId: string
  ): EmailTemplate => ({
    subject: `Funds Added: ${amount} - Transaction Confirmed`,
    body: `Hi ${username},

Your wallet has been topped up successfully!

TRANSACTION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━
Amount Added: ${amount}
Transaction ID: ${transactionId}
New Balance: ${newBalance}
Date: ${new Date().toLocaleDateString()}
━━━━━━━━━━━━━━━━━━━━━━━━

Your funds are now available to purchase tickets. Good luck in your next draw!

If you didn't make this transaction, please contact our support team immediately.
${getSignature()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A1628; color: #fff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #FFD700; margin: 0;">Daily Dollar Lotto</h1>
        </div>
        <h2 style="color: #fff;">Hi ${username},</h2>
        <p>Your wallet has been topped up successfully! 💰</p>
        <div style="background: #1E3A5F; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="color: #FFD700; margin-top: 0;">TRANSACTION DETAILS</h3>
          <table style="width: 100%; color: #fff;">
            <tr><td style="padding: 8px 0; color: #888;">Amount Added:</td><td style="padding: 8px 0; font-weight: bold; color: #22C55E;">${amount}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Transaction ID:</td><td style="padding: 8px 0;">${transactionId}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">New Balance:</td><td style="padding: 8px 0; font-weight: bold; color: #FFD700;">${newBalance}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Date:</td><td style="padding: 8px 0;">${new Date().toLocaleDateString()}</td></tr>
          </table>
        </div>
        <p>Your funds are now available to purchase tickets. Good luck! 🍀</p>
        ${getHtmlSignature()}
      </div>
    `,
  }),

  // Self-Exclusion Confirmation
  selfExclusionConfirmation: (
    username: string,
    period: string,
    endDate: string
  ): EmailTemplate => ({
    subject: 'Self-Exclusion Activated - Daily Dollar Lotto',
    body: `Hi ${username},

This email confirms that you have activated self-exclusion on your Daily Dollar Lotto account.

SELF-EXCLUSION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━
Exclusion Period: ${period}
End Date: ${endDate}
━━━━━━━━━━━━━━━━━━━━━━━━

During this period, you will not be able to:
• Purchase lottery tickets
• Access certain features of the app

This decision cannot be reversed early. We respect your choice to take a break.

If you need support:
• National Problem Gambling Helpline: 1-800-522-4700
• www.ncpgambling.org

Take care of yourself.
${getSignature()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0A1628; color: #fff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #FFD700; margin: 0;">Daily Dollar Lotto</h1>
        </div>
        <h2 style="color: #fff;">Hi ${username},</h2>
        <p>This email confirms that you have activated self-exclusion on your account.</p>
        <div style="background: #1E3A5F; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <h3 style="color: #FFD700; margin-top: 0;">SELF-EXCLUSION DETAILS</h3>
          <table style="width: 100%; color: #fff;">
            <tr><td style="padding: 8px 0; color: #888;">Exclusion Period:</td><td style="padding: 8px 0; font-weight: bold;">${period}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">End Date:</td><td style="padding: 8px 0;">${endDate}</td></tr>
          </table>
        </div>
        <p>During this period, you will not be able to purchase lottery tickets.</p>
        <div style="background: #22C55E20; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #22C55E;">
          <p style="margin: 0; color: #22C55E;">We respect your choice to take a break. Take care of yourself. 💚</p>
        </div>
        ${getHtmlSignature()}
      </div>
    `,
  }),
};

// Background Email Service - sends via API automatically
export const EmailService = {
  // Send email via backend API (runs in background, no user interaction)
  sendEmail: async (
    to: string,
    template: EmailTemplate
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log(`[EmailService] 📧 Sending automated email to ${to}`);
      console.log(`[EmailService] Subject: ${template.subject}`);

      // In production, this would call your email API (SendGrid, Resend, etc.)
      // For now, we simulate the API call and log the email
      const emailPayload = {
        to,
        from: {
          name: EMAIL_CONFIG.senderName,
          email: EMAIL_CONFIG.senderEmail,
        },
        subject: template.subject,
        text: template.body,
        html: template.html,
      };

      // If API endpoint is configured, send via API
      if (EMAIL_CONFIG.apiKey && EMAIL_CONFIG.apiEndpoint) {
        const response = await fetch(EMAIL_CONFIG.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${EMAIL_CONFIG.apiKey}`,
          },
          body: JSON.stringify(emailPayload),
        });

        if (!response.ok) {
          throw new Error(`Email API error: ${response.status}`);
        }

        console.log(`[EmailService] ✅ Email sent successfully via API`);
        return { success: true };
      }

      // Demo mode - log email details (simulates successful send)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📧 AUTOMATED EMAIL SENT (Demo Mode)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`From: ${EMAIL_CONFIG.senderName} <${EMAIL_CONFIG.senderEmail}>`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${template.subject}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Simulate network delay for realism
      await new Promise(resolve => setTimeout(resolve, 100));

      return { success: true };
    } catch (error) {
      console.error('[EmailService] ❌ Email send error:', error);
      // Don't throw - emails should fail silently in background
      return { success: false, error: 'Failed to send email' };
    }
  },

  // Convenience methods - all run automatically in background
  sendVerificationEmail: async (email: string, username: string) => {
    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const template = EmailTemplates.accountVerification(username, verificationCode);
    return EmailService.sendEmail(email, template);
  },

  sendWelcomeEmail: async (email: string, username: string) => {
    const template = EmailTemplates.welcomeEmail(username);
    return EmailService.sendEmail(email, template);
  },

  sendPasswordResetEmail: async (email: string, username: string) => {
    const resetCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const template = EmailTemplates.passwordReset(username, resetCode);
    return EmailService.sendEmail(email, template);
  },

  sendPasswordChangedEmail: async (email: string, username: string) => {
    const template = EmailTemplates.passwordChanged(username);
    return EmailService.sendEmail(email, template);
  },

  sendPurchaseConfirmation: async (
    email: string,
    username: string,
    ticketId: string,
    prizePool: number
  ) => {
    const now = new Date();
    const template = EmailTemplates.purchaseConfirmation(
      username,
      ticketId,
      now.toLocaleString(),
      now.toLocaleDateString(),
      `$${prizePool.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    );
    return EmailService.sendEmail(email, template);
  },

  sendWinnerNotification: async (
    email: string,
    username: string,
    ticketId: string,
    prizeAmount: number
  ) => {
    const template = EmailTemplates.winnerNotification(
      username,
      ticketId,
      `$${prizeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      new Date().toLocaleDateString()
    );
    return EmailService.sendEmail(email, template);
  },

  sendDrawResults: async (
    email: string,
    username: string,
    ticketId: string,
    winningTicket: string,
    prizeAmount: number
  ) => {
    const template = EmailTemplates.drawResults(
      username,
      ticketId,
      new Date().toLocaleDateString(),
      winningTicket,
      `$${prizeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    );
    return EmailService.sendEmail(email, template);
  },

  sendFundsAddedConfirmation: async (
    email: string,
    username: string,
    amount: number,
    newBalance: number
  ) => {
    const transactionId = 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const template = EmailTemplates.fundsAdded(
      username,
      `$${amount.toFixed(2)}`,
      `$${newBalance.toFixed(2)}`,
      transactionId
    );
    return EmailService.sendEmail(email, template);
  },

  sendSelfExclusionConfirmation: async (
    email: string,
    username: string,
    period: string,
    endDate: Date
  ) => {
    const template = EmailTemplates.selfExclusionConfirmation(
      username,
      period,
      endDate.toLocaleDateString()
    );
    return EmailService.sendEmail(email, template);
  },
};

export default EmailService;
