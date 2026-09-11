import jwt from "jsonwebtoken";
import User from "../../users/models/user.model.js";
<<<<<<< Updated upstream
=======
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
>>>>>>> Stashed changes

export const protect = async (req, res, next) => {
  try {
    let token;

    const authorization = req.headers.authorization;

<<<<<<< Updated upstream
    if (
      authorization &&
      authorization.startsWith("Bearer ")
    ) {
=======
    if (authorization && authorization.startsWith("Bearer ")) {
>>>>>>> Stashed changes
      token = authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

<<<<<<< Updated upstream
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
    );
=======
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
>>>>>>> Stashed changes

    const user = await User.findById(decoded.id).populate(
      "roleId",
      "name code permissions status",
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "User account is not active",
      });
    }

    if (!user.roleId) {
      return res.status(403).json({
        success: false,
        message: "No role assigned",
      });
    }

    if (user.roleId.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Assigned role is inactive",
      });
    }
<<<<<<< Updated upstream
=======
console.log("aaaaaaaaa",user.dealerId)
    /*
    |--------------------------------------------------------------------------
    | Dealer ID
    |--------------------------------------------------------------------------
    */

    let dealerId = null;

    if (user.roleId.code === "DEALER") {
      const dealer = await Dealer.findById(
      user.dealerId,
      ).select("_id");

    

      if (!dealer) {
        return res.status(403).json({
          success: false,
          message: "Dealer account is not linked with any dealer",
        });
      }

      dealerId = dealer._id;
    }

    /*
    |--------------------------------------------------------------------------
    | Request User
    |--------------------------------------------------------------------------
    */
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
=======

      ...(dealerId && {
        dealerId,
      }),
>>>>>>> Stashed changes
    };

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
<<<<<<< Updated upstream
};
=======
};
>>>>>>> Stashed changes
