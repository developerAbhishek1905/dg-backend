import mongoose from "mongoose";

import User from "../models/user.model.js";
import Role from "../../accessControl/models/role.model.js";


export const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      phone = "",
      password,
      roleId,
      dealerId = null,
      status = "ACTIVE",
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    if (!roleId) {
      return res.status(400).json({
        success: false,
        message: "Role is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role ID",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const role = await Role.findById(roleId);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    if (role.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Cannot assign an inactive role",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || "",
      password,
      roleId,
      dealerId: dealerId || null,
      status,
    });

    const createdUser = await User.findById(user._id).populate(
      "roleId",
      "name code permissions status",
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: formatUser(createdUser),
    });
  } catch (error) {
    console.error("Create User Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate(
        "roleId",
        "name code permissions status",
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users.map(formatUser),
    });
  } catch (error) {
    console.error("Get Users Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id).populate(
      "roleId",
      "name code permissions status",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatUser(user),
    });
  } catch (error) {
    console.error("Get User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      email,
      phone,
      roleId,
      dealerId,
      status,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (email !== undefined) {
      const normalizedEmail = email.trim().toLowerCase();

      const emailExists = await User.findOne({
        email: normalizedEmail,
        _id: {
          $ne: id,
        },
      });

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: "Email already used by another user",
        });
      }

      user.email = normalizedEmail;
    }

    if (roleId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(roleId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role ID",
        });
      }

      const role = await Role.findById(roleId);

      if (!role) {
        return res.status(404).json({
          success: false,
          message: "Role not found",
        });
      }

      if (role.status !== "ACTIVE") {
        return res.status(400).json({
          success: false,
          message: "Cannot assign inactive role",
        });
      }

      user.roleId = roleId;
    }

    if (name !== undefined) {
      user.name = name.trim();
    }

    if (phone !== undefined) {
      user.phone = phone.trim();
    }

    if (dealerId !== undefined) {
      user.dealerId = dealerId || null;
    }

    if (status !== undefined) {
      user.status = status;
    }

    await user.save();

    const updatedUser = await User.findById(user._id).populate(
      "roleId",
      "name code permissions status",
    );

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: formatUser(updatedUser),
    });
  } catch (error) {
    console.error("Update User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await user.deleteOne();

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete User Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
};


const formatUser = (user) => ({
  id: user._id,

  name: user.name,

  email: user.email,

  phone: user.phone,

  roleId: user.roleId?._id || user.roleId || null,

  role: user.roleId
    ? {
        id: user.roleId._id,
        name: user.roleId.name,
        code: user.roleId.code,
        permissions: user.roleId.permissions,
        status: user.roleId.status,
      }
    : null,

  dealerId: user.dealerId || null,

  status: user.status,

  createdAt: user.createdAt,

  updatedAt: user.updatedAt,
});