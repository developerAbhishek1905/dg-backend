import Role from "../models/role.model.js";

import {
  validatePermissions,
} from "../utils/permission.utils.js";

export const createRole = async (req, res) => {
  try {
    const {
      name,
      description = "",
      permissions = [],
      status = "ACTIVE",
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Role name is required",
      });
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: "Permissions must be an array",
      });
    }

    const code = name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const existingRole = await Role.findOne({
      $or: [
        {
          name: {
            $regex: `^${name.trim()}$`,
            $options: "i",
          },
        },
        {
          code,
        },
      ],
    });

    if (existingRole) {
      return res.status(409).json({
        success: false,
        message: "Role already exists",
      });
    }

    const permissionValidation =
      validatePermissions(permissions);

    if (!permissionValidation.valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid permissions found",
        invalidPermissions:
          permissionValidation.invalidPermissions,
      });
    }

    const role = await Role.create({
      name: name.trim(),
      code,
      description: description?.trim() || "",
      permissions:
        permissionValidation.permissions,
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: {
        id: role._id,
        name: role.name,
        code: role.code,
        description: role.description,
        permissions: role.permissions,
        status: role.status,
        isSystemRole: role.isSystemRole,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
    });
  } catch (error) {
    console.error("Create Role Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create role",
    });
  }
};

export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({
      createdAt: -1,
    });

    const formattedRoles = roles.map((role) => ({
      id: role._id,
      name: role.name,
      code: role.code,
      description: role.description,
      permissions: role.permissions,
      status: role.status,
      isSystemRole: role.isSystemRole,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      count: formattedRoles.length,
      data: formattedRoles,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch roles",
    });
  }
};

export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: role._id,
        name: role.name,
        code: role.code,
        description: role.description,
        permissions: role.permissions,
        status: role.status,
        isSystemRole: role.isSystemRole,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch role",
    });
  }
};

export const updateRole = async (req, res) => {
  try {
    const {
      name,
      description,
      permissions,
      status,
    } = req.body;

    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          success: false,
          message: "Permissions must be an array",
        });
      }

      const validation =
        validatePermissions(permissions);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: "Invalid permissions found",
          invalidPermissions:
            validation.invalidPermissions,
        });
      }

      role.permissions = validation.permissions;
    }

    if (name?.trim()) {
      role.name = name.trim();

      if (!role.isSystemRole) {
        role.code = name
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
      }
    }

    if (description !== undefined) {
      role.description = description.trim();
    }

    if (status !== undefined) {
      role.status = status;
    }

    await role.save();

    return res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: {
        id: role._id,
        name: role.name,
        code: role.code,
        description: role.description,
        permissions: role.permissions,
        status: role.status,
        isSystemRole: role.isSystemRole,
      },
    });
  } catch (error) {
    console.error("Update Role Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update role",
    });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    if (role.isSystemRole) {
      return res.status(403).json({
        success: false,
        message: "System roles cannot be deleted",
      });
    }

    await role.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete role",
    });
  }
};