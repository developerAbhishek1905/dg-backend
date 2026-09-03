import {
  VALID_PERMISSION_KEYS,
} from "../constants/permissions.js";

export const validatePermissions = (permissions = []) => {
  const uniquePermissions = [...new Set(permissions)];

  const invalidPermissions = uniquePermissions.filter(
    (permission) => !VALID_PERMISSION_KEYS.has(permission)
  );

  return {
    valid: invalidPermissions.length === 0,
    permissions: uniquePermissions,
    invalidPermissions,
  };
};