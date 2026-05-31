const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const { pool } = require("../config/db");

// GET employee report
router.get("/employees", protect, authorize("admin", "hr"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
              e.position, e.salary, e.hire_date, e.status,
              d.name as department
       FROM users u
       JOIN employees e ON u.id = e.user_id
       LEFT JOIN departments d ON e.department_id = d.id
       ORDER BY d.name ASC, u.name ASC`
    );
    res.json(rows.map(r => ({ ...r, salary: parseFloat(r.salary) || 0 })));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET department summary report
router.get("/departments", protect, authorize("admin", "hr"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.id, d.name, d.description,
              u.name as manager_name,
              COUNT(e.id) as total_employees,
              SUM(CASE WHEN e.status = 'active' THEN 1 ELSE 0 END) as active_employees,
              CAST(AVG(e.salary) AS DECIMAL(10,2)) as avg_salary,
              CAST(SUM(e.salary) AS DECIMAL(10,2)) as total_salary
       FROM departments d
       LEFT JOIN users u ON d.manager_id = u.id
       LEFT JOIN employees e ON d.id = e.department_id
       GROUP BY d.id
       ORDER BY d.name ASC`
    );
    res.json(rows.map(r => ({
      ...r,
      avg_salary: parseFloat(r.avg_salary) || 0,
      total_salary: parseFloat(r.total_salary) || 0,
    })));
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET leave summary report
router.get("/leaves", protect, authorize("admin", "hr"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.name as employee_name, d.name as department,
              e.position,
              COUNT(l.id) as total_leaves,
              SUM(CASE WHEN l.status = 'approved' THEN 1 ELSE 0 END) as approved,
              SUM(CASE WHEN l.status = 'pending' THEN 1 ELSE 0 END) as pending,
              SUM(CASE WHEN l.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
              SUM(CASE WHEN l.type = 'annual' THEN 1 ELSE 0 END) as annual,
              SUM(CASE WHEN l.type = 'sick' THEN 1 ELSE 0 END) as sick,
              SUM(CASE WHEN l.type = 'emergency' THEN 1 ELSE 0 END) as emergency
       FROM employees e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN leaves l ON e.id = l.employee_id
       GROUP BY e.id
       ORDER BY total_leaves DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET overview stats for reports
router.get("/overview", protect, authorize("admin", "hr"), async (req, res) => {
  try {
    const [[totalEmp]] = await pool.query("SELECT COUNT(*) as count FROM employees");
    const [[activeEmp]] = await pool.query("SELECT COUNT(*) as count FROM employees WHERE status = 'active'");
    const [[totalDept]] = await pool.query("SELECT COUNT(*) as count FROM departments");
    const [[totalLeaves]] = await pool.query("SELECT COUNT(*) as count FROM leaves");
    const [[approvedLeaves]] = await pool.query("SELECT COUNT(*) as count FROM leaves WHERE status = 'approved'");
    const [[pendingLeaves]] = await pool.query("SELECT COUNT(*) as count FROM leaves WHERE status = 'pending'");
    const [[totalSalary]] = await pool.query("SELECT CAST(SUM(salary) AS DECIMAL(10,2)) as total FROM employees WHERE status = 'active'");
    const [deptDist] = await pool.query(
      `SELECT d.name, COUNT(e.id) as count
       FROM departments d
       LEFT JOIN employees e ON d.id = e.department_id
       GROUP BY d.id ORDER BY count DESC`
    );
    res.json({
      totalEmployees: totalEmp.count,
      activeEmployees: activeEmp.count,
      totalDepartments: totalDept.count,
      totalLeaves: totalLeaves.count,
      approvedLeaves: approvedLeaves.count,
      pendingLeaves: pendingLeaves.count,
      totalSalary: parseFloat(totalSalary.total) || 0,
      departmentDistribution: deptDist,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;