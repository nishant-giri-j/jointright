import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, content, isHtml = true) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER || process.env.EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD || process.env.PASSWORD
    },
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
