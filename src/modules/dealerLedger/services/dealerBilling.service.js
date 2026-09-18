import Dealer from "../../dealers/models/dealer.model.js";
import DealerLedger from "../../dealerLedger/model/dealerLedger.model.js";

const PERCENTAGE_BILLING_TYPES = ["PARTIAL_PAYMENT", "PROFIT_SHARING"];

/*
|--------------------------------------------------------------------------
| Find service rate from Dealer
|--------------------------------------------------------------------------
*/

const findServiceRate = (dealer, complaint) => {
  const product = dealer.productServices?.find(
    (item) => Number(item.productId) === Number(complaint.productId),
  );

  if (!product) {
    throw new Error(
      `Product ${complaint.productName} is not configured for this dealer`,
    );
  }

  const category = product.categories?.find((item) => {
    // Prefer category ID when both sides have it.
    if (complaint.categoryId && item.categoryId) {
      return String(item.categoryId) === String(complaint.categoryId);
    }

    return (
      String(item.categoryName || "")
        .trim()
        .toLowerCase() ===
      String(complaint.category || "")
        .trim()
        .toLowerCase()
    );
  });

  if (!category) {
    throw new Error(
      `Service ${complaint.category} is not configured for this dealer`,
    );
  }

  return {
    rate: Number(category.rate || 0),
    category,
  };
};

/*
|--------------------------------------------------------------------------
| Check duplicate billing
|--------------------------------------------------------------------------
*/

const getExistingComplaintBilling = async (complaintId) => {
  return DealerLedger.findOne({
    complaintId,
    transactionType: "CLOSURE",
    status: {
      $in: ["PENDING", "APPROVED", "BILLED"],
    },
    reversed: false,
  });
};

/*
|--------------------------------------------------------------------------
| Create closure ledger
|--------------------------------------------------------------------------
*/

