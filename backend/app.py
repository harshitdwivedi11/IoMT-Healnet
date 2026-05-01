"""
Healthcare Recovery Time Prediction API
Flask backend with SHAP + LIME explainability
"""

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import shap
import lime
import lime.lime_tabular
import io
import base64
import os
import warnings
warnings.filterwarnings('ignore')

# ── Create app FIRST ──────────────────────────────
app=Flask(__name__)
CORS(app)
# ── THEN attach decorators ────────────────────────
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"]  = "http://localhost:3000"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


# ── Everything else below (MODEL_PATH, routes, etc.) ──
# ─────────────────────────────────────────────
# Model Loading
# ─────────────────────────────────────────────

MODEL_PATH = os.environ.get("MODEL_PATH", "recovery_model.pkl")

try:
    model = joblib.load(MODEL_PATH)
    print(f"✅ Model loaded from {MODEL_PATH}")
except FileNotFoundError:
    print(f"⚠️  Model not found at {MODEL_PATH}. Using mock model for demo.")
    model = None

# ─────────────────────────────────────────────
# Feature Configuration
# ─────────────────────────────────────────────

FEATURE_NAMES = [
    "Heart_Rate",
    "BP_Systolic",
    "BP_Diastolic",
    "Temperature",
    "SpO2",
    "Age",
    "BMI",
    "Glucose_Level",
    "WBC_Count",
    "Hemoglobin",
]

FEATURE_DISPLAY = {
    "Heart_Rate":     "Heart Rate (bpm)",
    "BP_Systolic":    "BP Systolic (mmHg)",
    "BP_Diastolic":   "BP Diastolic (mmHg)",
    "Temperature":    "Temperature (°F)",
    "SpO2":           "SpO2 (%)",
    "Age":            "Age (years)",
    "BMI":            "BMI",
    "Glucose_Level":  "Glucose Level (mg/dL)",
    "WBC_Count":      "WBC Count (×10³/µL)",
    "Hemoglobin":     "Hemoglobin (g/dL)",
}

# Reference distribution for LIME background (realistic clinical ranges)
BACKGROUND_DATA = pd.DataFrame({
    "Heart_Rate":    np.random.normal(75, 12, 200),
    "BP_Systolic":   np.random.normal(120, 15, 200),
    "BP_Diastolic":  np.random.normal(80, 10, 200),
    "Temperature":   np.random.normal(98.6, 0.7, 200),
    "SpO2":          np.clip(np.random.normal(97, 2, 200), 85, 100),
    "Age":           np.random.normal(50, 18, 200),
    "BMI":           np.random.normal(26, 5, 200),
    "Glucose_Level": np.random.normal(100, 20, 200),
    "WBC_Count":     np.random.normal(7.5, 2, 200),
    "Hemoglobin":    np.random.normal(13.5, 1.5, 200),
})

# ─────────────────────────────────────────────
# Helper: Plot → Base64
# ─────────────────────────────────────────────

def fig_to_base64(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=150,
                facecolor=fig.get_facecolor())
    buf.seek(0)
    encoded = base64.b64encode(buf.read()).decode('utf-8')
    buf.close()
    plt.close(fig)
    return encoded

# ─────────────────────────────────────────────
# Mock predict when no model is available
# ─────────────────────────────────────────────

def mock_predict(df):
    hr   = df["Heart_Rate"].values[0]
    spo2 = df["SpO2"].values[0]
    age  = df["Age"].values[0]
    bmi  = df["BMI"].values[0]
    base = 7.0
    base += max(0, (hr - 80)) * 0.05
    base += max(0, (98 - spo2)) * 0.8
    base += max(0, (age - 40)) * 0.04
    base += max(0, (bmi - 25)) * 0.1
    return np.array([round(base, 1)])

# ─────────────────────────────────────────────
# SHAP Explanation
# ─────────────────────────────────────────────

