import Dealer from "../modules/dealers/models/dealer.model.js";
import { sendWhatsAppMessage } from "./whatsappService.js";
import { complaintLink as buildComplaintLink } from "./appLinks.js";

/*
|--------------------------------------------------------------------------
| COMPLAINT REGISTRATION / ALLOCATION WHATSAPP MESSAGES
|--------------------------------------------------------------------------
|
| Sends
|   - the "complaint registered" message to the CUSTOMER (always), and
|   - the "new complaint assigned" message to the DEALER (when allocated).
|
| This function never throws. It returns what happened to each message so
| the caller can show it to the user:
|
|   {
|     customer: { status, name, mobile, error? },
|     dealer:   { status, name, mobile, error? },
|   }
|
|   status = "SENT" | "FAILED" | "NOT_APPLICABLE"
|
*/

const describeError = (error) =>
  error?.response?.data?.msg ||
  error?.response?.data?.message ||
  (typeof error?.response?.data === "string" ? error.response.data : "") ||
  error?.message ||
  "WhatsApp message could not be sent";

const attempt = async ({ name, mobile, message }) => {
  try {
    await sendWhatsAppMessage({ mobile, message });

    return { status: "SENT", name, mobile };
  } catch (error) {
    return {
      status: "FAILED",
      name,
      mobile: mobile || "",
      error: describeError(error),
    };
  }
};

export const sendComplaintAllocationNotifications = async ({
  complaint,
  dealerId = null,
}) => {
  const summary = {
    customer: { status: "FAILED", name: complaint?.customerName || "", mobile: complaint?.phone || "" },
    dealer: { status: "NOT_APPLICABLE", name: "", mobile: "" },
  };

  try {
    /*
    |--------------------------------------------------------------------------
    | Find Dealer (optional - a complaint may not be allocated yet)
    |--------------------------------------------------------------------------
    */

    let dealer = null;

    if (dealerId) {
      dealer = await Dealer.findById(dealerId).select(
        "technicianCode technicianFirmName technicianName mobileNumber alternativeNumber",
      );

      if (!dealer) {
        console.error("WhatsApp notification: Dealer not found:", dealerId);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Common values
    |--------------------------------------------------------------------------
    */

    const serviceType =
      complaint.categoryId?.description ||
      complaint.category ||
      complaint.productName ||
      "Service";

    const technicianName = dealer
      ? dealer.technicianName || dealer.technicianFirmName || "Assigned Technician"
      : "";

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

    const complaintLink = buildComplaintLink(complaint._id);

    /*
    |--------------------------------------------------------------------------
    | Customer message
    |--------------------------------------------------------------------------
    */

    const customerMessage = `
Dear ${complaint.customerName},

Your *${serviceType}* complaint has been successfully registered.

*Complaint No.: ${complaint.complaintNumber}*
${technicianName ? `*Technician: ${technicianName}*\n` : ""}*Applicable Service Charge: ₹${serviceCharge}*

${
  technicianName
    ? "Our technician will contact you shortly regarding your complaint."
    : "A technician will be assigned to your complaint shortly."
}

For any assistance, please contact our *Customer Care: 7888694177*.

Thank you for choosing our service.
`.trim();

    /*
    |--------------------------------------------------------------------------
    | Dealer message
    |--------------------------------------------------------------------------
    */

    const dealerMessage = dealer
      ? `
Dear ${technicianName},

A new *${serviceType}* complaint has been assigned to you.

*Complaint No.: ${complaint.complaintNumber}*
*Customer: ${complaint.customerName}*
*Contact: ${complaint.phone}*
*Address: ${customerAddress || "-"}*
*Service Charge: ₹${serviceCharge}*

Please contact the customer and attend the complaint as scheduled.

🔗 *View Complaint:* ${complaintLink}
`.trim()
      : "";

    /*
    |--------------------------------------------------------------------------
    | Send independently - one failing must not stop the other
    |--------------------------------------------------------------------------
    */

    const [customerResult, dealerResult] = await Promise.all([
      attempt({
        name: complaint.customerName || "Customer",
        mobile: complaint.phone,
        message: customerMessage,
      }),

      dealer
        ? attempt({
            name: technicianName,
            mobile: dealer.mobileNumber,
            message: dealerMessage,
          })
        : Promise.resolve({ status: "NOT_APPLICABLE", name: "", mobile: "" }),
    ]);

    summary.customer = customerResult;
    summary.dealer = dealerResult;

    if (customerResult.status === "SENT") {
      console.log(`Customer WhatsApp sent: ${complaint.complaintNumber}`);
    } else {
      console.error("Customer WhatsApp failed:", customerResult.error);
    }

    if (dealerResult.status === "SENT") {
      console.log(`Dealer WhatsApp sent: ${complaint.complaintNumber}`);
    } else if (dealerResult.status === "FAILED") {
      console.error("Dealer WhatsApp failed:", dealerResult.error);
    }
  } catch (error) {
    console.error("Complaint WhatsApp notification error:", error.message);

    // Anything unexpected counts as a failed customer message
    if (summary.customer.status !== "SENT") {
      summary.customer = {
        ...summary.customer,
        status: "FAILED",
        error: describeError(error),
      };
    }
  }

  return summary;
};
