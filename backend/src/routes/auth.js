// src/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const data = require("../data");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

function issueToken(user) {
  const payload = { id: user.id, name: user.name, role: user.role, username: user.username };
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "12h",
  });
  return { token, user: payload };
}

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
      await bcrypt.compare(password, "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUV");
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    res.json(issueToken(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong logging in" });
  }
});

router.post("/logout", requireAuth, (req, res) => {
  res.json({ message: "Logged out" });
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await data.findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// PATCH /api/auth/profile — update display name / username
router.patch("/profile", requireAuth, async (req, res) => {
  const name = req.body?.name !== undefined ? String(req.body.name).trim().slice(0, 120) : undefined;
  const username =
    req.body?.username !== undefined
      ? String(req.body.username).trim().slice(0, 60)
      : undefined;

  if (name !== undefined && !name) {
    return res.status(422).json({ message: "name cannot be empty" });
  }
  if (username !== undefined && !username) {
    return res.status(422).json({ message: "username cannot be empty" });
  }
  if (name === undefined && username === undefined) {
    return res.status(422).json({ message: "Provide name and/or username" });
  }

  try {
    const user = await data.updateUserProfile(req.user.id, { name, username });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(issueToken(user));
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Username already in use" });
    }
    console.error(err);
    res.status(500).json({ message: "Couldn't update profile" });
  }
});

// POST /api/auth/change-password
router.post("/change-password", requireAuth, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || "").slice(0, 200);
  const newPassword = String(req.body?.newPassword || "").slice(0, 200);

  if (!currentPassword || !newPassword) {
    return res.status(422).json({ message: "currentPassword and newPassword are required" });
  }
  if (newPassword.length < 8) {
    return res.status(422).json({ message: "New password must be at least 8 characters" });
  }

  try {
    const profile = await data.findUserById(req.user.id);
    if (!profile) return res.status(404).json({ message: "User not found" });

    const account = await data.findUserByUsername(profile.username);
    if (!account) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(currentPassword, account.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await data.changeUserPassword(account.id, password_hash);
    res.json({ message: "Password updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't change password" });
  }
});

// GET /api/auth/users — owner lists staff
router.get("/users", requireAuth, requireRole("owner"), async (req, res) => {
  try {
    const users = await data.listStaffUsers();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Couldn't list users" });
  }
});

// POST /api/auth/users — owner creates assistant (or another owner)
router.post("/users", requireAuth, requireRole("owner"), async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 120);
  const username = String(req.body?.username || "").trim().slice(0, 60);
  const password = String(req.body?.password || "").slice(0, 200);
  const role = String(req.body?.role || "assistant").trim();

  if (!name || !username || !password) {
    return res.status(422).json({ message: "name, username, and password are required" });
  }
  if (password.length < 8) {
    return res.status(422).json({ message: "Password must be at least 8 characters" });
  }
  if (!["owner", "assistant"].includes(role)) {
    return res.status(422).json({ message: "role must be owner or assistant" });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const user = await data.createStaffUser({ name, username, password_hash, role });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Username already in use" });
    }
    console.error(err);
    res.status(500).json({ message: "Couldn't create user" });
  }
});

module.exports = router;
