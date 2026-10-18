import crypto from "crypto";

const key = () =>
  crypto
    .createHash("sha256")
    .update(process.env.PASSWORD_VIEW_KEY || process.env.JWT_SECRET || "")
    .digest();

export const encryptPassword = (plain) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
};

export const decryptPassword = (token) => {
  try {
    if (!token) return null;
    const [iv, tag, data] = token.split(".").map((p) => Buffer.from(p, "base64"));
    const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(data), d.final()]).toString("utf8");
  } catch {
    return null;
  }
};
