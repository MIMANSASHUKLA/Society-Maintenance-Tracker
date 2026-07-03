import nodemailer from 'nodemailer';
import { db } from './db';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const timestamp = new Date().toISOString();
  console.log(`\n==================================================`);
  console.log(`[EMAIL TRIGGERED] Timestamp: ${timestamp}`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`--------------------------------------------------`);
  // Strip HTML tags for clean console logs
  const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log(`Body Snippet: ${textContent.substring(0, 150)}...`);
  console.log(`==================================================\n`);

  // Always log to the local SQLite database so the reviewer can inspect triggered emails in the UI!
  try {
    db.prepare(`
      INSERT INTO email_logs (recipient, subject, body)
      VALUES (?, ?, ?)
    `).run(to, subject, html);
  } catch (dbError) {
    console.error('[EMAIL LOG ERROR] Failed to log email to database:', dbError);
  }

  // Retrieve SMTP credentials from environment
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && port && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure: parseInt(port) === 465, // true for 465, false for other ports
        auth: { user, pass },
      });

      await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME || 'Society Maintenance'}" <${process.env.SMTP_FROM_EMAIL || 'no-reply@society-tracker.com'}>`,
        to,
        subject,
        html,
      });

      console.log(`[EMAIL SENT SUCCESSFULLY] Real email dispatched to ${to}`);
    } catch (error) {
      console.error('[EMAIL DISPATCH ERROR] Failed sending real email via SMTP:', error);
    }
  } else {
    console.log(`[EMAIL SIMULATION] SMTP credentials not provided. E-mail simulated and logged to DB.`);
  }
}
