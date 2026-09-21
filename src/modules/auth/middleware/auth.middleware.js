import jwt from "jsonwebtoken";
import User from "../../users/models/user.model.js";
import Dealer from '../../dealers/models/dealer.model.js'

// export const protect = async (req, res, next) => {

//   try {
//     let token;

//     const authorization = req.headers.authorization;

//     if (
//       authorization &&
//       authorization.startsWith("Bearer ")
//     ) {
//       token = authorization.split(" ")[1];
//     }

//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: "Authentication required",
//       });
//     }

//     const decoded = jwt.verify(
//       token,
//       process.env.JWT_SECRET,
//     );

//     const user = await User.findById(decoded.id).populate(
//       "roleId",
//       "name code permissions status",
//     );

//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: "User no longer exists",
//       });
//     }

//     if (user.status !== "ACTIVE") {
//       return res.status(403).json({
//         success: false,
//         message: "User account is not active",
//       });
//     }

//     if (!user.roleId) {
//       return res.status(403).json({
//         success: false,
//         message: "No role assigned",
//       });
//     }

//     if (user.roleId.status !== "ACTIVE") {
//       return res.status(403).json({
//         success: false,
//         message: "Assigned role is inactive",
//       });
//     }

//     req.user = {
//       id: user._id,
//       name: user.name,
//       email: user.email,

//       roleId: user.roleId._id,

//       role: {
//         id: user.roleId._id,
//         name: user.roleId.name,
//         code: user.roleId.code,
//       },

//       permissions: user.roleId.permissions || [],
//     };

//     next();
//   } catch (error) {
//     console.error("Auth Middleware Error:", error);

//     if (error.name === "TokenExpiredError") {
//       return res.status(401).json({
//         success: false,
//         message: "Token expired",
//       });
//     }

//     if (error.name === "JsonWebTokenError") {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid token",
//       });
//     }

//     return res.status(401).json({
//       success: false,
//       message: "Authentication failed",
//     });
//   }
// };

// export const protect = async (req, res, next) => {
//   try {
//     let token;

//     const authorization = req.headers.authorization;

//     if (authorization && authorization.startsWith("Bearer ")) {
//       token = authorization.split(" ")[1];
//     }

//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: "Authentication required",
//       });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     const user = await User.findById(decoded.id).populate(
//       "roleId",
//       "name code permissions status",
//     );

//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: "User no longer exists",
//       });
//     }

//     if (user.status !== "ACTIVE") {
//       return res.status(403).json({
//         success: false,
//         message: "User account is not active",
//       });
//     }

//     if (!user.roleId) {
//       return res.status(403).json({
//         success: false,
//         message: "No role assigned",
//       });
//     }

//     if (user.roleId.status !== "ACTIVE") {
//       return res.status(403).json({
//         success: false,
//         message: "Assigned role is inactive",
//       });
//     }
// console.log("aaaaaaaaa",user.dealerId)
//     /*
//     |--------------------------------------------------------------------------
//     | Dealer ID
//     |--------------------------------------------------------------------------
//     */

//     let dealerId = null;

//     if (user.roleId.code === "DEALER") {
//       const dealer = await Dealer.findById(
//       user.dealerId,
//       ).select("_id");

    

//       if (!dealer) {
//         return res.status(403).json({
//           success: false,
//           message: "Dealer account is not linked with any dealer",
//         });
//       }

//       dealerId = dealer._id;
//     }

//     /*
//     |--------------------------------------------------------------------------
//     | Request User
//     |--------------------------------------------------------------------------
//     */

//     req.user = {
//       id: user._id,
//       name: user.name,
//       email: user.email,

//       roleId: user.roleId._id,

//       role: {
//         id: user.roleId._id,
//         name: user.roleId.name,
//         code: user.roleId.code,
//       },

//       permissions: user.roleId.permissions || [],

//       ...(dealerId && {
//         dealerId,
//       }),
//     };

//     next();
//   } catch (error) {
//     console.error("Auth Middleware Error:", error);

//     if (error.name === "TokenExpiredError") {
//       return res.status(401).json({
//         success: false,
//         message: "Token expired",
//       });
//     }

//     if (error.name === "JsonWebTokenError") {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid token",
//       });
//     }

//     return res.status(401).json({
//       success: false,
//       message: "Authentication failed",
//     });
//   }
// };

