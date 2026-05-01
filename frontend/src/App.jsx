import { useState, useCallback } from "react";
import { Activity, Heart, Thermometer, Wind, Droplets, User, Scale, Zap, Microscope, FlaskConical, ChevronRight, AlertCircle, Loader2, BarChart3, BrainCircuit, TrendingUp, Clock, CheckCircle2, ArrowLeft } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const API_BASE = "";

const FIELDS = [
  {
    key: "Heart_Rate", label: "Heart Rate", unit: "bpm",
    icon: Heart, min: 40, max: 180, step: 1, default: 78,
    hint: "Normal: 60–100 bpm",
    color: "#ef4444",
  },
  {
    key: "BP_Systolic", label: "BP Systolic", unit: "mmHg",
    icon: Activity, min: 70, max: 220, step: 1, default: 122,
    hint: "Normal: <120 mmHg",
    color: "#f97316",
  },
  {
    key: "BP_Diastolic", label: "BP Diastolic", unit: "mmHg",
    icon: Activity, min: 40, max: 140, step: 1, default: 80,
    hint: "Normal: <80 mmHg",
    color: "#f59e0b",
  },
  {
    key: "Temperature", label: "Temperature", unit: "°F",
    icon: Thermometer, min: 95, max: 106, step: 0.1, default: 98.6,
    hint: "Normal: 97–99°F",
    color: "#22c55e",
  },
  {
    key: "SpO2", label: "SpO₂", unit: "%",
    icon: Wind, min: 80, max: 100, step: 1, default: 97,
    hint: "Normal: 95–100%",
    color: "#06b6d4",
  },
  {
    key: "Age", label: "Age", unit: "years",
    icon: User, min: 1, max: 120, step: 1, default: 45,
    hint: "Patient age",
    color: "#8b5cf6",
  },
  {
    key: "BMI", label: "BMI", unit: "kg/m²",
    icon: Scale, min: 10, max: 60, step: 0.1, default: 24.5,
    hint: "Normal: 18.5–24.9",
    color: "#ec4899",
  },
  {
    key: "Glucose_Level", label: "Glucose", unit: "mg/dL",
    icon: Droplets, min: 50, max: 400, step: 1, default: 98,
    hint: "Fasting normal: 70–100",
    color: "#14b8a6",
  },
  {
    key: "WBC_Count", label: "WBC Count", unit: "×10³/µL",
    icon: Microscope, min: 1, max: 30, step: 0.1, default: 7.2,
    hint: "Normal: 4.5–11.0",
    color: "#6366f1",
  },
  {
    key: "Hemoglobin", label: "Hemoglobin", unit: "g/dL",
    icon: FlaskConical, min: 5, max: 20, step: 0.1, default: 13.8,
    hint: "Normal: 12–17.5",
    color: "#f43f5e",
  },
];

const getRecoveryClass = (days) => {
  if (days < 5) return { label: "Fast Recovery", tier: "fast", color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.35)" };
  if (days <= 10) return { label: "Moderate Recovery", tier: "moderate", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)" };
  return { label: "Extended Recovery", tier: "slow", color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)" };
};

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function VitalInput({ field, value, error, onChange }) {
  const Icon = field.icon;
  return (
    <div className="vital-card" style={{ "--accent": field.color }}>
      <div className="vital-header">
        <div className="vital-icon" style={{ background: `${field.color}22`, borderColor: `${field.color}44` }}>
          <Icon size={16} color={field.color} />
        </div>
        <div>
          <div className="vital-label">{field.label}</div>
          <div className="vital-hint">{field.hint}</div>
        </div>
        <div className="vital-unit">{field.unit}</div>
      </div>
      <div className="vital-input-wrap">
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          className={`vital-input ${error ? "vital-input--error" : ""}`}
          placeholder={String(field.default)}
        />
        {error && <span className="vital-error"><AlertCircle size={11} /> {error}</span>}
      </div>
      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value || field.default}
        onChange={(e) => onChange(field.key, e.target.value)}
        className="vital-slider"
        style={{ "--pct": `${((Number(value || field.default) - field.min) / (field.max - field.min)) * 100}%` }}
      />
    </div>
  );
}

