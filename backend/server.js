const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

db.connect((err) => {
    if (err) throw err;
    console.log("🔥 Premium Database Connected!");
});

// --- AUTHENTICATION (Signup & Login) ---
app.post('/api/signup', (req, res) => {
    const { name, email, password } = req.body;
    db.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, password], (err, result) => {
        if (err) {
            console.log("❌ MySQL Signup Error:", err.message); // Yeh terminal me asli error print karega
            return res.status(400).json({ error: err.message }); // Asli error browser ko bhejega
        }
        res.status(200).json({ message: "Signup successful", userId: result.insertId });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.query("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, results) => {
        if (err) return res.status(500).json({ error: "DB Error" });
        if (results.length === 0) return res.status(401).json({ error: "Galat Email ya Password" });
        res.status(200).json({ message: "Login successful", user: results[0] });
    });
});

// --- SECTIONS (Monthly Budget Folders) ---
app.get('/api/sections/:userId/:monthYear', (req, res) => {
    const { userId, monthYear } = req.params;
    db.query("SELECT * FROM sections WHERE user_id = ? AND month_year = ?", [userId, monthYear], (err, results) => {
        if (err) return res.status(500).json({ error: "Fetch error" });
        res.status(200).json(results);
    });
});

app.post('/api/sections', (req, res) => {
    const { user_id, month_year, sectionName, totalBudget } = req.body;
    db.query("INSERT INTO sections (user_id, month_year, sectionName, totalBudget) VALUES (?, ?, ?, ?)", 
    [user_id, month_year, sectionName, totalBudget], (err, result) => {
        if (err) return res.status(500).json({ error: "DB error" });
        res.status(200).json({ message: "Section added" });
    });
});

app.delete('/api/sections/:id', (req, res) => {
    db.query("DELETE FROM sections WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "DB error" });
        res.status(200).json({ message: "Deleted" });
    });
});

// --- EXPENSES ---
app.get('/api/expenses/:sectionId', (req, res) => {
    db.query("SELECT * FROM expenses WHERE section_id = ?", [req.params.sectionId], (err, results) => {
        if (err) return res.status(500).json({ error: "Fetch error" });
        res.status(200).json(results);
    });
});

// app.post('/api/expenses', (req, res) => {
//     const { section_id, itemName, amount } = req.body;
//     db.query("INSERT INTO expenses (section_id, itemName, amount) VALUES (?, ?, ?)", 
//     [section_id, itemName, amount], (err, result) => {
//         if (err) return res.status(500).json({ error: "DB error" });
//         res.status(200).json({ message: "Expense added" });
//     });
// });
app.post('/api/expenses', (req, res) => {
    // Yahan expense_date add kiya gaya hai
    const { section_id, itemName, amount, expense_date } = req.body;
    db.query("INSERT INTO expenses (section_id, itemName, amount, expense_date) VALUES (?, ?, ?, ?)", 
    [section_id, itemName, amount, expense_date], (err, result) => {
        if (err) return res.status(500).json({ error: "DB error" });
        res.status(200).json({ message: "Expense added" });
    });
});

app.delete('/api/expenses/:id', (req, res) => {
    db.query("DELETE FROM expenses WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "DB error" });
        res.status(200).json({ message: "Deleted" });
    });
});

// Expense Edit karne ke liye route
app.put('/api/expenses/:id', (req, res) => {
    const { itemName, amount } = req.body;
    db.query("UPDATE expenses SET itemName = ?, amount = ? WHERE id = ?", [itemName, amount, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: "DB error" });
        res.status(200).json({ message: "Expense updated" });
    });
});

app.listen(5001, () => console.log('🚀 Backend running on port 5001'));
