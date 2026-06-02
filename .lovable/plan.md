## Goal
Add a contact/support form to the video generator site that sends an email when a visitor submits it, using Lovable's built-in email infrastructure (no third-party API key needed).

## What you'll get
- A "Contact" section/page with fields: Name, Email, Message
- On submit:
  - Submission saved to the database (so nothing is lost)
  - Confirmation email sent to the visitor ("Thanks, we got your message")
  - Notification email sent to you (the site owner) with the submission details
- A branded `/unsubscribe` page (required by the email system)

## Steps
1. Enable Lovable Cloud (needed for database + email queue)
2. Set up your sender email domain (one-click flow; uses `notify.<yourdomain>` or a Lovable default)
3. Provision email infrastructure (queues, suppression list, cron dispatcher)
4. Scaffold transactional email server routes + two React Email templates:
   - `contact-confirmation` → sent to visitor
   - `contact-notification` → sent to you
5. Create `contact_submissions` table with RLS (public insert allowed, read restricted)
6. Add a public server route `/api/public/contact` that validates input (Zod), inserts the row, and triggers both emails
7. Add a Contact form UI on the homepage (matches the existing dark/neon design)
8. Add `/unsubscribe` page

## One thing I need from you
What email address should receive the contact notifications? (e.g. your personal/business inbox)

If you don't specify, I'll use a placeholder you can edit later.