function RecoveryMeter({ days }) {
  const { label, color, bg, border } = getRecoveryClass(days);
  const pct = Math.min((days / 30) * 100, 100);

  return (
    <div className="meter-wrap" style={{ background: bg, borderColor: border }}>
      <div className="meter-days" style={{ color }}>{days.toFixed(1)}</div>
      <div className="meter-unit">days to recovery</div>
      <div className="meter-label" style={{ color, background: `${color}22`, border: `1px solid ${color}44` }}>
        {label}
      </div>
      <div className="meter-bar-bg">
        <div className="meter-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
      </div>
      <div className="meter-scale">
        <span style={{ color: "#22c55e" }}>Fast (&lt;5d)</span>
        <span style={{ color: "#f59e0b" }}>Moderate (5–10d)</span>
        <span style={{ color: "#ef4444" }}>Extended (&gt;10d)</span>
      </div>
    </div>
  );
}

function ExplainCard({ title, subtitle, icon: Icon, plot, color }) {
  return (
    <div className="explain-card">
      <div className="explain-card-header">
        <div className="explain-icon" style={{ background: `${color}22`, borderColor: `${color}44` }}>
          <Icon size={18} color={color} />
        </div>
        <div>
          <div className="explain-title">{title}</div>
          <div className="explain-subtitle">{subtitle}</div>
        </div>
      </div>
      {plot ? (
        <img src={`data:image/png;base64,${plot}`} alt={title} className="explain-plot" />
      ) : (
        <div className="explain-empty">No plot available</div>
      )}
    </div>
  );
}

