// // services/smartpingWhatsapp.service.js

// import axios from "axios";

// const SMARTPING_API_URL =
//   process.env.SMARTPING_API_URL ||
//   "https://backend.api-wa.co/campaign/smartping/api/v2";

// const SMARTPING_API_KEY =
//   process.env.SMARTPING_API_KEY;

// const formatPhoneNumber = (phone) => {
//   if (!phone) return "";

//   let value = String(phone).replace(/\D/g, "");

//   if (value.length === 10) {
//     value = `91${value}`;
//   }

//   return `+${value}`;
// };

// export const sendSmartpingCampaign = async ({
//   campaignName,
//   destination,
//   userName,
//   templateParams = [],
//   source = "CRM",
//   tags = [],
//   attributes = {},
//   media,
// }) => {
//   if (!SMARTPING_API_KEY) {
//     throw new Error(
//       "SMARTPING_API_KEY is not configured",
//     );
//   }

//   if (!campaignName) {
//     throw new Error(
//       "Smartping campaignName is required",
//     );
//   }

//   if (!destination) {
//     throw new Error(
//       "Smartping destination is required",
//     );
//   }

//   const payload = {
//     apiKey: SMARTPING_API_KEY,

//     campaignName,

//     destination:
//       formatPhoneNumber(destination),

//     userName:
//       userName || "User",

//     source,

//     templateParams:
//       templateParams.map((value) =>
//         String(value ?? ""),
//       ),
//   };

//   if (tags?.length) {
//     payload.tags = tags;
//   }

//   if (
//     attributes &&
//     Object.keys(attributes).length
//   ) {
//     payload.attributes = attributes;
//   }

//   if (media?.url) {
//     payload.media = {
//       url: media.url,
//       filename:
//         media.filename || "file",
//     };
//   }

//   const response = await axios.post(
//     SMARTPING_API_URL,
//     payload,
//     {
//       headers: {
//         "Content-Type":
//           "application/json",
//       },
//       timeout: 15000,
//     },
//   );

//   return response.data;
// };
// services/smartpingWhatsapp.service.js

import axios from "axios";

const SMARTPING_API_URL =
  "https://backend.api-wa.co/campaign/smartping/api/v2";

const formatPhoneNumber = (phone) => {
  if (!phone) return "";

  let value = String(phone).replace(/\D/g, "");

  // Indian 10-digit number
  if (value.length === 10) {
    value = `91${value}`;
  }

  return `+${value}`;
};

export const sendSmartpingCampaign = async ({
  campaignName,
  destination,
  userName,
  templateParams = [],
}) => {
  try {
    const formattedNumber =
      formatPhoneNumber(destination);

    const payload = {
      apiKey: process.env.SMARTPING_API_KEY,
      campaignName,
      destination: formattedNumber,
      userName: userName || "User",
      templateParams:
        templateParams.map((item) =>
          String(item ?? ""),
        ),
    };

    console.log(
      "====================================",
    );
    console.log("SMARTPING REQUEST");
    console.log("URL:", SMARTPING_API_URL);
    console.log(
      "Campaign:",
      campaignName,
    );
    console.log(
      "Destination:",
      formattedNumber,
    );

    // Don't print actual API key
    console.log(
      "API KEY EXISTS:",
      !!process.env.SMARTPING_API_KEY,
    );

    console.log(
      "Template Params:",
      payload.templateParams,
    );

    console.log(
      "Params Count:",
      payload.templateParams.length,
    );

    console.log(
      "====================================",
    );

    const response = await axios.post(
      SMARTPING_API_URL,
      payload,
      {
        headers: {
          "Content-Type":
            "application/json",
        },
        timeout: 15000,
      },
    );

    console.log(
      "SMARTPING SUCCESS:",
      response.status,
      response.data,
    );

    return response.data;
  } catch (error) {
    console.error(
      "====================================",
    );

    console.error(
      "SMARTPING API ERROR",
    );

    console.error(
      "Status:",
      error.response?.status,
    );

    console.error(
      "Response:",
      JSON.stringify(
        error.response?.data,
        null,
        2,
      ),
    );

    console.error(
      "Message:",
      error.message,
    );

    console.error(
      "====================================",
    );

    throw error;
  }
};


// import {
//   sendSmartpingCampaign,
// } from "../services/smartpingWhatsapp.service.js";

export const testWhatsApp = async (
  req,
  res,
) => {
  try {
    const result =
      await sendSmartpingCampaign({
        campaignName:
          process.env
            .SMARTPING_DEALER_CAMPAIGN,

        destination:
          req.body.phone,

        userName:
          "Test User",

        // templateParams: [
        //   "Test User",
        //   "CMP-TEST-001",
        //   "ABC Service Center",
        //   "Rajesh",
        //   "9876543210",
        //   "AIR CONDITIONER",
        //   "ACI",
        // ],
      });

    return res.status(200).json({
      success: true,
      message:
        "Smartping API called successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      message:
        "Smartping API failed",

      status:
        error.response?.status,

      error:
        error.response?.data ||
        error.message,
    });
  }
};