const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const { pool } = require("../config/db");

// GET dashboard stats
router.get("/stats", protect, authorize("admin"), async (req, res) => {
  try {
    const [[totalEmployees]] = await pool.query(
      "SELECT COUNT(*) as count FROM employees"
    );
    const [[totalDepartments]] = await pool.query(
      "SELECT COUNT(*) as count FROM departments"
    );
    const [[pendingLeaves]] = await pool.query(
      "SELECT COUNT(*) as count FROM leaves WHERE status = 'pending'"
    );
    const [[activeEmployees]] = await pool.query(
      "SELECT COUNT(*) as count FROM employees WHERE status = 'active'"
    );
    res.json({
      totalEmployees: totalEmployees.count,
      totalDepartments: totalDepartments.count,
      pendingLeaves: pendingLeaves.count,
      activeEmployees: activeEmployees.count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET all users
router.get("/users", protect, authorize("admin"), async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.is_active, u.created_at,
              e.position, d.name as department
       FROM users u
       LEFT JOIN employees e ON u.id = e.user_id
       LEFT JOIN departments d ON e.department_id = d.id
       ORDER BY u.created_at DESC`
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE user
router.post("/users", protect, authorize("admin"), async (req, res) => {
  try {
    const bcrypt = require("bcryptjs");
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?", [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)",
      [name, email, hashed, role, phone || null]
    );
    res.status(201).json({ message: "User created successfully", id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// TOGGLE user active status
router.put("/users/:id/toggle", protect, authorize("admin"), async (req, res) => {
  try {
    const [user] = await pool.query("SELECT is_active FROM users WHERE id = ?", [req.params.id]);
    if (user.length === 0) return res.status(404).json({ message: "User not found" });
    const newStatus = !user[0].is_active;
    await pool.query("UPDATE users SET is_active = ? WHERE id = ?", [newStatus, req.params.id]);
    res.json({ message: newStatus ? "User activated" : "User deactivated" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET all departments
router.get("/departments", protect, authorize("admin", "hr"), async (req, res) => {
  try {
    const [departments] = await pool.query(
      `SELECT d.id, d.name, d.description, d.created_at,
              u.name as manager_name,
              COUNT(e.id) as total_employees
       FROM departments d
       LEFT JOIN users u ON d.manager_id = u.id
       LEFT JOIN employees e ON d.id = e.department_id
       GROUP BY d.id
       ORDER BY d.name ASC`
    );
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE department
router.post("/departments", protect, authorize("admin"), async (req, res) => {
  try {
    const { name, description, manager_id } = req.body;
    if (!name) return res.status(400).json({ message: "Department name is required" });
    const [result] = await pool.query(
      "INSERT INTO departments (name, description, manager_id) VALUES (?, ?, ?)",
      [name, description || null, manager_id || null]
    );
    res.status(201).json({ message: "Department created", id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE department
router.put("/departments/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const { name, description, manager_id } = req.body;
    await pool.query(
      "UPDATE departments SET name = ?, description = ?, manager_id = ? WHERE id = ?",
      [name, description || null, manager_id || null, req.params.id]
    );
    res.json({ message: "Department updated" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE department
router.delete("/departments/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await pool.query("DELETE FROM departments WHERE id = ?", [req.params.id]);
    res.json({ message: "Department deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET recent leaves
router.get("/leaves", protect, authorize("admin", "hr"), async (req, res) => {
  try {
    const [leaves] = await pool.query(
      `SELECT l.id, l.type, l.start_date, l.end_date, l.reason, l.status, l.created_at,
              u.name as employee_name, d.name as department
       FROM leaves l
       JOIN employees e ON l.employee_id = e.id
       JOIN users u ON e.user_id = u.id
       LEFT JOIN departments d ON e.department_id = d.id
       ORDER BY l.created_at DESC LIMIT 20`
    );
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET single user
router.get("/users/:id", protect, authorize("admin"), async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, u.phone, u.is_active, u.created_at,
                e.position, e.salary, e.hire_date, e.status as emp_status,
                d.name as department
         FROM users u
         LEFT JOIN employees e ON u.id = e.user_id
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE u.id = ?`,
        [req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ message: "User not found" });
      res.json(rows[0]);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // UPDATE user
  router.put("/users/:id", protect, authorize("admin"), async (req, res) => {
    try {
      const { name, email, phone, role, is_active } = req.body;
      await pool.query(
        "UPDATE users SET name = ?, email = ?, phone = ?, role = ?, is_active = ? WHERE id = ?",
        [name, email, phone || null, role, is_active, req.params.id]
      );
      res.json({ message: "User updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
 // RESET user password — cannot reset admin passwords
router.put("/users/:id/reset-password", protect, authorize("admin"), async (req, res) => {
    try {
      const bcrypt = require("bcryptjs");
      const { password } = req.body;
  
      if (!password || password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
  
      // Check if target user is admin — block reset
      const [targetUser] = await pool.query(
        "SELECT role FROM users WHERE id = ?", [req.params.id]
      );
      if (targetUser.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      if (targetUser[0].role === "admin") {
        return res.status(403).json({ message: "Admin passwords cannot be reset from here for security reasons." });
      }
  
      const hashed = await bcrypt.hash(password, 10);
      await pool.query("UPDATE users SET password = ? WHERE id = ?", [hashed, req.params.id]);
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // DELETE user
  router.delete("/users/:id", protect, authorize("admin"), async (req, res) => {
    try {
      // Prevent deleting yourself
      if (parseInt(req.params.id) === req.user.id) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }
      await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

module.exports = router;