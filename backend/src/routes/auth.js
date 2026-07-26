// src/routes/auth.js
// Reference: docs/API_Schema_Regimens.docx (Authentication), User Story 9
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const data = require("../data");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const username = String(req.body?.username || "").trim().slice(0, 60);
  const password = String(req.body?.password || "").slice(0, 200);
  if (!username || !password) {
    return res.status(422).json({ message: "username and password are required" });
  }

  try {
    const user = await data.findUserByUsername(username);

    if (!user) {
      // Constant-ish response path; avoid username enumeration.
      await bcrypt.compare(password, "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUV");
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const payload = { id: user.id, name: user.name, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "12h",
    });

    res.json({ token, user: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong logging in" });
  }
});

// POST /api/auth/logout
// Stateless JWT — nothing to invalidate server-side; the client just discards the token.
router.post("/logout", requireAuth, (req, res) => {
  res.json({ message: "Logged out" });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await data.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
