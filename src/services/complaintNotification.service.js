import Dealer from "../modules/dealers/models/dealer.model.js";
import { sendWhatsAppTemplate } from "./whatsapp.service.js";


export const sendComplaintAllocationNotifications =
  async ({
    complaint,
    dealerId,
  }) => {
    try {
      const dealer = await Dealer.findById(
        dealerId,
      ).lean();

      if (!dealer) {
        console.error(
          "Dealer not found for WhatsApp notification",
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | DEALER MESSAGE
      |--------------------------------------------------------------------------
      */

      try {
        await sendWhatsAppTemplate({
          phone: dealer.mobileNumber,

          templateName:
            "dealer_complaint_allocated",

          parameters: [
            dealer.technicianName ||
              dealer.technicianFirmName ||
              "Dealer",

            complaint.complaintNumber,

            complaint.customerName,

            complaint.phone,

            complaint.productName,

            complaint.category ||
              complaint.faultReported,

            complaint.address?.addressLine ||
              "",
          ],
        });
      } catch (error) {
        console.error(
          "Dealer WhatsApp notification failed:",
          error.response?.data ||
            error.message,
        );
      }

      /*
      |--------------------------------------------------------------------------
      | CUSTOMER MESSAGE
      |--------------------------------------------------------------------------
      */

      try {
        await sendWhatsAppTemplate({
          phone: complaint.phone,

          templateName:
            "customer_complaint_allocated",

          parameters: [
            complaint.customerName,

            complaint.complaintNumber,

            dealer.technicianFirmName ||
              dealer.technicianName ||
              "Service Dealer",

            dealer.technicianName ||
              "",

            dealer.mobileNumber || "",

            complaint.productName,

            complaint.category ||
              complaint.faultReported,
          ],
        });
      } catch (error) {
        console.error(
          "Customer WhatsApp notification failed:",
          error.response?.data ||
            error.message,
        );
      }
    } catch (error) {
      console.error(
        "Complaint allocation notification error:",
        error,
      );
    }
  };