const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = process.env.NODE_ENV === 'production'
  ? path.join('/tmp', 'pfc_designs.db')
  : path.join(__dirname, 'pfc_designs.db');

const db = new Database(dbPath);

// Create designs table
db.exec(`
  CREATE TABLE IF NOT EXISTS designs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    vin_min REAL NOT NULL,
    vin_max REAL NOT NULL,
    vout REAL NOT NULL,
    pout REAL NOT NULL,
    fsw REAL NOT NULL,
    n_phases INTEGER NOT NULL,
    ripple_ratio REAL NOT NULL,
    efficiency REAL NOT NULL,
    vout_ripple REAL NOT NULL,
    l_per_phase REAL,
    delta_il REAL,
    il_peak_phase REAL,
    cout REAL,
    thd_estimate REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all designs
app.get('/api/designs', (req, res) => {
  try {
    const designs = db.prepare('SELECT * FROM designs ORDER BY created_at DESC').all();
    res.json({ success: true, data: designs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single design
app.get('/api/designs/:id', (req, res) => {
  try {
    const design = db.prepare('SELECT * FROM designs WHERE id = ?').get(req.params.id);
    if (!design) {
      return res.status(404).json({ success: false, error: 'Design not found' });
    }
    res.json({ success: true, data: design });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create design
app.post('/api/designs', (req, res) => {
  try {
    const {
      name, vin_min, vin_max, vout, pout, fsw,
      n_phases, ripple_ratio, efficiency, vout_ripple,
      l_per_phase, delta_il, il_peak_phase, cout, thd_estimate
    } = req.body;

    const result = db.prepare(`
      INSERT INTO designs (name, vin_min, vin_max, vout, pout, fsw, n_phases,
        ripple_ratio, efficiency, vout_ripple, l_per_phase, delta_il,
        il_peak_phase, cout, thd_estimate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, vin_min, vin_max, vout, pout, fsw, n_phases,
      ripple_ratio, efficiency, vout_ripple, l_per_phase, delta_il,
      il_peak_phase, cout, thd_estimate
    );

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update design
app.put('/api/designs/:id', (req, res) => {
  try {
    const {
      name, vin_min, vin_max, vout, pout, fsw,
      n_phases, ripple_ratio, efficiency, vout_ripple,
      l_per_phase, delta_il, il_peak_phase, cout, thd_estimate
    } = req.body;

    const result = db.prepare(`
      UPDATE designs SET
        name = ?, vin_min = ?, vin_max = ?, vout = ?, pout = ?, fsw = ?,
        n_phases = ?, ripple_ratio = ?, efficiency = ?, vout_ripple = ?,
        l_per_phase = ?, delta_il = ?, il_peak_phase = ?, cout = ?, thd_estimate = ?
      WHERE id = ?
    `).run(
      name, vin_min, vin_max, vout, pout, fsw, n_phases,
      ripple_ratio, efficiency, vout_ripple, l_per_phase, delta_il,
      il_peak_phase, cout, thd_estimate, req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Design not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete design
app.delete('/api/designs/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM designs WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Design not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Calculate PFC parameters (stateless)
app.post('/api/calculate', (req, res) => {
  try {
    const { vin_min, vout, pout, fsw, n_phases, ripple_ratio, efficiency } = req.body;

    const vin_min_dc = vin_min * Math.sqrt(2);
    const duty_max = 1 - vin_min_dc / vout;
    const iin_avg_max = pout / (efficiency * vin_min_dc);
    const il_peak_total = iin_avg_max * Math.sqrt(2);
    const l_per_phase = (vin_min_dc * duty_max) / (ripple_ratio * (il_peak_total / n_phases) * fsw);
    const delta_il = (vin_min_dc * duty_max) / (l_per_phase * fsw);
    const il_peak_phase = il_peak_total / n_phases + delta_il / 2;
    const il_rms_phase = Math.sqrt(Math.pow(iin_avg_max / n_phases, 2) + Math.pow(delta_il / (2 * Math.sqrt(3)), 2));
    const cout = (pout / vout) / (2 * Math.PI * 50 * 10);
    const thd_estimate = (delta_il / (2 * Math.sqrt(3))) / (iin_avg_max / Math.sqrt(2)) * 100;

    res.json({
      success: true,
      data: {
        duty_max,
        iin_avg_max,
        il_peak_total,
        l_per_phase,
        delta_il,
        il_peak_phase,
        il_rms_phase,
        cout,
        thd_estimate,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Interleaved PFC Server running on port ${PORT}`);
  console.log(`Database: ${dbPath}`);
});
