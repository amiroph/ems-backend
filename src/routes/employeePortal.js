const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { pool } = require("../config/db");

// GET employee's own profile
router.get("/profile", protect, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
              e.id as employee_id, e.position, e.salary, e.hire_date, e.status,
              d.name as department
       FROM users u
       LEFT JOIN employees e ON u.id = e.user_id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE u.id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Profile not found" });
    res.json({ ...rows[0], salary: parseFloat(rows[0].salary) || 0 });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE own profile (name and phone only)
router.put("/profile", protect, async (req, res) => {
    try {
      const { name, phone } = req.body;
      await pool.query(
        "UPDATE users SET name = ?, phone = ? WHERE id = ?",
        [name, phone || null, req.user.id]
      );
      res.json({ message: "Profile updated" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  // GET leave balance
router.get("/leave-balance", protect, async (req, res) => {
    try {
      const [emp] = await pool.query(
        "SELECT id, hire_date FROM employees WHERE user_id = ?",
        [req.user.id]
      );
      if (emp.length === 0 || !emp[0].hire_date) {
        return res.json({
          totalEntitled: 0,
          usedDays: 0,
          availableDays: 0,
          yearsOfService: 0,
          hireDate: null,
        });
      }
  
      const hireDate = new Date(emp[0].hire_date);
      const today = new Date();
  
      // Calculate years of service
      const yearsOfService = (today - hireDate) / (1000 * 60 * 60 * 24 * 365.25);
  
      // 16 days per year, prorated for partial years
      // Minimum 1 day if they have started
      const totalEntitled = Math.max(1, Math.floor(yearsOfService * 16));
  
      // Get used days from approved leaves in current year
      const currentYear = today.getFullYear();
      const [usedResult] = await pool.query(
        `SELECT SUM(
          DATEDIFF(
            LEAST(end_date, LAST_DAY(CONCAT(?, '-12-31'))),
            GREATEST(start_date, CONCAT(?, '-01-01'))
          ) + 1
        ) as used_days
        FROM leaves
        WHERE employee_id = ?
        AND status = 'approved'
        AND YEAR(start_date) = ?`,
        [currentYear, currentYear, emp[0].id, currentYear]
      );
  
      const usedDays = parseInt(usedResult[0].used_days) || 0;
      const availableDays = Math.max(0, totalEntitled - usedDays);
  
      res.json({
        totalEntitled,
        usedDays,
        availableDays,
        yearsOfService: parseFloat(yearsOfService.toFixed(1)),
        hireDate: emp[0].hire_date,
        currentYear,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });

// GET employee dashboard stats
router.get("/stats", protect, async (req, res) => {
  try {
    const [emp] = await pool.query(
      "SELECT id FROM employees WHERE user_id = ?", [req.user.id]
    );
    if (emp.length === 0) {
      return res.json({ totalLeaves: 0, pendingLeaves: 0, approvedLeaves: 0, rejectedLeaves: 0 });
    }
    const empId = emp[0].id;
    const [[total]] = await pool.query(
      "SELECT COUNT(*) as count FROM leaves WHERE employee_id = ?", [empId]
    );
    const [[pending]] = await pool.query(
      "SELECT COUNT(*) as count FROM leaves WHERE employee_id = ? AND status = 'pending'", [empId]
    );
    const [[approved]] = await pool.query(
      "SELECT COUNT(*) as count FROM leaves WHERE employee_id = ? AND status = 'approved'", [empId]
    );
    const [[rejected]] = await pool.query(
      "SELECT COUNT(*) as count FROM leaves WHERE employee_id = ? AND status = 'rejected'", [empId]
    );
    res.json({
      totalLeaves: total.count,
      pendingLeaves: pending.count,
      approvedLeaves: approved.count,
      rejectedLeaves: rejected.count,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;