def generate_shap_plot(pipeline, input_df):
    """Generate SHAP bar plot for the prediction."""
    try:
        # Try to get the final estimator from pipeline
        if hasattr(pipeline, 'named_steps'):
            steps = list(pipeline.named_steps.values())
            final_model = steps[-1]
            # Transform input through all steps except the last
            transformed = input_df.copy()
            for step in steps[:-1]:
                transformed = step.transform(transformed)
        else:
            final_model = pipeline
            transformed = input_df

        # Choose explainer based on model type
        model_name = type(final_model).__name__.lower()
        if any(t in model_name for t in ['lightgbm', 'xgb', 'extra', 'forest', 'tree', 'gradient']):
            explainer = shap.TreeExplainer(final_model)
            shap_values = explainer.shap_values(transformed)
            if isinstance(shap_values, list):
                shap_values = shap_values[0]
        else:
            explainer = shap.KernelExplainer(
                final_model.predict,
                shap.sample(BACKGROUND_DATA.values, 50)
            )
            shap_values = explainer.shap_values(transformed.values, nsamples=100)

        feature_names = [FEATURE_DISPLAY.get(f, f) for f in FEATURE_NAMES]
        sv = shap_values[0] if len(shap_values.shape) > 1 else shap_values

        # Sort by absolute value
        indices = np.argsort(np.abs(sv))[::-1]
        sorted_names  = [feature_names[i] for i in indices]
        sorted_values = [sv[i] for i in indices]

        fig, ax = plt.subplots(figsize=(9, 5))
        fig.patch.set_facecolor('#0f172a')
        ax.set_facecolor('#1e293b')

        colors = ['#ef4444' if v > 0 else '#22d3ee' for v in sorted_values]
        bars = ax.barh(sorted_names[::-1], sorted_values[::-1],
                       color=colors[::-1], edgecolor='none', height=0.6)

        ax.axvline(0, color='#94a3b8', linewidth=0.8, linestyle='--')
        ax.set_xlabel('SHAP Value (impact on recovery days)',
                      color='#cbd5e1', fontsize=10)
        ax.set_title('Feature Impact on Prediction (SHAP)',
                     color='#f1f5f9', fontsize=13, fontweight='bold', pad=12)
        ax.tick_params(colors='#94a3b8', labelsize=9)
        ax.spines[['top','right','left','bottom']].set_visible(False)
        ax.xaxis.grid(True, color='#334155', linewidth=0.5, linestyle='--')
        ax.set_axisbelow(True)

        red_patch  = mpatches.Patch(color='#ef4444', label='Increases recovery time')
        blue_patch = mpatches.Patch(color='#22d3ee', label='Decreases recovery time')
        ax.legend(handles=[red_patch, blue_patch], facecolor='#1e293b',
                  edgecolor='#334155', labelcolor='#cbd5e1', fontsize=8)

        fig.tight_layout()
        return fig_to_base64(fig), sorted_names, sorted_values

    except Exception as e:
        print(f"SHAP error: {e}")
        return generate_mock_shap_plot(input_df)

def generate_mock_shap_plot(input_df):
    """Fallback SHAP-style plot using feature deviation from normal ranges."""
    normal = {
        "Heart_Rate": 75, "BP_Systolic": 120, "BP_Diastolic": 80,
        "Temperature": 98.6, "SpO2": 97, "Age": 45, "BMI": 25,
        "Glucose_Level": 100, "WBC_Count": 7.5, "Hemoglobin": 13.5,
    }
    std = {
        "Heart_Rate": 12, "BP_Systolic": 15, "BP_Diastolic": 10,
        "Temperature": 0.7, "SpO2": 2, "Age": 18, "BMI": 5,
        "Glucose_Level": 20, "WBC_Count": 2, "Hemoglobin": 1.5,
    }
    weights = {
        "Heart_Rate": 0.18, "BP_Systolic": 0.15, "BP_Diastolic": 0.10,
        "Temperature": 0.14, "SpO2": 0.20, "Age": 0.08, "BMI": 0.06,
        "Glucose_Level": 0.05, "WBC_Count": 0.02, "Hemoglobin": 0.02,
    }

    sv, names = [], []
    for feat in FEATURE_NAMES:
        val = input_df[feat].values[0]
        z   = (val - normal[feat]) / std[feat]
        shap_val = z * weights[feat] * 3
        sv.append(shap_val)
        names.append(FEATURE_DISPLAY.get(feat, feat))

    indices = np.argsort(np.abs(sv))[::-1]
    sorted_names  = [names[i] for i in indices]
    sorted_values = [sv[i] for i in indices]

    fig, ax = plt.subplots(figsize=(9, 5))
    fig.patch.set_facecolor('#0f172a')
    ax.set_facecolor('#1e293b')

    colors = ['#ef4444' if v > 0 else '#22d3ee' for v in sorted_values]
    ax.barh(sorted_names[::-1], sorted_values[::-1],
            color=colors[::-1], edgecolor='none', height=0.6)
    ax.axvline(0, color='#94a3b8', linewidth=0.8, linestyle='--')
    ax.set_xlabel('SHAP Value (impact on recovery days)',
                  color='#cbd5e1', fontsize=10)
    ax.set_title('Feature Impact on Prediction (SHAP)',
                 color='#f1f5f9', fontsize=13, fontweight='bold', pad=12)
    ax.tick_params(colors='#94a3b8', labelsize=9)
    ax.spines[['top','right','left','bottom']].set_visible(False)
    ax.xaxis.grid(True, color='#334155', linewidth=0.5, linestyle='--')
    ax.set_axisbelow(True)

    red_patch  = mpatches.Patch(color='#ef4444', label='Increases recovery time')
    blue_patch = mpatches.Patch(color='#22d3ee', label='Decreases recovery time')
    ax.legend(handles=[red_patch, blue_patch], facecolor='#1e293b',
              edgecolor='#334155', labelcolor='#cbd5e1', fontsize=8)

    fig.tight_layout()
    return fig_to_base64(fig), sorted_names, sorted_values

