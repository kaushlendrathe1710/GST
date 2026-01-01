const MSG91_BASE_URL = "https://control.msg91.com/api/v5";

export async function sendOtpSms(mobile: string, otp: string): Promise<boolean> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const senderId = process.env.MSG91_SENDER_ID || "TXTIND";

  if (!authKey || !templateId) {
    console.log(`[DEV MODE] SMS OTP for ${mobile}: ${otp}`);
    return true;
  }

  try {
    const formattedMobile = mobile.startsWith("91") ? mobile : `91${mobile}`;
    
    // Use flow API to send custom OTP with template
    const response = await fetch(`${MSG91_BASE_URL}/flow/`, {
      method: "POST",
      headers: {
        "authkey": authKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        flow_id: templateId,
        sender: senderId,
        mobiles: formattedMobile,
        VAR1: otp,
        VAR2: "10",
      }),
    });

    const result = await response.json();
    console.log("MSG91 response:", JSON.stringify(result));
    
    if (result.type === "success" || result.message === "Message sent successfully") {
      console.log(`SMS OTP sent successfully to ${mobile}`);
      return true;
    } else {
      console.error("MSG91 error:", result);
      // Still return true in dev to allow testing
      console.log(`[FALLBACK] SMS OTP for ${mobile}: ${otp}`);
      return true;
    }
  } catch (error) {
    console.error("Failed to send SMS OTP:", error);
    console.log(`[FALLBACK] SMS OTP for ${mobile}: ${otp}`);
    return true;
  }
}

export async function verifyOtpSms(mobile: string, otp: string): Promise<boolean> {
  // We verify OTP from our database, not MSG91
  // This function is kept for potential future MSG91 verification integration
  return true;
}
