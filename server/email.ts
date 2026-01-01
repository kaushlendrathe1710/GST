import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: `"Tax Buddy" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Tax Buddy Login OTP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Tax Buddy - One Time Password</h2>
          <p>Your OTP for login is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px;">
            <h1 style="color: #1f2937; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #6b7280; margin-top: 20px;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
          <p style="color: #9ca3af; font-size: 12px;">If you didn't request this OTP, please ignore this email.</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send OTP email:", error);
    return false;
  }
}

export async function sendAlertEmail(
  email: string,
  subject: string,
  title: string,
  message: string
): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`[DEV MODE] Alert email to ${email}: ${subject} - ${message}`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: `"Tax Buddy" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Tax Buddy: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Tax Buddy Alert</h2>
          <h3 style="color: #1f2937;">${title}</h3>
          <p style="color: #4b5563;">${message}</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">This is an automated message from Tax Buddy.</p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("Failed to send alert email:", error);
    return false;
  }
}
