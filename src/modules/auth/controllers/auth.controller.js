import jwt from "jsonwebtoken";
import User from "../../users/models/user.model.js";

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      roleId: user.roleId?._id || user.roleId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    })
      .select("+password")
      .populate(
        "roleId",
        "name code permissions status",
      );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatched =
      await user.comparePassword(password);

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.status.toLowerCase()}`,
      });
    }

    if (!user.roleId) {
      return res.status(403).json({
        success: false,
        message: "No role assigned to this user",
      });
    }

    if (user.roleId.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your assigned role is inactive",
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",

      data: {
        token,

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,

          roleId: user.roleId._id,

          role: {
            id: user.roleId._id,
            name: user.roleId.name,
            code: user.roleId.code,
            permissions: user.roleId.permissions,
          },

          dealerId: user.dealerId || null,

          status: user.status,
        },
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to login",
    });
  }
};


export const logout = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to logout",
    });
  }
};