# ─────────────────────────────────────────────
# LIME Explanation
# ─────────────────────────────────────────────

def generate_lime_plot(pipeline, input_df):
    """Generate LIME explanation for the prediction."""
    try:
        predict_fn = pipeline.predict if hasattr(pipeline, 'predict') else mock_predict

        explainer = lime.lime_tabular.LimeTabularExplainer(
            training_data=BACKGROUND_DATA.values,
            feature_names=[FEATURE_DISPLAY.get(f, f) for f in FEATURE_NAMES],
            mode='regression',
            discretize_continuous=True,
            random_state=42,
        )

        explanation = explainer.explain_instance(
            data_row=input_df.values[0],
            predict_fn=predict_fn,
            num_features=10,
        )

        exp_list = explanation.as_list()
        feat_labels = [e[0] for e in exp_list]
        feat_values = [e[1] for e in exp_list]

        # Sort by absolute value
        indices = np.argsort(np.abs(feat_values))
        feat_labels = [feat_labels[i] for i in indices]
        feat_values = [feat_values[i] for i in indices]

        fig, ax = plt.subplots(figsize=(9, 5))
        fig.patch.set_facecolor('#0f172a')
        ax.set_facecolor('#1e293b')

        colors = ['#f97316' if v > 0 else '#a78bfa' for v in feat_values]
        bars = ax.barh(feat_labels, feat_values, color=colors,
                       edgecolor='none', height=0.6)

        ax.axvline(0, color='#94a3b8', linewidth=0.8, linestyle='--')
        ax.set_xlabel('LIME Contribution (impact on recovery days)',
                      color='#cbd5e1', fontsize=10)
        ax.set_title('Local Explanation for This Prediction (LIME)',
                     color='#f1f5f9', fontsize=13, fontweight='bold', pad=12)
        ax.tick_params(colors='#94a3b8', labelsize=8)
        ax.spines[['top','right','left','bottom']].set_visible(False)
        ax.xaxis.grid(True, color='#334155', linewidth=0.5, linestyle='--')
        ax.set_axisbelow(True)

        pos_patch = mpatches.Patch(color='#f97316', label='Increases recovery time')
        neg_patch = mpatches.Patch(color='#a78bfa', label='Decreases recovery time')
        ax.legend(handles=[pos_patch, neg_patch], facecolor='#1e293b',
                  edgecolor='#334155', labelcolor='#cbd5e1', fontsize=8)

        fig.tight_layout()
        return fig_to_base64(fig)

    except Exception as e:
        print(f"LIME error: {e}")
        return generate_mock_lime_plot(input_df)

