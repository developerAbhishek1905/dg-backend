import Dealer from "../modules/dealers/models/dealer.model.js";
import { sendWhatsAppMessage } from "./whatsappService.js";

export const sendComplaintAllocationNotifications = async ({
  complaint,
  dealerId,
}) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | Find Dealer
    |--------------------------------------------------------------------------
    */

    const dealer = await Dealer.findById(dealerId).select(
      "technicianCode technicianFirmName technicianName mobileNumber alternativeNumber",
    );

    if (!dealer) {
      console.error("WhatsApp notification: Dealer not found:", dealerId);
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Customer Message
    |--------------------------------------------------------------------------
    */

    const customerMessage = `
Dear ${complaint.customerName},

Your complaint has been registered successfully.

Complaint No: ${complaint.complaintNumber}
Product: ${complaint.productName}
Category: ${complaint.category || "-"}
Issue: ${complaint.faultReported || "-"}
Status: ${complaint.status}

Service Dealer: ${
      dealer.technicianFirmName ||
      dealer.technicianName ||
      "Assigned Service Dealer"
    }

Dealer Contact: ${dealer.mobileNumber || "-"}

Our service team will contact you shortly.

Thank you.
`.trim();

    /*
    |--------------------------------------------------------------------------
    | Dealer Message
    |--------------------------------------------------------------------------
    */

    const dealerMessage = `
Dear ${dealer.technicianName || dealer.technicianFirmName || "Dealer"},

please login on https://dg-iota-tawny.vercel.app

A new complaint has been assigned to you.

Complaint No: ${complaint.complaintNumber}

Customer: ${complaint.customerName}
Mobile: ${complaint.phone}

Product: ${complaint.productName}
Category: ${complaint.category || "-"}
Issue: ${complaint.faultReported || "-"}

Address:
${complaint.address?.addressLine || ""}
${complaint.address?.city || ""}
${complaint.address?.district || ""}
${complaint.address?.state || ""}
${complaint.address?.pinCode || ""}

Priority: ${complaint.priority || "MEDIUM"}

Please contact the customer and proceed with the service.
`.trim();

    /*
    |--------------------------------------------------------------------------
    | Send Independently
    |--------------------------------------------------------------------------
    |
    | One message failing should not prevent the other from being attempted.
    |
    */

    const results = await Promise.allSettled([
      sendWhatsAppMessage({
        mobile: complaint.phone,
        message: customerMessage,
      }),

      sendWhatsAppMessage({
        mobile: dealer.mobileNumber,
        message: dealerMessage,
      }),
    ]);

    /*
    |--------------------------------------------------------------------------
    | Log Result
    |--------------------------------------------------------------------------
    */

    if (results[0].status === "fulfilled") {
      console.log(
        `Customer WhatsApp sent: ${complaint.complaintNumber}`,
      );
    } else {
      console.error(
        "Customer WhatsApp failed:",
        results[0].reason?.message,
      );
    }

    if (results[1].status === "fulfilled") {
      console.log(
        `Dealer WhatsApp sent: ${complaint.complaintNumber}`,
      );
    } else {
      console.error(
        "Dealer WhatsApp failed:",
        results[1].reason?.message,
      );
    }

    return results;
  } catch (error) {
    console.error(
      "Complaint WhatsApp notification error:",
      error.message,
    );

    throw error;
  }
};