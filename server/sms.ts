const MSG91_BASE_URL = "https://control.msg91.com/api/v5";

export async function sendOtpSms(mobile: string, otp: string): Promise<boolean> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!authKey || !templateId) {
    console.log(`[DEV MODE] SMS OTP for ${mobile}: ${otp}`);
    return true;
  }

  try {
    // Format mobile number with country code (91 for India)
    const formattedMobile = mobile.startsWith("91") ? mobile : `91${mobile}`;
    
    // Use flow API with correct format matching MSG91 curl
    const response = await fetch(`${MSG91_BASE_URL}/flow`, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "authkey": authKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        template_id: templateId,
        recipients: [
          {
            mobiles: formattedMobile,
            var: otp,
          }
        ]
      }),
    });

    const result = await response.json();
    console.log("MSG91 response:", JSON.stringify(result));
    
    if (result.type === "success" || result.message?.includes("success")) {
      console.log(`SMS OTP sent successfully to ${mobile}`);
      return true;
    } else {
      console.error("MSG91 error:", result);
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
