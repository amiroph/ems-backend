const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const { pool } = require("../config/db");

// GET manager dashboard stats
router.get("/stats", protect, authorize("manager"), async (req, res) => {
  try {
    // Get manager's department
    const [emp] = await pool.query(
      `SELECT e.department_id FROM employees e WHERE e.user_id = ?`,
      [req.user.id]
    );
    if (emp.length === 0) {
      return res.json({ teamSize: 0, pendingLeaves: 0, approvedLeaves: 0, activeMembers: 0 });
    }
    const deptId = emp[0].department_id;

    const [[teamSize]] = await pool.query(
      "SELECT COUNT(*) as count FROM employees WHERE department_id = ?", [deptId]
    );
    const [[pendingLeaves]] = await pool.query(
      `SELECT COUNT(*) as count FROM leaves l
       JOIN employees e ON l.employee_id = e.id
       WHERE e.department_id = ? AND l.status = 'pending'`, [deptId]
    );
    const [[approvedLeaves]] = await pool.query(
      `SELECT COUNT(*) as count FROM leaves l
       JOIN employees e ON l.employee_id = e.id
       WHERE e.department_id = ? AND l.status = 'approved'`, [deptId]
    );
    const [[activeMembers]] = await pool.query(
      "SELECT COUNT(*) as count FROM employees WHERE department_id = ? AND status = 'active'", [deptId]
    );

    res.json({
      teamSize: teamSize.count,
      pendingLeaves: pendingLeaves.count,
      approvedLeaves: approvedLeaves.count,
      activeMembers: activeMembers.count,
      departmentId: deptId,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET leave requests for manager's department
router.get("/leave-requests", protect, authorize("manager"), async (req, res) => {
    try {
      const { status } = req.query;
  
      // Get manager's department
      const [emp] = await pool.query(
        "SELECT department_id FROM employees WHERE user_id = ?",
        [req.user.id]
      );
      if (emp.length === 0 || !emp[0].department_id) {
        return res.json([]);
      }
      const deptId = emp[0].department_id;
  
      let query = `
        SELECT l.id, l.type, l.start_date, l.end_date, l.reason,
               l.status, l.created_at, l.reviewed_at,
               u.name as employee_name, u.email as employee_email,
               e.position, d.name as department,
               rv.name as reviewed_by_name
        FROM leaves l
        JOIN employees e ON l.employee_id = e.id
        JOIN users u ON e.user_id = u.id
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN users rv ON l.reviewed_by = rv.id
        WHERE e.department_id = ?
      `;
      const params = [deptId];
  
      if (status) {
        query += " AND l.status = ?";
        params.push(status);
      }
  
      query += " ORDER BY l.created_at DESC";
  
      const [leaves] = await pool.query(query, params);
      res.json(leaves);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

// GET manager's team
router.get("/team", protect, authorize("manager"), async (req, res) => {
  try {
    const [emp] = await pool.query(
      "SELECT department_id FROM employees WHERE user_id = ?", [req.user.id]
    );
    if (emp.length === 0) return res.json([]);
    const [team] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role,
              e.position, e.status, e.hire_date,
              d.name as department
       FROM employees e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.department_id = ?
       ORDER BY u.name ASC`,
      [emp[0].department_id]
    );
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;