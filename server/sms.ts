const MSG91_BASE_URL = "https://api.msg91.com/api/v5";

export async function sendOtpSms(mobile: string, otp: string): Promise<boolean> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const senderId = process.env.MSG91_SENDER_ID;

  if (!authKey || !templateId) {
    console.log(`[DEV MODE] SMS OTP for ${mobile}: ${otp}`);
    return true;
  }

  try {
    const formattedMobile = mobile.startsWith("91") ? mobile : `91${mobile}`;
    
    const response = await fetch(`${MSG91_BASE_URL}/otp`, {
      method: "POST",
      headers: {
        "authkey": authKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobile: formattedMobile,
        template_id: templateId,
        sender: senderId,
        otp: otp,
        otp_length: 6,
        otp_expiry: 10,
      }),
    });

    const result = await response.json();
    
    if (result.type === "success") {
      console.log(`SMS OTP sent successfully to ${mobile}`);
      return true;
    } else {
      console.error("MSG91 error:", result);
      return false;
    }
  } catch (error) {
    console.error("Failed to send SMS OTP:", error);
    return false;
  }
}

export async function verifyOtpSms(mobile: string, otp: string): Promise<boolean> {
  const authKey = process.env.MSG91_AUTH_KEY;

  if (!authKey) {
    return true;
  }

  try {
    const formattedMobile = mobile.startsWith("91") ? mobile : `91${mobile}`;
    
    const response = await fetch(
      `${MSG91_BASE_URL}/otp/verify?mobile=${formattedMobile}&otp=${otp}`,
      {
        method: "POST",
        headers: {
          "authkey": authKey,
        },
      }
    );

    const result = await response.json();
    return result.type === "success";
  } catch (error) {
    console.error("Failed to verify SMS OTP:", error);
    return false;
  }
}
