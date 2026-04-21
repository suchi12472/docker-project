const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ── MySQL Connection ──────────────────────────────────────
const db = mysql.createConnection({
  host:     process.env.DB_HOST     || 'database',
  user:     process.env.DB_USER     || 'calcuser',
  password: process.env.DB_PASSWORD || 'calcpass',
  database: process.env.DB_NAME     || 'calculatordb'
});

function connectWithRetry() {
  db.connect((err) => {
    if (err) {
      console.log('DB not ready, retrying in 3s...', err.message);
      setTimeout(connectWithRetry, 3000);
    } else {
      console.log('Connected to MySQL!');
      createTable();
    }
  });
}

function createTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS history (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      expression VARCHAR(255) NOT NULL,
      result     VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  db.query(sql, (err) => {
    if (err) console.error('Table creation error:', err);
    else console.log('History table ready!');
  });
}

connectWithRetry();

// ── Routes ────────────────────────────────────────────────

// POST /calculate
app.post('/calculate', (req, res) => {
  const { expression } = req.body;

  if (!expression) {
    return res.status(400).json({ error: 'Expression is required' });
  }

  if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
    return res.status(400).json({ error: 'Invalid expression' });
  }

  let result;
  try {
    result = eval(expression);
    if (!isFinite(result)) {
      return res.status(400).json({ error: 'Cannot divide by zero' });
    }
    result = parseFloat(result.toFixed(10));
  } catch (e) {
    return res.status(400).json({ error: 'Invalid expression' });
  }

  db.query(
    'INSERT INTO history (expression, result) VALUES (?, ?)',
    [expression, result],
    (err) => {
      if (err) {
        console.error('DB insert error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ expression, result });
    }
  );
});

// GET /history
app.get('/history', (req, res) => {
  db.query(
    'SELECT expression, result, created_at FROM history ORDER BY created_at DESC LIMIT 20',
    (err, rows) => {
      if (err) {
        console.error('DB query error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Start Server ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));