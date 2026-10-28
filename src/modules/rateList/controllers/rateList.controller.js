import ClosureMaster from "../models/rateList.model.js";
import Product from "../../product/models/product.model.js";
import { escapeRegex } from "../../../helper/escapeRegex.js";

const fail = (res, code, message) =>
  res.status(code).json({ success: false, message });

const findDuplicate = (title, productId, excludeId) =>
  ClosureMaster.findOne({
    title: { $regex: `^${escapeRegex(title)}$`, $options: "i" },
    productId,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });

/* CREATE */
export const createRate = async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const productId = Number(req.body.productId);

    if (!title) return fail(res, 400, "Title is required");
    if (!Number.isFinite(productId)) return fail(res, 400, "Product is required");

    const product = await Product.findOne({ product_id: productId })
      .select("product_name")
      .lean();
    if (!product) return fail(res, 404, "Product not found");

    if (await findDuplicate(title, productId)) {
      return fail(res, 409, "This title already exists for the selected product");
    }

    const doc = await ClosureMaster.create({
      title,
      productId,
      productName: product.product_name || "",
      status: req.body.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    });

    return res
      .status(201)
      .json({ success: true, message: "Added successfully", data: doc });
  } catch (error) {
    console.error("Create closure master error:", error);
    return fail(res, 500, "Failed to add");
  }
};

/* LIST (search / product / status / pagination) */
export const getRates = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const { search = "", status, productId } = req.query;

    const filter = {};

    if (status === "ACTIVE" || status === "INACTIVE") filter.status = status;
    if (productId !== undefined && productId !== "" && productId !== "ALL") {
      filter.productId = Number(productId);
    }

    if (String(search).trim()) {
      const regex = { $regex: escapeRegex(String(search).trim()), $options: "i" };
      filter.$or = [{ title: regex }, { productName: regex }];
    }

    const [data, total] = await Promise.all([
      ClosureMaster.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ClosureMaster.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    console.error("Get closure master error:", error);
    return fail(res, 500, "Failed to load list");
  }
};

/* UPDATE */
export const updateRate = async (req, res) => {
  try {
    const doc = await ClosureMaster.findById(req.params.id);
    if (!doc) return fail(res, 404, "Entry not found");

    const title =
      req.body.title !== undefined ? String(req.body.title).trim() : doc.title;
    if (!title) return fail(res, 400, "Title is required");

    let productId = doc.productId;
    let productName = doc.productName;

    if (req.body.productId !== undefined && Number(req.body.productId) !== doc.productId) {
      productId = Number(req.body.productId);
      const product = await Product.findOne({ product_id: productId })
        .select("product_name")
        .lean();
      if (!product) return fail(res, 404, "Product not found");
      productName = product.product_name || "";
    }

    if (await findDuplicate(title, productId, doc._id)) {
      return fail(res, 409, "This title already exists for the selected product");
    }

    doc.title = title;
    doc.productId = productId;
    doc.productName = productName;

    if (req.body.status === "ACTIVE" || req.body.status === "INACTIVE") {
      doc.status = req.body.status;
    }

    await doc.save();

    return res.json({ success: true, message: "Updated successfully", data: doc });
  } catch (error) {
    console.error("Update closure master error:", error);
    return fail(res, 500, "Failed to update");
  }
};

/* TOGGLE STATUS */
export const toggleRateStatus = async (req, res) => {
  try {
    const doc = await ClosureMaster.findById(req.params.id);
    if (!doc) return fail(res, 404, "Entry not found");

    doc.status = doc.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await doc.save();

    return res.json({ success: true, message: "Status updated", data: doc });
  } catch (error) {
    console.error("Toggle closure master status error:", error);
    return fail(res, 500, "Failed to update status");
  }
};

/* DELETE */
export const deleteRate = async (req, res) => {
  try {
    const doc = await ClosureMaster.findByIdAndDelete(req.params.id);
    if (!doc) return fail(res, 404, "Entry not found");

    return res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    console.error("Delete closure master error:", error);
    return fail(res, 500, "Failed to delete");
  }
};
