import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    ".xlsx",
    ".xls",
    ".csv",
  ];

  const extension =
    "." + file.originalname.split(".").pop().toLowerCase();

  if (!allowedExtensions.includes(extension)) {
    return cb(
      new Error("Only .xlsx, .xls and .csv files are allowed"),
      false
    );
  }

  cb(null, true);
};

export const uploadExcel = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});