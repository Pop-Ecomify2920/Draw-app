# Email Service Setup (Resend)

The backend sends transactional emails via [Resend](https://resend.com) for:

- **Password reset** – 6-character code sent to user's email
- **Welcome** – After signup
- **Ticket purchase confirmation**
- **Winner notification** – When user wins a draw (scheduled or lobby)
- **Draw results** – When draw completes (non-winners)

## Setup

1. Create a Resend account at https://resend.com
2. Get your API key from the dashboard
3. Add to `backend/.env`:

```
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=Daily Dollar Lotto <onboarding@resend.dev>
SUPPORT_EMAIL=support@dailydollarlotto.com
```

## ⚠️ "You can only send testing emails to your own email address"

With `onboarding@resend.dev`, Resend only delivers to the **email that owns your Resend account**.

**Option A – Use the same email for testing**

1. Create a user in the app with the **same email** as your Resend account.
2. Use that email when testing forgot password, signup, etc.

**Option B – Verify a domain (recommended for production)**

1. Go to https://resend.com/domains
2. Add and verify your domain (e.g. `dailydollarlotto.com`)
3. Update `backend/.env`:

```
EMAIL_FROM=Daily Dollar Lotto <noreply@dailydollarlotto.com>
```

4. Restart the backend. You can then send to any recipient.

**Option C – Dev fallback (no real email)**

When email fails, the reset code is logged in the backend terminal:

```
Password reset code (email failed - check RESEND_API_KEY): { email: '...', code: 'ABC123' }
```

Use that code on the Reset Password screen to continue testing.

## Behavior Without API Key

If `RESEND_API_KEY` is not set, the backend still runs. Emails are not sent; a warning is logged.

## Free Tier

Resend free tier: 100 emails/day, 3,000/month.