function TopFeatureChips({ features }) {
  if (!features?.length) return null;
  return (
    <div className="chips-wrap">
      <div className="chips-label"><Zap size={13} /> Top Drivers</div>
      <div className="chips">
        {features.map((f, i) => {
          const isPos = f.value > 0;
          const color = isPos ? "#ef4444" : "#22d3ee";
          return (
            <div key={i} className="chip" style={{ background: `${color}18`, borderColor: `${color}40`, color }}>
              <span>{f.name}</span>
              <span className="chip-val">{isPos ? "+" : ""}{f.value.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────

export default function App() {
  const defaultValues = Object.fromEntries(FIELDS.map(f => [f.key, String(f.default)]));
  const [values, setValues] = useState(defaultValues);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [activeTab, setActiveTab] = useState("shap");

  const handleChange = useCallback((key, val) => {
    setValues(prev => ({ ...prev, [key]: val }));
    setErrors(prev => ({ ...prev, [key]: "" }));
  }, []);

  const validate = () => {
    const errs = {};
    FIELDS.forEach(f => {
      const v = Number(values[f.key]);
      if (!values[f.key] && values[f.key] !== 0) { errs[f.key] = "Required"; return; }
      if (isNaN(v)) { errs[f.key] = "Must be a number"; return; }
      if (v < f.min || v > f.max) errs[f.key] = `Range: ${f.min}–${f.max}`;
    });
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError(null);
    setResult(null);

    const payload = Object.fromEntries(FIELDS.map(f => [f.key, Number(values[f.key])]));

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
      setActiveTab("shap");
    } catch (e) {
      setApiError(e.message || "Failed to reach the prediction API.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setApiError(null);
    setErrors({});
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="header-inner">
            <div className="logo">
              <div className="logo-icon"><Heart size={20} color="#ef4444" /></div>
              <div>
                <div className="logo-title">RecoveryAI</div>
                <div className="logo-sub">ML-Powered Healthcare Analytics</div>
              </div>
            </div>
            <div className="header-badges">
              <span className="badge"><CheckCircle2 size={11} /> LightGBM + ExtraTrees</span>
              <span className="badge"><BrainCircuit size={11} /> SHAP + LIME XAI</span>
            </div>
          </div>
        </header>

        <main className="main">
          {!result ? (
            <>
              {/* Hero */}
              <div className="hero">
                <div className="hero-tag"><TrendingUp size={13} /> Stacking Ensemble Model</div>
                <h1 className="hero-title">Patient Recovery<br /><em>Time Prediction</em></h1>
                <p className="hero-desc">
                  Enter patient vitals and lab values to predict recovery duration with AI-driven explanations using SHAP and LIME.
                </p>
              </div>

              {/* Form */}
              <section className="form-section">
                <div className="section-label"><Activity size={14} /> Vital Signs &amp; Lab Values</div>
                <div className="vitals-grid">
                  {FIELDS.map(field => (
                    <VitalInput
                      key={field.key}
                      field={field}
                      value={values[field.key]}
                      error={errors[field.key]}
                      onChange={handleChange}
                    />
                  ))}
                </div>

                {apiError && (
                  <div className="api-error">
                    <AlertCircle size={15} />
                    <span>{apiError}</span>
                  </div>
                )}

                <button className="predict-btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <><Loader2 size={18} className="spin" /> Analysing Patient Data…</>
                  ) : (
                    <><BrainCircuit size={18} /> Predict Recovery Time <ChevronRight size={16} /></>
                  )}
                </button>
              </section>
            </>
          ) : (
            /* Results */
            <div className="results">
              <button className="back-btn" onClick={resetForm}>
                <ArrowLeft size={15} /> New Prediction
              </button>

              <div className="results-grid">
                {/* Left: prediction */}
                <div className="results-left">
                  <div className="section-label"><Clock size={14} /> Prediction Result</div>
                  <RecoveryMeter days={result.recovery_days} />
                  <TopFeatureChips features={result.top_features} />

                  {/* Input summary */}
                  <div className="input-summary">
                    <div className="section-label" style={{ marginBottom: 10 }}><Activity size={13} /> Input Summary</div>
                    <div className="summary-grid">
                      {FIELDS.map(f => (
                        <div key={f.key} className="summary-item">
                          <span className="summary-key" style={{ color: f.color }}>{f.label}</span>
                          <span className="summary-val">{result.input_summary?.[f.key]?.toFixed?.(1) ?? values[f.key]} <small>{f.unit}</small></span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: explanations */}
                <div className="results-right">
                  <div className="section-label"><BrainCircuit size={14} /> Explainable AI</div>
                  <div className="tabs">
                    {[
                      { id: "shap", label: "SHAP", icon: BarChart3, color: "#22d3ee" },
                      { id: "lime", label: "LIME", icon: BrainCircuit, color: "#a78bfa" },
                    ].map(t => (
                      <button
                        key={t.id}
                        className={`tab-btn ${activeTab === t.id ? "tab-btn--active" : ""}`}
                        style={activeTab === t.id ? { borderColor: t.color, color: t.color } : {}}
                        onClick={() => setActiveTab(t.id)}
                      >
                        <t.icon size={14} /> {t.label} Explanation
                      </button>
                    ))}
                  </div>

                  {activeTab === "shap" && (
                    <ExplainCard
                      title="SHAP Feature Attribution"
                      subtitle="Global model explanation — how each feature shifts the prediction from the baseline"
                      icon={BarChart3}
                      plot={result.shap_plot}
                      color="#22d3ee"
                    />
                  )}
                  {activeTab === "lime" && (
                    <ExplainCard
                      title="LIME Local Explanation"
                      subtitle="Local surrogate model — feature contributions specific to this patient's data point"
                      icon={BrainCircuit}
                      plot={result.lime_plot}
                      color="#a78bfa"
                    />
                  )}

                  <div className="xai-legend">
                    <div className="xai-legend-title">Interpretation Guide</div>
                    <div className="xai-legend-items">
                      <div className="xai-legend-item">
                        <div className="xai-dot" style={{ background: "#ef4444" }} />
                        <span>Red / Orange bars → feature <strong>increases</strong> predicted recovery time</span>
                      </div>
                      <div className="xai-legend-item">
                        <div className="xai-dot" style={{ background: "#22d3ee" }} />
                        <span>Blue / Purple bars → feature <strong>decreases</strong> predicted recovery time</span>
                      </div>
                      <div className="xai-legend-item">
                        <div className="xai-dot" style={{ background: "#94a3b8" }} />
                        <span>Bar length represents magnitude of impact</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="footer">
          <span>RecoveryAI — ML Healthcare Dashboard</span>
          <span>LightGBM · ExtraTrees · ElasticNet Stacking</span>
          <span>SHAP · LIME Explainability</span>
        </footer>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #060d1a;
    --surface: #0d1b2e;
    --surface2: #111f33;
    --border: #1d3555;
    --border2: #263f5e;
    --text: #e2eaf5;
    --text2: #7a9cbf;
    --text3: #4a6a8a;
    --accent: #00d4ff;
    --radius: 14px;
    --font: 'Syne', sans-serif;
    --mono: 'DM Mono', monospace;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font);
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* Animated grid background */
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-image:
      linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px);
    background-size: 48px 48px;
  }

  /* ── Header ── */
  .header {
    border-bottom: 1px solid var(--border);
    background: rgba(6,13,26,0.85);
    backdrop-filter: blur(12px);
    position: sticky; top: 0; z-index: 50;
  }
  .header-inner {
    max-width: 1200px; margin: 0 auto; padding: 16px 28px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .logo { display: flex; align-items: center; gap: 12px; }
  .logo-icon {
    width: 40px; height: 40px; border-radius: 10px;
    background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3);
    display: grid; place-items: center;
  }
  .logo-title { font-size: 18px; font-weight: 800; color: var(--text); letter-spacing: -0.3px; }
  .logo-sub { font-size: 11px; color: var(--text3); font-family: var(--mono); }
  .header-badges { display: flex; gap: 8px; }
  .badge {
    display: flex; align-items: center; gap: 5px;
    padding: 5px 11px; border-radius: 20px;
    background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.2);
    color: #7dd3fc; font-size: 11px; font-family: var(--mono);
  }

  /* ── Main ── */
  .main { flex: 1; max-width: 1200px; margin: 0 auto; padding: 40px 28px; width: 100%; }

  /* ── Hero ── */
  .hero { text-align: center; margin-bottom: 52px; padding-top: 8px; }
  .hero-tag {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 14px; border-radius: 20px;
    background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.2);
    color: #22d3ee; font-size: 12px; font-family: var(--mono); margin-bottom: 20px;
  }
  .hero-title {
    font-size: clamp(32px, 5vw, 56px); font-weight: 800; line-height: 1.1;
    letter-spacing: -1px; margin-bottom: 16px; color: var(--text);
  }
  .hero-title em { font-style: normal; color: #22d3ee; }
  .hero-desc { font-size: 16px; color: var(--text2); max-width: 560px; margin: 0 auto; line-height: 1.6; }

  /* ── Form section ── */
  .form-section { display: flex; flex-direction: column; gap: 28px; }
  .section-label {
    display: flex; align-items: center; gap: 7px;
    font-size: 12px; font-family: var(--mono); color: var(--text3);
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;
  }

  /* ── Vitals Grid ── */
  .vitals-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }

  /* ── Vital Card ── */
  .vital-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    display: flex; flex-direction: column; gap: 10px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .vital-card:hover {
    border-color: var(--border2);
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
  }
  .vital-card:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(0,212,255,0.08);
  }
  .vital-header { display: flex; align-items: center; gap: 10px; }
  .vital-icon {
    width: 32px; height: 32px; border-radius: 8px; border: 1px solid;
    display: grid; place-items: center; flex-shrink: 0;
  }
  .vital-label { font-size: 13px; font-weight: 600; color: var(--text); }
  .vital-hint { font-size: 10px; color: var(--text3); font-family: var(--mono); }
  .vital-unit { margin-left: auto; font-size: 11px; color: var(--text3); font-family: var(--mono); }
  .vital-input-wrap { position: relative; }
  .vital-input {
    width: 100%; background: var(--surface2); border: 1px solid var(--border);
    border-radius: 8px; padding: 9px 13px; color: var(--text);
    font-size: 15px; font-family: var(--mono); font-weight: 500;
    outline: none; transition: border-color 0.15s;
    -moz-appearance: textfield;
  }
  .vital-input::-webkit-outer-spin-button,
  .vital-input::-webkit-inner-spin-button { -webkit-appearance: none; }
  .vital-input:focus { border-color: var(--accent); }
  .vital-input--error { border-color: #ef4444 !important; }
  .vital-error {
    display: flex; align-items: center; gap: 4px;
    font-size: 10px; color: #ef4444; font-family: var(--mono);
    margin-top: 4px;
  }

  /* Slider */
  .vital-slider {
    width: 100%; appearance: none; height: 3px;
    background: linear-gradient(90deg, var(--accent) var(--pct, 50%), var(--border2) var(--pct, 50%));
    border-radius: 2px; outline: none; cursor: pointer;
  }
  .vital-slider::-webkit-slider-thumb {
    appearance: none; width: 14px; height: 14px; border-radius: 50%;
    background: var(--accent); border: 2px solid var(--surface);
    box-shadow: 0 0 6px rgba(0,212,255,0.5);
  }

  /* ── Predict Button ── */
  .predict-btn {
    align-self: center;
    display: flex; align-items: center; gap: 10px;
    padding: 16px 40px; border-radius: 12px;
    background: linear-gradient(135deg, #0ea5e9, #06b6d4);
    border: none; color: #fff; font-family: var(--font);
    font-size: 16px; font-weight: 700; cursor: pointer;
    box-shadow: 0 4px 24px rgba(6,182,212,0.4);
    transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
    letter-spacing: -0.3px;
  }
  .predict-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(6,182,212,0.5);
  }
  .predict-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── API Error ── */
  .api-error {
    display: flex; align-items: center; gap: 10px;
    background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
    border-radius: 10px; padding: 14px 18px;
    color: #fca5a5; font-size: 13px;
  }

  /* ── Results ── */
  .results { display: flex; flex-direction: column; gap: 28px; }
  .back-btn {
    display: flex; align-items: center; gap: 6px;
    background: var(--surface); border: 1px solid var(--border);
    color: var(--text2); border-radius: 8px; padding: 8px 14px;
    font-family: var(--font); font-size: 13px; cursor: pointer;
    width: fit-content; transition: border-color 0.15s, color 0.15s;
  }
  .back-btn:hover { border-color: var(--border2); color: var(--text); }

  .results-grid {
    display: grid;
    grid-template-columns: 360px 1fr;
    gap: 24px;
    align-items: start;
  }
  @media (max-width: 900px) { .results-grid { grid-template-columns: 1fr; } }

  .results-left, .results-right { display: flex; flex-direction: column; gap: 20px; }

  /* ── Meter ── */
  .meter-wrap {
    border-radius: var(--radius); border: 1px solid;
    padding: 28px 24px; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    backdrop-filter: blur(4px);
  }
  .meter-days {
    font-size: 72px; font-weight: 800; line-height: 1;
    letter-spacing: -3px; font-family: var(--mono);
  }
  .meter-unit { font-size: 14px; color: var(--text2); font-family: var(--mono); margin-top: -4px; }
  .meter-label {
    padding: 5px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;
    margin-top: 4px;
  }
  .meter-bar-bg {
    width: 100%; height: 6px; background: var(--border);
    border-radius: 3px; overflow: hidden; margin-top: 8px;
  }
  .meter-bar-fill { height: 100%; border-radius: 3px; transition: width 1s ease; }
  .meter-scale {
    width: 100%; display: flex; justify-content: space-between;
    font-size: 10px; font-family: var(--mono);
  }

  /* ── Chips ── */
  .chips-wrap {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 14px 16px;
    display: flex; flex-direction: column; gap: 10px;
  }
  .chips-label {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; font-family: var(--mono); color: var(--text3);
    text-transform: uppercase; letter-spacing: 1px;
  }
  .chips { display: flex; flex-wrap: wrap; gap: 7px; }
  .chip {
    display: flex; align-items: center; gap: 6px;
    padding: 5px 11px; border-radius: 20px; border: 1px solid;
    font-size: 11px; font-family: var(--mono);
  }
  .chip-val { font-weight: 600; }

  /* ── Input Summary ── */
  .input-summary {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 16px;
  }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .summary-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 5px 8px; border-radius: 6px; background: var(--surface2);
  }
  .summary-key { font-size: 11px; font-family: var(--mono); }
  .summary-val { font-size: 12px; font-family: var(--mono); color: var(--text); font-weight: 500; }
  .summary-val small { color: var(--text3); font-size: 10px; }

  /* ── Tabs ── */
  .tabs { display: flex; gap: 10px; }
  .tab-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 10px 20px; border-radius: 10px;
    background: var(--surface); border: 1px solid var(--border);
    color: var(--text2); font-family: var(--font); font-size: 13px;
    font-weight: 600; cursor: pointer; transition: all 0.15s;
  }
  .tab-btn:hover { border-color: var(--border2); color: var(--text); }
  .tab-btn--active { background: rgba(0,212,255,0.06); }

  /* ── Explain Card ── */
  .explain-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden;
  }
  .explain-card-header {
    display: flex; align-items: center; gap: 12px;
    padding: 16px 20px; border-bottom: 1px solid var(--border);
  }
  .explain-icon {
    width: 38px; height: 38px; border-radius: 9px; border: 1px solid;
    display: grid; place-items: center; flex-shrink: 0;
  }
  .explain-title { font-size: 14px; font-weight: 700; color: var(--text); }
  .explain-subtitle { font-size: 11px; color: var(--text3); line-height: 1.4; }
  .explain-plot { width: 100%; display: block; }
  .explain-empty {
    padding: 40px; text-align: center; color: var(--text3);
    font-size: 13px; font-family: var(--mono);
  }

  /* ── XAI Legend ── */
  .xai-legend {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 16px 20px;
    display: flex; flex-direction: column; gap: 12px;
  }
  .xai-legend-title { font-size: 11px; font-family: var(--mono); color: var(--text3); text-transform: uppercase; letter-spacing: 1px; }
  .xai-legend-items { display: flex; flex-direction: column; gap: 8px; }
  .xai-legend-item { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text2); }
  .xai-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .xai-legend-item strong { color: var(--text); }

  /* ── Footer ── */
  .footer {
    border-top: 1px solid var(--border); padding: 18px 28px;
    display: flex; justify-content: center; gap: 32px;
    font-size: 11px; font-family: var(--mono); color: var(--text3);
  }
`;