def generate_mock_lime_plot(input_df):
    """Fallback LIME-style plot."""
    normal = {
        "Heart_Rate": 75, "BP_Systolic": 120, "BP_Diastolic": 80,
        "Temperature": 98.6, "SpO2": 97, "Age": 45, "BMI": 25,
        "Glucose_Level": 100, "WBC_Count": 7.5, "Hemoglobin": 13.5,
    }

    labels, values = [], []
    for feat in FEATURE_NAMES:
        val = input_df[feat].values[0]
        diff = val - normal[feat]
        direction = 1 if diff > 0 else -1
        magnitude = abs(diff) * np.random.uniform(0.05, 0.25)
        threshold_label = f"{FEATURE_DISPLAY.get(feat, feat)} {'>' if diff > 0 else '<='} {normal[feat]:.1f}"
        labels.append(threshold_label)
        values.append(direction * magnitude)

    indices = np.argsort(np.abs(values))
    labels = [labels[i] for i in indices]
    values = [values[i] for i in indices]

    fig, ax = plt.subplots(figsize=(9, 5))
    fig.patch.set_facecolor('#0f172a')
    ax.set_facecolor('#1e293b')

    colors = ['#f97316' if v > 0 else '#a78bfa' for v in values]
    ax.barh(labels, values, color=colors, edgecolor='none', height=0.6)
    ax.axvline(0, color='#94a3b8', linewidth=0.8, linestyle='--')
    ax.set_xlabel('LIME Contribution (impact on recovery days)',
                  color='#cbd5e1', fontsize=10)
    ax.set_title('Local Explanation for This Prediction (LIME)',
                 color='#f1f5f9', fontsize=13, fontweight='bold', pad=12)
    ax.tick_params(colors='#94a3b8', labelsize=8)
    ax.spines[['top','right','left','bottom']].set_visible(False)
    ax.xaxis.grid(True, color='#334155', linewidth=0.5, linestyle='--')
    ax.set_axisbelow(True)

    pos_patch = mpatches.Patch(color='#f97316', label='Increases recovery time')
    neg_patch = mpatches.Patch(color='#a78bfa', label='Decreases recovery time')
    ax.legend(handles=[pos_patch, neg_patch], facecolor='#1e293b',
              edgecolor='#334155', labelcolor='#cbd5e1', fontsize=8)

    fig.tight_layout()
    return fig_to_base64(fig)

# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "model_loaded": model is not None,
        "features": FEATURE_NAMES,
    })


@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON body provided"}), 400

    # Validate & parse features
    missing = [f for f in FEATURE_NAMES if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 400

    try:
        row = {f: float(data[f]) for f in FEATURE_NAMES}
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid numeric value: {e}"}), 400

    input_df = pd.DataFrame([row], columns=FEATURE_NAMES)

    # Predict
    if model is not None:
        try:
            prediction = model.predict(input_df)
            recovery_days = float(round(prediction[0], 1))
        except Exception as e:
            print(f"Model predict error: {e}, falling back to mock.")
            recovery_days = float(mock_predict(input_df)[0])
    else:
        recovery_days = float(mock_predict(input_df)[0])

    # Clamp to realistic range
    recovery_days = max(1.0, min(recovery_days, 60.0))

    # SHAP
    try:
        if model is not None:
            shap_b64, shap_names, shap_vals = generate_shap_plot(model, input_df)
        else:
            shap_b64, shap_names, shap_vals = generate_mock_shap_plot(input_df)
    except Exception as e:
        print(f"SHAP generation failed: {e}")
        shap_b64, shap_names, shap_vals = generate_mock_shap_plot(input_df)

    # LIME
    try:
        if model is not None:
            lime_b64 = generate_lime_plot(model, input_df)
        else:
            lime_b64 = generate_mock_lime_plot(input_df)
    except Exception as e:
        print(f"LIME generation failed: {e}")
        lime_b64 = generate_mock_lime_plot(input_df)

    # Top feature impacts for summary cards
    top_features = [
        {"name": shap_names[i], "value": round(shap_vals[i], 3)}
        for i in range(min(3, len(shap_names)))
    ]

    return jsonify({
        "recovery_days":  recovery_days,
        "shap_plot":      shap_b64,
        "lime_plot":      lime_b64,
        "top_features":   top_features,
        "input_summary":  row,
    })


if __name__ == '__main__':
    app.run(debug=True, port=5001)
