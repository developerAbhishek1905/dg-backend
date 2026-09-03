import { PERMISSION_LIST } from "../constants/permissions.js";

export const getPermissions = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      count: PERMISSION_LIST.length,
      data: PERMISSION_LIST,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch permissions",
    });
  }
};