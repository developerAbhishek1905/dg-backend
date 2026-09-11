import Dealer from "../modules/dealers/models/dealer.model.js";

import { sendSmartpingCampaign } from "./smartpingWhatsapp.service.js";

export const sendComplaintAllocationNotifications = async ({
  complaint,
  dealerId,
}) => {
  const dealer = await Dealer.findById(dealerId).lean();

  if (!dealer) {
    console.error("Dealer not found for WhatsApp notification");

    return;
  }

  /*
    |--------------------------------------------------------------------------
    | DEALER NOTIFICATION
    |--------------------------------------------------------------------------
    */

  try {
    await sendSmartpingCampaign({
      campaignName: process.env.SMARTPING_DEALER_CAMPAIGN,

      destination: dealer.mobileNumber,

      userName: dealer.technicianName || dealer.technicianFirmName || "Dealer",

      /*
       * IMPORTANT:
       *
       * Number of params MUST exactly match
       * your Smartping campaign template.
       */
      templateParams: [
        dealer.technicianName || dealer.technicianFirmName || "Dealer",

        complaint.complaintNumber,

        complaint.customerName,

        complaint.phone,

        complaint.productName,

        complaint.category || complaint.faultReported,

        complaint.address?.addressLine || "",

        complaint.address?.city || "",
      ],

      source: "CRM Complaint Allocation",

      tags: ["dealer", "complaint-allocation"],

      attributes: {
        complaintNumber: String(complaint.complaintNumber),

        dealerId: String(dealer._id),
      },
    });

    console.log(`Dealer WhatsApp sent: ${dealer.mobileNumber}`);
  } catch (error) {
    console.error(
      "Dealer WhatsApp failed:",
      error.response?.data || error.message,
    );
  }

  /*
    |--------------------------------------------------------------------------
    | CUSTOMER NOTIFICATION
    |--------------------------------------------------------------------------
    */

  try {
    await sendSmartpingCampaign({
      campaignName: process.env.SMARTPING_CUSTOMER_CAMPAIGN,

      destination: complaint.phone,

      userName: complaint.customerName,

      templateParams: [
        complaint.customerName,

        complaint.complaintNumber,

        dealer.technicianFirmName || dealer.technicianName || "Service Dealer",

        dealer.technicianName || "",

        dealer.mobileNumber || "",

        complaint.productName,

        complaint.category || complaint.faultReported,
      ],

      source: "CRM Complaint Allocation",

      tags: ["customer", "complaint-allocation"],

      attributes: {
        complaintNumber: String(complaint.complaintNumber),
      },
    });

    console.log(`Customer WhatsApp sent: ${complaint.phone}`);
  } catch (error) {
    console.error(
      "Customer WhatsApp failed:",
      error.response?.data || error.message,
    );
  }
};
