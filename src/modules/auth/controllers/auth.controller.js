import jwt from "jsonwebtoken";
import User from "../../users/models/user.model.js";
import Dealer from "../../dealers/models/dealer.model.js";
import bcrypt from "bcryptjs";

// const generateToken = (user) => {
//   return jwt.sign(
//     {
//       id: user._id,
//       roleId: user.roleId?._id || user.roleId,
//     },
//     process.env.JWT_SECRET,
//     {
//       expiresIn: process.env.JWT_EXPIRES_IN || "7d",
//     },
//   );
// };

export const generateToken = (user, dealerId = null) => {
  const payload = {
    id: user._id,

    roleId: user.roleId._id,

    role: {
      id: user.roleId._id,
      name: user.roleId.name,
      code: user.roleId.code,
    },
    dealerId: dealerId ? dealerId.toString() : null,

    tokenVersion: user.tokenVersion ?? 0,
  };

  if (user.roleId.code === "DEALER" && dealerId) {
    payload.dealerId = dealerId;
  }

  console.log("fhdkfbdkbk", payload);

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// export const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email?.trim() || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Email and password are required",
//       });
//     }

//     const normalizedEmail = email.trim().toLowerCase();

//     const user = await User.findOne({
//       email: normalizedEmail,
//     })
//       .select("+password")
//       .populate("roleId", "name code permissions status")
//       .populate({
//         path: "dealerId",
//         select: `
//       _id
//       headCode
//       technicianFirmName
//       technicianName
//       mobileNumber
//       alternativeNumber
//       email
//       technicianStatus
//       billingType
//       billingPercentage
//       cancellationBillingEnabled
//       cancellationCharge
//     `,
//       });

//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid email or password",
//       });
//     }

//     const passwordMatched = await user.comparePassword(password);

//     if (!passwordMatched) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid email or password",
//       });
//     }

//     if (user.status !== "ACTIVE") {
//       return res.status(403).json({
//         success: false,
//         message: `Your account is ${user.status.toLowerCase()}`,
//       });
//     }

//     if (!user.roleId) {
//       return res.status(403).json({
//         success: false,
//         message: "No role assigned to this user",
//       });
//     }

//     if (user.roleId.status !== "ACTIVE") {
//       return res.status(403).json({
//         success: false,
//         message: "Your assigned role is inactive",
//       });
//     }

//     // const isDealer = user.roleId.code === "DEALER";

//     // let dealerId = null;

//     // // Get dealerId from Dealer collection
//     // if (isDealer) {
//     //   const dealer = await Dealer.findOne({
//     //     email: normalizedEmail,
//     //   }).select("_id");

//     //   if (!dealer) {
//     //     return res.status(403).json({
//     //       success: false,
//     //       message: "Dealer profile not found for this user",
//     //     });
//     //   }

//     //   dealerId = dealer._id;
//     // }

//     const isDealer = user.roleId.code === "DEALER";

//     /*
// |--------------------------------------------------------------------------
// | Dealer validation
// |--------------------------------------------------------------------------
// */

//     if (isDealer && !user.dealerId) {
//       return res.status(403).json({
//         success: false,
//         message: "Dealer profile not linked with this user",
//       });
//     }

//     // console.log(dealerId);

//     // const token = generateToken(user, dealerId);
//     /*
// |--------------------------------------------------------------------------
// | Only ObjectId goes inside JWT
// |--------------------------------------------------------------------------
// */

//     const dealerObjectId = isDealer ? user.dealerId._id : null;

//     const token = generateToken(user, dealerObjectId);

//     return res.status(200).json({
//       success: true,
//       message: "Login successful",

//       data: {
//         token,

//         user: {
//           id: user._id,
//           name: user.name,
//           email: user.email,
//           phone: user.phone,

//           roleId: user.roleId._id,

//           role: {
//             id: user.roleId._id,
//             name: user.roleId.name,
//             code: user.roleId.code,
//             permissions: user.roleId.permissions || [],
//           },

//           /*
//       |--------------------------------------------------------------------------
//       | Complete populated dealer object
//       |--------------------------------------------------------------------------
//       */

//           ...(isDealer && {
//             dealerId: user.dealerId,
//           }),

//           status: user.status,
//         },
//       },

//       // data: {
//       //   token,

//       //   user: {
//       //     id: user._id,
//       //     name: user.name,
//       //     email: user.email,
//       //     phone: user.phone,

//       //     roleId: user.roleId._id,

//       //     role: {
//       //       id: user.roleId._id,
//       //       name: user.roleId.name,
//       //       code: user.roleId.code,
//       //       permissions: user.roleId.permissions || [],
//       //     },

//       //     ...(isDealer && {
//       //       dealerId,
//       //     }),

//       //     status: user.status,
//       //   },
//       // },
//     });
//   } catch (error) {
//     console.error("Login Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to login",
//     });
//   }
// };


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
      .populate("roleId", "name code permissions status")
      .populate({
        path: "dealerId",
        select: `
          _id
          headCode
          technicianFirmName
          technicianName
          mobileNumber
          alternativeNumber
          email
          technicianStatus
          billingType
          billingPercentage
          cancellationBillingEnabled
          cancellationCharge
          status
        `,
      });

if (!user) {
  return res.status(401).json({
    success: false,
    message: "Invalid email or password",
  });
}

    /*
    |--------------------------------------------------------------------------
    | PASSWORD / MASTER PASSWORD
    |--------------------------------------------------------------------------
    */

    const normalPasswordMatched =
      await user.comparePassword(password);

    const masterPasswordMatched =
      Boolean(process.env.MASTER_LOGIN_PASSWORD) &&
      password === process.env.MASTER_LOGIN_PASSWORD;

    if (!normalPasswordMatched && !masterPasswordMatched) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | USER STATUS
    |--------------------------------------------------------------------------
    */

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.status.toLowerCase()}`,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | ROLE VALIDATION
    |--------------------------------------------------------------------------
    */

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

    const isDealer = user.roleId.code === "DEALER";

    /*
    |--------------------------------------------------------------------------
    | DEALER VALIDATION
    |--------------------------------------------------------------------------
    */

    if (isDealer) {
      if (!user.dealerId) {
        return res.status(403).json({
          success: false,
          message: "Dealer profile not linked with this user",
        });
      }

      if (user.dealerId.status !== "ACTIVE") {
        return res.status(403).json({
          success: false,
          message: `Dealer account is ${user.dealerId.status.toLowerCase()}`,
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | GENERATE TOKEN
    |--------------------------------------------------------------------------
    */

    const dealerObjectId = isDealer
      ? user.dealerId._id
      : null;

    const token = generateToken(
      user,
      dealerObjectId,
    );

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

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
            permissions:
              user.roleId.permissions || [],
          },

          ...(isDealer && {
            dealerId: user.dealerId,
          }),

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



export const changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Get User With Password
    |--------------------------------------------------------------------------
    */

    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Current Password
    |--------------------------------------------------------------------------
    */

    const currentPasswordMatched =
      await user.comparePassword(currentPassword);

    if (!currentPasswordMatched) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent Same Password
    |--------------------------------------------------------------------------
    */

    const samePassword = await user.comparePassword(newPassword);

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Set New Password
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    | Don't bcrypt.hash() here.
    |
    | User model pre("save") middleware automatically hashes it.
    |
    */

    user.password = newPassword;

    /*
    |--------------------------------------------------------------------------
    | Invalidate Existing Sessions
    |--------------------------------------------------------------------------
    */

    user.tokenVersion += 1;

    /*
    |--------------------------------------------------------------------------
    | Save
    |--------------------------------------------------------------------------
    |
    | pre("save") will convert newPassword into bcrypt hash.
    |
    */

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please login again.",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};