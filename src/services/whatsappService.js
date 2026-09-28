import axios from "axios";

export const sendWhatsAppMessage = async ({ mobile, message }) => {
  try {
    if (!mobile) {
      throw new Error("Mobile number is required");
    }

    if (!message) {
      throw new Error("WhatsApp message is required");
    }

    // Keep digits only
    let formattedMobile = String(mobile).replace(/\D/g, "");

    // If your provider expects 10-digit Indian numbers,
    // keep this. Otherwise adjust according to provider requirements.
    if (formattedMobile.startsWith("91") && formattedMobile.length === 12) {
      formattedMobile = formattedMobile.slice(2);
    }

    if (formattedMobile.length !== 10) {
      throw new Error(`Invalid mobile number: ${mobile}`);
    }

    const response = await axios.get(process.env.WHATSAPP_API_URL, {
      params: {
        apikey: process.env.WHATSAPP_API_KEY,
        mobile: formattedMobile,
        msg: message,
      },
      timeout: 10000,
    });

    console.log("WhatsApp API response:", {
      mobile: formattedMobile,
      data: response.data,
    });

    if (response.data?.status === "error") {
      throw new Error(
        response.data?.msg || "WhatsApp provider returned an error",
      );
    }

    return response.data;
  } catch (error) {
    console.error(
      "Send WhatsApp message failed:",
      error.response?.data || error.message,
    );

    throw error;
  }
};