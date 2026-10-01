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

   /*
|--------------------------------------------------------------------------
| Build Common Values
|--------------------------------------------------------------------------
*/

const serviceType =
  complaint.categoryId?.description ||
  complaint.category ||
  complaint.productName ||
  "Service";

const technicianName =
  dealer.technicianName ||
  dealer.technicianFirmName ||
  "Assigned Technician";

const serviceCharge = Number(complaint.quoteAmount) || 0;

const customerAddress = [
  complaint.address?.addressLine,
  complaint.address?.city,
  complaint.address?.district,
  complaint.address?.state,
  complaint.address?.pinCode,
]
  .filter(Boolean)
  .join(", ");

const complaintLink =
  `https://dg-iota-tawny.vercel.app/appointments/${complaint._id}`;

/*
|--------------------------------------------------------------------------
| Customer Message
|--------------------------------------------------------------------------
*/

const customerMessage = `
Dear ${complaint.customerName},

Your *${serviceType}* complaint has been successfully registered.

*Complaint No.: ${complaint.complaintNumber}*
*Technician: ${technicianName}*
*Applicable Service Charge: ₹${serviceCharge}*

Our technician will contact you shortly regarding your complaint.

For any assistance, please contact our *Customer Care: 7888694177*.

Thank you for choosing our service.
`.trim();

/*
|--------------------------------------------------------------------------
| Dealer Message
|--------------------------------------------------------------------------
*/

const dealerMessage = `
Dear ${technicianName},

A new *${serviceType}* complaint has been assigned to you.

*Complaint No.: ${complaint.complaintNumber}*
*Customer: ${complaint.customerName}*
*Contact: ${complaint.phone}*
*Address: ${customerAddress || "-"}*
*Service Charge: ₹${serviceCharge}*

Please contact the customer and attend the complaint as scheduled.

🔗 *View Complaint:* ${complaintLink}
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