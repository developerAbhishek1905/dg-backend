import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "uploads/dealers";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(
      file.originalname,
    );

    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}${extension}`;

    cb(null, uniqueName);
  },
});

const allowedMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new Error(
        "Only JPG, JPEG, PNG, WEBP and PDF files are allowed",
      ),
      false,
    );
  }

  cb(null, true);
};

const dealerUpload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter,
});

export const dealerDocumentUpload =
  dealerUpload.fields([
    {
      name: "aadhaarFrontFile",
      maxCount: 1,
    },
    {
      name: "aadhaarBackFile",
      maxCount: 1,
    },
    {
      name: "panFrontFile",
      maxCount: 1,
    },
    {
      name: "panBackFile",
      maxCount: 1,
    },
    {
      name: "drivingLicenceFrontFile",
      maxCount: 1,
    },
    {
      name: "drivingLicenceBackFile",
      maxCount: 1,
    },
    {
      name: "documentUpload",
      maxCount: 5,
    },
  ]);