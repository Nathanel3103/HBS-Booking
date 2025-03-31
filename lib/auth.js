import jwt from "jsonwebtoken";

export function verifyToken(req) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, "your_secret_key");
  } catch (error) {
    return null;
  }
}
