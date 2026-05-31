const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const { pool } = require("../config/db");

// GET HR dashboard stats
router.get("/stats", protect, authorize("hr"), async (req, res) => {
  try {
    const [[totalEmployees]] = await pool.query(
      "SELECT COUNT(*) as count FROM employees WHERE status = 'active'"
    );
    const [[pendingLeaves]] = await pool.query(
      "SELECT COUNT(*) as count FROM leaves WHERE status = 'pending'"
    );
    const [[totalDepartments]] = await pool.query(
      "SELECT COUNT(*) as count FROM departments"
    );
    const [[newThisMonth]] = await pool.query(
      `SELECT COUNT(*) as count FROM employees
       WHERE MONTH(hire_date) = MONTH(CURDATE())
       AND YEAR(hire_date) = YEAR(CURDATE())`
    );
    res.json({
      totalEmployees: totalEmployees.count,
      pendingLeaves: pendingLeaves.count,
      totalDepartments: totalDepartments.count,
      newThisMonth: newThisMonth.count,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;