export const protect = async (req, res, next) => {
  try {
    let token;

    const authorization = req.headers.authorization;

    /*
    |--------------------------------------------------------------------------
    | Get Token
    |--------------------------------------------------------------------------
    */

    if (authorization && authorization.startsWith("Bearer ")) {
      token = authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        code: "AUTH_REQUIRED",
        message: "Authentication required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Token
    |--------------------------------------------------------------------------
    */

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /*
    |--------------------------------------------------------------------------
    | Get User
    |--------------------------------------------------------------------------
    */

    // IMPORTANT:
    // decoded.id should match whatever key you put inside generateToken()
    const user = await User.findById(decoded.id).populate(
      "roleId",
      "name code permissions status",
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User no longer exists",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Token Version Check
    |--------------------------------------------------------------------------
    | If admin updates dealer/user, tokenVersion will increase.
    | Old JWT becomes invalid automatically.
    |--------------------------------------------------------------------------
    */

    if (
      Number(decoded.tokenVersion ?? 0) !==
      Number(user.tokenVersion ?? 0)
    ) {
      return res.status(401).json({
        success: false,
        code: "SESSION_EXPIRED",
        message:
          "Your account information has been updated. Please login again.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | User Status
    |--------------------------------------------------------------------------
    */

    if (user.status !== "ACTIVE") {
      return res.status(401).json({
        success: false,
        code: "USER_INACTIVE",
        message: `User account is ${user.status.toLowerCase()}`,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Role Validation
    |--------------------------------------------------------------------------
    */

    if (!user.roleId) {
      return res.status(401).json({
        success: false,
        code: "ROLE_NOT_ASSIGNED",
        message: "No role assigned",
      });
    }

    if (user.roleId.status !== "ACTIVE") {
      return res.status(401).json({
        success: false,
        code: "ROLE_INACTIVE",
        message: "Assigned role is inactive",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Dealer Validation
    |--------------------------------------------------------------------------
    */

    let dealerId = null;

    if (user.roleId.code === "DEALER") {
      /*
       * User must have dealerId
       */

      if (!user.dealerId) {
        return res.status(401).json({
          success: false,
          code: "DEALER_NOT_LINKED",
          message: "Dealer profile is not linked with this user",
        });
      }

      /*
       * Get latest dealer information directly from DB.
       * This is important because admin may have changed dealer status.
       */

      const dealer = await Dealer.findById(user.dealerId).select(
        "_id status technicianStatus accountDeactivated",
      );

      if (!dealer) {
        return res.status(401).json({
          success: false,
          code: "DEALER_NOT_FOUND",
          message: "Dealer account no longer exists",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Dealer Status Check
      |--------------------------------------------------------------------------
      */

      if (dealer.status !== "ACTIVE") {
        return res.status(401).json({
          success: false,
          code: "DEALER_INACTIVE",
          message: `Dealer account is ${dealer.status.toLowerCase()}`,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Optional Technician Status Check
      |--------------------------------------------------------------------------
      */

      if (dealer.technicianStatus !== "ACTIVE") {
        return res.status(401).json({
          success: false,
          code: "TECHNICIAN_INACTIVE",
          message: "Dealer technician account is inactive",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Account Deactivated Check
      |--------------------------------------------------------------------------
      */

      if (dealer.accountDeactivated === true) {
        return res.status(401).json({
          success: false,
          code: "DEALER_DEACTIVATED",
          message: "Dealer account has been deactivated",
        });
      }

      dealerId = dealer._id;
    }

    /*
    |--------------------------------------------------------------------------
    | Request User
    |--------------------------------------------------------------------------
    */

    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,

      roleId: user.roleId._id,

      role: {
        id: user.roleId._id,
        name: user.roleId.name,
        code: user.roleId.code,
      },

      permissions: user.roleId.permissions || [],

      ...(dealerId && {
        dealerId,
      }),
    };

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);

    /*
    |--------------------------------------------------------------------------
    | Token Expired
    |--------------------------------------------------------------------------
    */

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        code: "TOKEN_EXPIRED",
        message: "Token expired",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Invalid Token
    |--------------------------------------------------------------------------
    */

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message: "Invalid token",
      });
    }

    return res.status(401).json({
      success: false,
      code: "AUTH_FAILED",
      message: "Authentication failed",
    });
  }
};
