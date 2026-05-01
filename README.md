# IoMT Healnet — ML Healthcare Dashboard

> AI-powered patient recovery time prediction with **SHAP** and **LIME** explainability.  
> Stack: **Flask** (Python) · **React + Vite** · **LightGBM / ExtraTrees / ElasticNet** stacking model

---

## Project Structure

```
project/
├── backend/
│   ├── app.py                  # Flask API (predict, SHAP, LIME)
│   ├── requirements.txt        # Python dependencies
│   └── recovery_model.pkl      # ← Place your trained model here
│
└── frontend/
    ├── src/
    │   ├── App.jsx             # Full dashboard (form + results + XAI)
    │   └── main.jsx            # React entry point
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Setup & Running Locally

### 1. Backend (Flask)

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Place your model file
cp /path/to/recovery_model.pkl .

# Start the server
python app.py
# → Running on http://localhost:5000
```

> **No model?** The backend includes a realistic mock prediction function that works without `recovery_model.pkl`. SHAP and LIME plots are generated using feature deviation analysis.

---

### 2. Frontend (React + Vite)

```bash
cd frontend

# Install Node dependencies
npm install

# Start development server
npm run dev
# → Running on http://localhost:3000
```

Open `http://localhost:3000` in your browser.

---

## API Reference

### `GET /health`
Returns server and model status.

```json
{
  "status": "ok",
  "model_loaded": true,
  "features": ["Heart_Rate", "BP_Systolic", ...]
}
```

---

### `POST /predict`

**Request body:**
```json
{
  "Heart_Rate":    90,
  "BP_Systolic":   130,
  "BP_Diastolic":  85,
  "Temperature":   99.1,
  "SpO2":          95,
  "Age":           58,
  "BMI":           27.4,
  "Glucose_Level": 112,
  "WBC_Count":     9.2,
  "Hemoglobin":    12.8
}
```

**Response:**
```json
{
  "recovery_days": 12.5,
  "shap_plot":     "<base64-encoded PNG>",
  "lime_plot":     "<base64-encoded PNG>",
  "top_features": [
    { "name": "SpO₂ (%)",          "value": -1.42 },
    { "name": "Age (years)",        "value":  0.87 },
    { "name": "Heart Rate (bpm)",   "value":  0.61 }
  ],
  "input_summary": { ... }
}
```

**cURL example:**
```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "Heart_Rate": 90,    "BP_Systolic": 130,  "BP_Diastolic": 85,
    "Temperature": 99.1, "SpO2": 95,          "Age": 58,
    "BMI": 27.4,         "Glucose_Level": 112, "WBC_Count": 9.2,
    "Hemoglobin": 12.8
  }'
```

---

## Feature Reference

| Feature        | Unit       | Normal Range        |
|----------------|------------|---------------------|
| Heart_Rate     | bpm        | 60–100              |
| BP_Systolic    | mmHg       | < 120               |
| BP_Diastolic   | mmHg       | < 80                |
| Temperature    | °F         | 97–99               |
| SpO2           | %          | 95–100              |
| Age            | years      | —                   |
| BMI            | kg/m²      | 18.5–24.9           |
| Glucose_Level  | mg/dL      | 70–100 (fasting)    |
| WBC_Count      | ×10³/µL   | 4.5–11.0            |
| Hemoglobin     | g/dL       | 12–17.5             |

---

## Recovery Interpretation

| Range       | Label              | Color  |
|-------------|--------------------|--------|
| < 5 days    | Fast Recovery      | 🟢 Green  |
| 5–10 days   | Moderate Recovery  | 🟡 Yellow |
| > 10 days   | Extended Recovery  | 🔴 Red    |

---

## Explainability

### SHAP (SHapley Additive exPlanations)
- Uses `TreeExplainer` for tree-based models (LightGBM, ExtraTrees)
- Falls back to `KernelExplainer` for ElasticNet / stacked outputs
- Shows **global feature attribution**: which features pushed the prediction up or down from the baseline

### LIME (Local Interpretable Model-agnostic Explanations)
- Uses `LimeTabularExplainer` with a reference distribution
- Generates a **local surrogate model** around this specific prediction
- Shows threshold-based rules: e.g., `SpO2 <= 96` → increases recovery time by +2.1 days

---

## Model Integration

The backend expects a **scikit-learn Pipeline** saved via `joblib`:

```python
import joblib

# Your trained pipeline
pipeline = Pipeline([
    ('preprocessor', preprocessor),   # ColumnTransformer / scaler
    ('model', stacking_model),         # StackingRegressor or similar
])

joblib.dump(pipeline, 'recovery_model.pkl')
```

If your model is not a Pipeline, the backend will attempt direct `.predict()` and fall back gracefully.

---

## Environment Variables

| Variable     | Default                  | Description                  |
|--------------|--------------------------|------------------------------|
| `MODEL_PATH` | `recovery_model.pkl`     | Path to the pickled model    |
| `VITE_API_URL`| `http://localhost:5000` | Backend URL (frontend env)   |

Set in `.env` for production:
```bash
# backend/.env
MODEL_PATH=/app/models/recovery_model.pkl

# frontend/.env
VITE_API_URL=https://your-api-domain.com
```

---

## Production Deployment

```bash
# Backend — using Gunicorn
pip install gunicorn
gunicorn -w 2 -b 0.0.0.0:5000 app:app

# Frontend — build static files
npm run build
# Serve dist/ with Nginx or deploy to Vercel/Netlify
```
