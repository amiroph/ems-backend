const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const { pool } = require("../config/db");
const bcrypt = require("bcryptjs");

// GET all employees
router.get("/", protect, authorize("admin", "hr", "manager"), async (req, res) => {
  try {
    const { department, status, search } = req.query;
    let query = `
      SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
             e.id as employee_id, e.position, e.salary, e.hire_date, e.status,
             d.id as department_id, d.name as department
      FROM users u
      JOIN employees e ON u.id = e.user_id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE u.role != 'admin'
    `;
    const params = [];

    if (department) { query += " AND d.id = ?"; params.push(department); }
    if (status) { query += " AND e.status = ?"; params.push(status); }
    if (search) {
      query += " AND (u.name LIKE ? OR u.email LIKE ? OR e.position LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += " ORDER BY u.created_at DESC";

    const [employees] = await pool.query(query, params);
    res.json(employees.map(e => ({
      ...e,
      salary: parseFloat(e.salary) || 0,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET leave balance for any employee (admin/hr)
router.get("/:id/leave-balance", protect, authorize("admin", "hr", "manager"), async (req, res) => {
  try {
    const [emp] = await pool.query(
      "SELECT id, hire_date FROM employees WHERE user_id = ?",
      [req.params.id]
    );
    if (emp.length === 0 || !emp[0].hire_date) {
      return res.json({ totalEntitled: 0, usedDays: 0, availableDays: 0, yearsOfService: 0 });
    }

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

    res.json({
      totalEntitled,
      usedDays,
      availableDays,
      yearsOfService: parseFloat(yearsOfService.toFixed(1)),
      hireDate: emp[0].hire_date,
      currentYear,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET single employee
router.get("/:id", protect, authorize("admin", "hr", "manager"), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.created_at,
              e.id as employee_id, e.position, e.salary, e.hire_date, e.status,
              d.id as department_id, d.name as department
       FROM users u
       JOIN employees e ON u.id = e.user_id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE u.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Employee not found" });
    res.json({ ...rows[0], salary: parseFloat(rows[0].salary) || 0 });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE employee
router.post("/", protect, authorize("admin", "hr"), async (req, res) => {
  try {
    const { name, email, password, phone, role, position, department_id, salary, hire_date } = req.body;
    if (!name || !email || !password || !position) {
      return res.status(400).json({ message: "Name, email, password and position are required" });
    }
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const userRole = ["hr", "manager", "employee"].includes(role) ? role : "employee";
    const [userResult] = await pool.query(
      "INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)",
      [name, email, hashed, userRole, phone || null]
    );
    const userId = userResult.insertId;
    await pool.query(
      "INSERT INTO employees (user_id, department_id, position, salary, hire_date) VALUES (?, ?, ?, ?, ?)",
      [userId, department_id || null, position, salary || 0, hire_date || null]
    );
    res.status(201).json({ message: "Employee created successfully", id: userId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE employee
router.put("/:id", protect, authorize("admin", "hr"), async (req, res) => {
  try {
    const { name, phone, position, department_id, salary, hire_date, status, role } = req.body;
    await pool.query(
      "UPDATE users SET name = ?, phone = ? WHERE id = ?",
      [name, phone || null, req.params.id]
    );
    await pool.query(
      "UPDATE employees SET position = ?, department_id = ?, salary = ?, hire_date = ?, status = ? WHERE user_id = ?",
      [position, department_id || null, salary || 0, hire_date || null, status || "active", req.params.id]
    );
    if (role) {
      await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, req.params.id]);
    }
    res.json({ message: "Employee updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE employee
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    await pool.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;