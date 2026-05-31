const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const { pool } = require("../config/db");

// GET all leaves (admin/hr/manager)
router.get("/", protect, authorize("admin", "hr", "manager"), async (req, res) => {
  try {
    const { status, department } = req.query;
    let query = `
      SELECT l.id, l.type, l.start_date, l.end_date, l.reason, l.status,
             l.created_at, l.reviewed_at,
             u.name as employee_name, u.email as employee_email,
             e.position, d.name as department,
             rv.name as reviewed_by_name
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users rv ON l.reviewed_by = rv.id
      WHERE 1=1
    `;
    const params = [];
    if (status) { query += " AND l.status = ?"; params.push(status); }
    if (department) { query += " AND d.id = ?"; params.push(department); }
    query += " ORDER BY l.created_at DESC";
    const [leaves] = await pool.query(query, params);
    res.json(leaves);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET my leaves (employee)
router.get("/my", protect, async (req, res) => {
  try {
    const [emp] = await pool.query(
      "SELECT id FROM employees WHERE user_id = ?", [req.user.id]
    );
    if (emp.length === 0) return res.json([]);
    const [leaves] = await pool.query(
      `SELECT l.*, rv.name as reviewed_by_name
       FROM leaves l
       LEFT JOIN users rv ON l.reviewed_by = rv.id
       WHERE l.employee_id = ?
       ORDER BY l.created_at DESC`,
      [emp[0].id]
    );
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// APPLY for leave (employee AND manager)
router.post("/", protect, async (req, res) => {
  try {
    const { type, start_date, end_date, reason } = req.body;

    if (!type || !start_date || !end_date) {
      return res.status(400).json({ message: "Type, start date and end date are required" });
    }

    const [emp] = await pool.query(
      "SELECT id, hire_date FROM employees WHERE user_id = ?",
      [req.user.id]
    );
    if (emp.length === 0) {
      return res.status(404).json({ message: "Employee record not found. Contact admin." });
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (end < start) {
      return res.status(400).json({ message: "End date cannot be before start date" });
    }

    // Calculate requested days
    const requestedDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Only check balance for annual leave
    if (type === "annual") {
      const hireDate = new Date(emp[0].hire_date);
      const today = new Date();
      const yearsOfService = (today - hireDate) / (1000 * 60 * 60 * 24 * 365.25);
      const totalEntitled = Math.max(1, Math.floor(yearsOfService * 16));

      const currentYear = today.getFullYear();
      const [usedResult] = await pool.query(
        `SELECT SUM(
          DATEDIFF(
            LEAST(end_date, LAST_DAY(CONCAT(?, '-12-31'))),
            GREATEST(start_date, CONCAT(?, '-01-01'))
          ) + 1
        ) as used_days
        FROM leaves
        WHERE employee_id = ? AND status = 'approved' AND YEAR(start_date) = ?`,
        [currentYear, currentYear, emp[0].id, currentYear]
      );

      const usedDays = parseInt(usedResult[0].used_days) || 0;
      const availableDays = Math.max(0, totalEntitled - usedDays);

      if (requestedDays > availableDays) {
        return res.status(400).json({
          message: `Insufficient leave balance. You have ${availableDays} day${availableDays !== 1 ? "s" : ""} available but requested ${requestedDays} day${requestedDays !== 1 ? "s" : ""}.`,
        });
      }
    }

    const [result] = await pool.query(
      "INSERT INTO leaves (employee_id, type, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?)",
      [emp[0].id, type, start_date, end_date, reason || null]
    );

    res.status(201).json({
      message: "Leave request submitted successfully",
      id: result.insertId,
      requestedDays,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// APPROVE or REJECT leave
router.put("/:id/status", protect, authorize("admin", "hr", "manager"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const [leave] = await pool.query("SELECT * FROM leaves WHERE id = ?", [req.params.id]);
    if (leave.length === 0) return res.status(404).json({ message: "Leave not found" });
    await pool.query(
      "UPDATE leaves SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?",
      [status, req.user.id, req.params.id]
    );
    res.json({ message: `Leave ${status} successfully` });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE leave (employee can cancel pending)
router.delete("/:id", protect, async (req, res) => {
  try {
    const [emp] = await pool.query(
      "SELECT id FROM employees WHERE user_id = ?", [req.user.id]
    );
    const [leave] = await pool.query(
      "SELECT * FROM leaves WHERE id = ? AND employee_id = ? AND status = 'pending'",
      [req.params.id, emp[0]?.id]
    );
    if (leave.length === 0) {
      return res.status(404).json({ message: "Leave not found or cannot be cancelled" });
    }
    await pool.query("DELETE FROM leaves WHERE id = ?", [req.params.id]);
    res.json({ message: "Leave cancelled" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;