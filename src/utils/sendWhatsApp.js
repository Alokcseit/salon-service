// salon-service/src/utils/sendWhatsApp.js

import axios from "axios";
import env from "../config/env.js";

export const sendWhatsApp = async ({
  phone,
  message,
  templateId,
}) => {
  // Agar MSG91 key nahi hai to skip karo
  if (!env.MSG91_AUTH_KEY) {
    console.log(
      "WhatsApp skipped (no MSG91 key):",
      message
    );

    return {
      success: true,
      skipped: true,
    };
  }

  try {
    const response = await axios.post(
      "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/",
      {
        integrated_number: "91XXXXXXXXXX",

        content_type: "template",

        payload: {
          to: `91${phone}`,

          type: "template",

          template: {
            name:
              templateId ||
              env.MSG91_TEMPLATE_ID,

            language: {
              code: "en",
            },

            components: [
              {
                type: "body",

                parameters: [
                  {
                    type: "text",
                    text: message,
                  },
                ],
              },
            ],
          },
        },
      },
      {
        headers: {
          authkey: env.MSG91_AUTH_KEY,
          "Content-Type":
            "application/json",
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error(
      "WhatsApp error:",
      error.message
    );

    return {
      success: false,
      error: error.message,
    };
  }
};