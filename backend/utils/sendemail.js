import nodemailer from "nodemailer";
import fetch from "node-fetch";

export const sendEmail = async (to, subject, content, isHtml = true) => {
  // ─── DUAL MODE: RESEND HTTP API (FOR RENDER FREE TIER) ────────────────────────
  if (process.env.RESEND_API_KEY) {
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `JointRight <${fromEmail}>`,
        to: [to],
        subject: subject,
        html: isHtml ? content : undefined,
        text: isHtml ? content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : content
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Resend API failed: ${errorData.message || response.statusText}`);
    }
    
    return;
  }

  // ─── DUAL MODE: STANDARD SMTP (FOR LOCALHOST DEVELOPMENT) ────────────────────
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports (like 587)
    auth: {
      user: process.env.GMAIL_USER || process.env.EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD || process.env.PASSWORD
    },
    connectionTimeout: 10000,
    socketTimeout: 10000,
    greetingTimeout: 10000
  });

  const mailOptions = {
    from: `"JointRight" <${process.env.GMAIL_USER || process.env.EMAIL}>`,
    to,
    subject,
  };

  // Add content as HTML or text based on isHtml parameter
  if (isHtml) {
    mailOptions.html = content;
    // Also provide a plain text version by stripping HTML tags
    mailOptions.text = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  } else {
    mailOptions.text = content;
  }

  await transporter.sendMail(mailOptions);
};