export const createClosureLedger = async ({ complaint, user }) => {

  const dealerId = complaint.allocatedDealerId || user.dealerId;

  if (!dealerId) {
    throw new Error("Dealer is not assigned to this complaint");
  }

  /*
  |--------------------------------------------------------------------------
  | Prevent duplicate billing
  |--------------------------------------------------------------------------
  */

  const existingLedger = await getExistingComplaintBilling(complaint._id);

  if (existingLedger) {
    return existingLedger;
  }

  /*
  |--------------------------------------------------------------------------
  | Get dealer
  |--------------------------------------------------------------------------
  */

  const dealer = await Dealer.findById(dealerId);

  if (!dealer) {
    throw new Error("Dealer not found");
  }

  /*
  |--------------------------------------------------------------------------
  | FIXED BILLING
  |--------------------------------------------------------------------------
  */

  if (dealer.billingType === "FIXED") {
    const { rate, category } = findServiceRate(dealer, complaint);

    if (rate <= 0) {
      throw new Error(
        `Billing rate is not configured for ${complaint.category}`,
      );
    }

    console.log(complaint)
    const ledger = await DealerLedger.create({
      dealerId: dealer._id,

      dealerCode: dealer.dealerCode || dealer.technicianCode || dealer.headCode,

      dealerName: dealer.technicianFirmName || dealer.technicianName,

      complaintId: complaint._id,

      complaintNumber: complaint.complaintNumber,

      transactionType: "CLOSURE",

      billingType: "FIXED", 
    //   customerAmount: complaint.billingReview.customerAmount,
    //   profitAmount:complaint.billingReview.profitAmount,

      productId: complaint.productId,

      productName: complaint.productName,

      categoryId: complaint.categoryId || null,

      category: complaint.category,

      serviceDescription: category.description || "",

      serviceRate: rate,

      baseAmount: rate,

      percentage: 0,

      amount: rate,

      entryType: "DEBIT",

      calculation: {
        fixedRate: rate,
        customerAmount: 0,
        profitAmount: 0,
        percentage: 0,
      },

      description: `Fixed billing for complaint ${complaint.complaintNumber}`,

      status: "APPROVED",

      billingDate: new Date(),

      billedBy: user?._id || user?.id || null,
    });

    return ledger;
  }

  /*
  |--------------------------------------------------------------------------
  | PERCENTAGE BILLING
  |--------------------------------------------------------------------------
  */

//   if (PERCENTAGE_BILLING_TYPES.includes(dealer.billingType)) {
//     if (!complaint.billingReview) {
//       throw new Error(
//         "Billing amount must be submitted before closing this complaint",
//       );
//     }

//     const review = complaint.billingReview;

//     /*
//     |--------------------------------------------------------------------------
//     | Important
//     |
//     | If DG has already verified billingReview, create approved ledger.
//     | Otherwise create pending ledger.
//     |--------------------------------------------------------------------------
//     */

//     const isVerified = review.status === "VERIFIED";

//     const ledger = await DealerLedger.create({
//       dealerId: dealer._id,

//       dealerCode: dealer.dealerCode || dealer.technicianCode || dealer.headCode,

//       dealerName: dealer.technicianFirmName || dealer.technicianName,

//       complaintId: complaint._id,

//       complaintNumber: complaint.complaintNumber,

//       transactionType: "CLOSURE",

//       billingType: dealer.billingType,

//       productId: complaint.productId,

//       productName: complaint.productName,

//       categoryId: complaint.categoryId || null,

//       category: complaint.category,

//       baseAmount: Number(review.baseAmount || 0),

//       percentage: Number(review.percentage || 0),

//       amount: Number(review.charge || 0),

//       entryType: "DEBIT",

//       calculation: {
//         fixedRate: 0,

//         customerAmount:
//           dealer.billingType === "PARTIAL_PAYMENT"
//             ? Number(review.baseAmount || 0)
//             : 0,

//         profitAmount:
//           dealer.billingType === "PROFIT_SHARING"
//             ? Number(review.baseAmount || 0)
//             : 0,

//         percentage: Number(review.percentage || 0),
//       },

//       description: `${dealer.billingType} billing for complaint ${complaint.complaintNumber}`,

//       status: isVerified ? "APPROVED" : "PENDING",

//       billingDate: new Date(),

//       billedBy: user?._id || user?.id || null,
//     });

//     return ledger;
//   }

/*
|--------------------------------------------------------------------------
| PERCENTAGE BILLING
|--------------------------------------------------------------------------
*/

if (PERCENTAGE_BILLING_TYPES.includes(dealer.billingType)) {
  if (!complaint.billingReview) {
    throw new Error(
      "Billing amount must be submitted before closing this complaint",
    );
  }

  const review = complaint.billingReview;

  /*
  |--------------------------------------------------------------------------
  | Percentage ALWAYS comes from Dealer configuration
  |--------------------------------------------------------------------------
  */

  const percentage = Number(dealer.billingPercentage || 0);

  if (percentage <= 0) {
    throw new Error(
      "Dealer billing percentage is not configured",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Get amounts
  |--------------------------------------------------------------------------
  */
 console.log('jdbvkdbvkbdkbdkvbdkbv', review)
  const customerAmount = Number(
    review.customerAmount || 0,
  );
  const profitAmount = Number(
    review.profitAmount || 0,
  );

 


  if (customerAmount <= 0) {
    throw new Error(
      "Customer amount is required",
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Calculate base amount
  |--------------------------------------------------------------------------
  */

  let baseAmount = 0;

  if (dealer.billingType === "PARTIAL_PAYMENT") {
    /*
     * PARTIAL PAYMENT
     *
     * Customer Amount = 5000
     * Percentage      = 10%
     *
     * Base = 5000
     */

    baseAmount = customerAmount;
  }

  if (dealer.billingType === "PROFIT_SHARING") {
    /*
     * PROFIT SHARING
     *
     * Customer Amount = 10000
     * Profit Amount   = 3000
     * Percentage      = 20%
     *
     * Base = 3000
     */

    if (profitAmount <= 0) {
      throw new Error(
        "Profit amount is required for profit sharing",
      );
    }

    if (profitAmount > customerAmount) {
      throw new Error(
        "Profit amount cannot be greater than customer amount",
      );
    }

    baseAmount = profitAmount;
  }

  /*
  |--------------------------------------------------------------------------
  | Calculate DG charge
  |--------------------------------------------------------------------------
  */

  const charge = Number(
    ((baseAmount * percentage) / 100).toFixed(2),
  );

  /*
  |--------------------------------------------------------------------------
  | Create pending ledger
  |--------------------------------------------------------------------------
  */

  const ledger = await DealerLedger.create({
    dealerId: dealer._id,

    dealerCode:
      dealer.dealerCode ||
      dealer.technicianCode ||
      dealer.headCode,

    dealerName:
      dealer.technicianFirmName ||
      dealer.technicianName,

    complaintId: complaint._id,

    complaintNumber:
      complaint.complaintNumber,

    transactionType: "CLOSURE",

    billingType: dealer.billingType,

    productId: complaint.productId,

    productName:
      complaint.productName,

    categoryId:
      complaint.categoryId || null,

    category:
      complaint.category,

    /*
     * Snapshot values
     */

    baseAmount,

    percentage,

    amount: charge,

    entryType: "DEBIT",

    calculation: {
      fixedRate: 0,

      customerAmount,

      profitAmount:
        dealer.billingType ===
        "PROFIT_SHARING"
          ? profitAmount
          : 0,

      percentage,
    },

    description:
      `${dealer.billingType} billing for complaint ${complaint.complaintNumber}`,

    /*
     * Percentage billing always requires
     * DG approval first
     */

    status: "PENDING",

    billingDate: new Date(),

    billedBy:
      user?._id ||
      user?.id ||
      null,
  });

  return ledger;
}

  throw new Error(`Unsupported billing type: ${dealer.billingType}`);
};

export const createCancellationLedger = async ({
  complaint,
  user,
}) => {
  const dealerId =
    complaint.allocatedDealerId ||
    complaint.dealerId;

  console.log(
    "Cancellation dealerId:",
    dealerId,
  );

  if (!dealerId) {
    throw new Error(
      "Dealer is not assigned to this complaint",
    );
  }

  const dealer =
    await Dealer.findById(dealerId);

  console.log(
    "Cancellation dealer:",
    {
      id: dealer?._id,
      name:
        dealer?.technicianFirmName,
      cancellationBillingEnabled:
        dealer?.cancellationBillingEnabled,
      cancellationCharge:
        dealer?.cancellationCharge,
    },
  );

  if (!dealer) {
    throw new Error(
      "Dealer not found",
    );
  }

  if (
    !dealer.cancellationBillingEnabled
  ) {
    console.log(
      "Cancellation billing disabled",
    );

    return null;
  }

  const cancellationCharge =
    Number(
      dealer.cancellationCharge ||
        0,
    );

  if (cancellationCharge <= 0) {
    console.log(
      "Cancellation charge is 0",
    );

    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | Prevent duplicate
  |--------------------------------------------------------------------------
  */

  const existingLedger =
    await DealerLedger.findOne({
      complaintId:
        complaint._id,

      transactionType:
        "CANCELLATION",

      reversed: false,

      status: {
        $in: [
          "PENDING",
          "APPROVED",
          "BILLED",
        ],
      },
    });

  if (existingLedger) {
    console.log(
      "Existing cancellation ledger:",
      existingLedger._id,
    );

    return existingLedger;
  }

  /*
  |--------------------------------------------------------------------------
  | Create Ledger
  |--------------------------------------------------------------------------
  */

  const ledger =
    await DealerLedger.create({
      dealerId:
        dealer._id,

      dealerCode:
        dealer.dealerCode ||
        dealer.technicianCode ||
        dealer.headCode,

      dealerName:
        dealer.technicianFirmName ||
        dealer.technicianName,

      complaintId:
        complaint._id,

      complaintNumber:
        complaint.complaintNumber,

      transactionType:
        "CANCELLATION",

      billingType:
        "CANCELLATION",

      productId:
        complaint.productId,

      productName:
        complaint.productName,

      categoryId:
        complaint.categoryId ||
        null,

      category:
        complaint.category,

      baseAmount:
        cancellationCharge,

      percentage: 0,

      serviceRate: 0,

      amount:
        cancellationCharge,

      entryType:
        "DEBIT",

      calculation: {
        fixedRate: 0,
        customerAmount: 0,
        profitAmount: 0,
        percentage: 0,
      },

      description:
        `Cancellation billing for complaint ${complaint.complaintNumber}`,

      remarks:
        complaint.cancellationReason ||
        "",

      /*
      |--------------------------------------------------------------------------
      | Pre Approved
      |--------------------------------------------------------------------------
      */

      status:
        "APPROVED",

      billingDate:
        new Date(),

      billedBy:
        user?._id ||
        user?.id ||
        null,

      approvedAt:
        new Date(),

      approvedBy:
        user?._id ||
        user?.id ||
        null,
    });

  console.log(
    "Cancellation ledger created:",
    ledger._id,
  );

  return ledger;
};