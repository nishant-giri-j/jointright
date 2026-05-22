import nodemailer from "nodemailer";
import fetch from "node-fetch";

export const sendEmail = async (to, subject, content, isHtml = true) => {
  // ─── TRIPLE MODE: BREVO HTTP API (REAL EMAILS TO ANYONE - NO DOMAIN NEEDED) ────
  if (process.env.BREVO_API_KEY) {
    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'giri.nishant2005@gmail.com';
    
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: "JointRight",
          email: senderEmail
        },
        to: [{ email: to }],
        subject: subject,
        htmlContent: isHtml ? content : undefined,
        textContent: isHtml ? content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : content
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Brevo API failed: ${errorData.message || response.statusText}`);
    }
    
    return;
  }

  // ─── TRIPLE MODE: RESEND HTTP API (FOR RENDER FREE TIER) ────────────────────────
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

  // ─── TRIPLE MODE: STANDARD SMTP (FOR LOCALHOST DEVELOPMENT) ────────────────────
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
