import mongoose from "mongoose";
import Reason, { REASON_TYPES } from "../models/reason.model.js";
import { escapeRegex } from "../../../helper/escapeRegex.js";

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });
const handleError = (res, error) => {
  if (error.code === 11000)
    return fail(res, 409, "Reason already exists for this type");
  if (error.name === "ValidationError") return fail(res, 400, error.message);
  console.error("Reason API error:", error);
  return fail(res, 500, "Failed to process reason request");
};
const validId = (id) => mongoose.isObjectIdOrHexString(id);
const validType = (value) => REASON_TYPES.includes(value);

function validateBody(body, partial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return "A JSON object is required";
  if (!partial || body.reasonName !== undefined) {
    if (typeof body.reasonName !== "string" || !body.reasonName.trim())
      return "Reason name is required";
  }
  if (!partial || body.reasonType !== undefined) {
    if (!validType(body.reasonType))
      return `reasonType must be one of: ${REASON_TYPES.join(", ")}`;
  }
  if (body.isActive !== undefined && typeof body.isActive !== "boolean")
    return "isActive must be a boolean";
  if (
    partial &&
    !["reasonName", "reasonType", "isActive"].some(
      (key) => body[key] !== undefined,
    )
  )
    return "Provide reasonName, reasonType, or isActive";
  return null;
}

export const createReason = async (req, res) => {
  const error = validateBody(req.body);
  if (error) return fail(res, 400, error);
  try {
    const { reasonName, reasonType, isActive = true } = req.body;
    const data = await Reason.create({
      reasonName: reasonName.trim(),
      reasonType,
      isActive,
    });
    return res
      .status(201)
      .json({ success: true, message: "Reason created successfully", data });
  } catch (error) {
    return handleError(res, error);
  }
};

function buildFilter(query, dropdown) {
  const { reasonType, search = "", status } = query;
  if (reasonType !== undefined && !validType(reasonType))
    throw new Error(`reasonType must be one of: ${REASON_TYPES.join(", ")}`);
  if (typeof search !== "string") throw new Error("search must be a string");
  if (status !== undefined && !["active", "inactive"].includes(status))
    throw new Error("status must be active or inactive");
  const filter = {};
  if (reasonType !== undefined) filter.reasonType = reasonType;
  if (search.trim())
    filter.reasonName = { $regex: escapeRegex(search.trim()), $options: "i" };
  if (dropdown) filter.isActive = true;
  else if (status !== undefined) filter.isActive = status === "active";
  return filter;
}

export const getAllReasons = async (req, res) => {
  let filter;

  try {
    filter = buildFilter(req.query, false);
  } catch (error) {
    return fail(res, 400, error.message);
  }

  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Reason.find(filter)
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Reason.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,

      data,

      pagination: {
        total,
        page,
        limit,
        totalPages,

        hasNextPage: page < totalPages,

        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getReasonDropdown = async (req, res) => {
  let filter;
  try {
    filter = buildFilter(req.query, true);
  } catch (error) {
    return fail(res, 400, error.message);
  }
  try {
    const reasons = await Reason.find(filter)
      .select("_id reasonName reasonType")
      .sort({ reasonName: 1, _id: 1 })
      .lean();
    const data = reasons.map(({ _id, reasonName, reasonType }) => ({
      id: _id,
      reasonName,
      reasonType,
    }));
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getReasonById = async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 400, "Invalid reason ID");
  try {
    const data = await Reason.findById(req.params.id);
    if (!data) return fail(res, 404, "Reason not found");
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateReason = async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 400, "Invalid reason ID");
  const error = validateBody(req.body, true);
  if (error) return fail(res, 400, error);
  const updates = {};
  for (const key of ["reasonName", "reasonType", "isActive"]) {
    if (req.body[key] !== undefined)
      updates[key] =
        key === "reasonName" ? req.body[key].trim() : req.body[key];
  }
  try {
    const data = await Reason.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true },
    );
    if (!data) return fail(res, 404, "Reason not found");
    return res
      .status(200)
      .json({ success: true, message: "Reason updated successfully", data });
  } catch (error) {
    return handleError(res, error);
  }
};

export const setReasonStatus = async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 400, "Invalid reason ID");
  if (typeof req.body?.isActive !== "boolean")
    return fail(res, 400, "isActive must be a boolean");
  try {
    const data = await Reason.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: req.body.isActive } },
      { new: true, runValidators: true },
    );
    if (!data) return fail(res, 404, "Reason not found");
    return res.status(200).json({
      success: true,
      message: data.isActive
        ? "Reason activated successfully"
        : "Reason deactivated successfully",
      data,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteReason = async (req, res) => {
  if (!validId(req.params.id)) return fail(res, 400, "Invalid reason ID");
  try {
    const data = await Reason.findByIdAndDelete(req.params.id);
    if (!data) return fail(res, 404, "Reason not found");
    return res
      .status(200)
      .json({ success: true, message: "Reason deleted successfully" });
  } catch (error) {
    return handleError(res, error);
  }
};
