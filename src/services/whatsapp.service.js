import axios from "axios";

const {
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_API_VERSION,
} = process.env;

const whatsappApi = axios.create({
  baseURL: `https://graph.facebook.com/${WHATSAPP_API_VERSION}`,
  headers: {
    Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
});

const normalizePhoneNumber = (phone) => {
  if (!phone) return null;

  let value = String(phone).replace(/\D/g, "");

  /*
   * Example for India:
   * 9876543210 -> 919876543210
   */
  if (value.length === 10) {
    value = `91${value}`;
  }

  return value;
};

export const sendWhatsAppTemplate = async ({
  phone,
  templateName,
  languageCode = "en",
  parameters = [],
}) => {
  const to = normalizePhoneNumber(phone);

  if (!to) {
    throw new Error("WhatsApp phone number is missing");
  }

  const components = [];

  if (parameters.length) {
    components.push({
      type: "body",

      parameters: parameters.map((value) => ({
        type: "text",
        text: String(value ?? ""),
      })),
    });
  }

  const response = await whatsappApi.post(
    `/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",

      to,

      type: "template",

      template: {
        name: templateName,

        language: {
          code: languageCode,
        },

        components,
      },
    },
  );

  return response.data;
};