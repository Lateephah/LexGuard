import json
import os
import re
import io
import PyPDF2
from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="SME Contract Risk Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

RULES = {}
SEVERITY_MAPPING = {}
WARNING_MESSAGES = {}

def load_json_files():
    global RULES, SEVERITY_MAPPING, WARNING_MESSAGES
    RULES.clear()
    SEVERITY_MAPPING.clear()
    WARNING_MESSAGES.clear()
    
    files_to_load = {
        'rules.json': RULES,
        'severity_mapping.json': SEVERITY_MAPPING,
        'warning_messages.json': WARNING_MESSAGES
    }
    
    for filename, target_dict in files_to_load.items():
        filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    target_dict.update(data)
                elif isinstance(data, list):
                    if filename == 'rules.json':
                        RULES = data
            print(f"Successfully loaded {filename}")
        except FileNotFoundError:
            print(f"ERROR: Failed to load '{filename}': File not found")
        except Exception as e:
            print(f"ERROR: Failed to load '{filename}': {e}")

# Initial load
load_json_files()

def calculate_max_score():
    weights = {"High": 3, "Medium": 2, "Low": 1}
    max_score = 0
    if isinstance(RULES, dict):
        for cat in RULES.keys():
            sev = SEVERITY_MAPPING.get(cat, "Medium")
            max_score += weights.get(sev, 2)
    elif isinstance(RULES, list):
        for r in RULES:
            sev = r.get("severity", "Medium")
            max_score += weights.get(sev, 2)
    return max(max_score, 1)

def perform_analysis(text: str):
    # 1. Convert text to lowercase
    text_lower = text.lower()
    
    clauses_original = [c.strip() for c in text.split('\n\n') if c.strip()]
    if not clauses_original:
        clauses_original = [text.strip()]
        
    flags = []
    weights = {"High": 3, "Medium": 2, "Low": 1}
    triggered_global = set()
    
    for orig_clause in clauses_original:
        if not orig_clause: continue
        clause_lower = orig_clause.lower()
        
        if isinstance(RULES, dict):
            for category, patterns in RULES.items():
                for pattern in patterns:
                    try:
                        for match in re.finditer(pattern, clause_lower):
                            severity = SEVERITY_MAPPING.get(category, "Medium")
                            message = WARNING_MESSAGES.get(category, f"This clause triggered a warning under {category}.")
                            color = "red" if severity == "High" else ("yellow" if severity == "Medium" else "green")
                            
                            idx_start = match.start()
                            idx_end = match.end()
                            matched_text = orig_clause[idx_start:idx_end]
                            
                            flags.append({
                                "clause": category,
                                "severity": severity,
                                "traffic_light": color,
                                "message": message,
                                "matched_pattern": matched_text
                            })
                            
                            triggered_global.add(category)
                    except Exception as e:
                        pass
        elif isinstance(RULES, list):
            for rule in RULES:
                try:
                    category = rule.get("category", "Unknown")
                    severity = rule.get("severity", "Medium")
                    message = rule.get("explanation", "")
                    
                    for match in re.finditer(rule['pattern'], clause_lower):
                        color = "red" if severity == "High" else ("yellow" if severity == "Medium" else "green")
                        
                        idx_start = match.start()
                        idx_end = match.end()
                        matched_text = orig_clause[idx_start:idx_end]
                        
                        flags.append({
                            "clause": category,
                            "severity": severity,
                            "traffic_light": color,
                            "message": message,
                            "matched_pattern": matched_text
                        })
                        
                        triggered_global.add(category)
                except Exception:
                    pass

    actual_score = 0
    if isinstance(RULES, dict):
        actual_score = sum(weights.get(SEVERITY_MAPPING.get(cat, "Medium"), 2) for cat in triggered_global)
    elif isinstance(RULES, list):
        cat_to_sev = {r.get('category', 'Unknown'): r.get('severity', 'Medium') for r in RULES}
        actual_score = sum(weights.get(cat_to_sev.get(cat, "Medium"), 2) for cat in triggered_global)

    max_possible = calculate_max_score()
    normalized_score = max(0, min(round((actual_score / max_possible) * 100), 100))
    
    if normalized_score <= 30:
        overall = "Low"
    elif normalized_score <= 70:
        overall = "Medium"
    else:
        overall = "High"

    risk_counts = {"High": 0, "Medium": 0, "Low": 0}
    for f in flags:
        sev = f['severity']
        if sev in risk_counts:
            risk_counts[sev] += 1
        else:
            risk_counts[sev] = 1

    high_risks = risk_counts.get("High", 0)
    total_risks = len(flags)
    summary_text = f"{high_risks} high-risk clauses detected." if high_risks > 0 else f"{total_risks} total risks detected."

    return {
        "flags": flags,
        "overall_risk": overall,
        "summary": summary_text,
        "risk_score": normalized_score,
        "risk_counts": risk_counts
    }

@app.post("/analyze")
async def analyze_contract(request: Request):
    load_json_files()
    try:
        data = await request.json()
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format")

    text = data.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    return perform_analysis(text)

@app.post("/upload")
async def upload_contract(file: UploadFile = File(...)):
    load_json_files()
    text = ""
    
    content = await file.read()
    
    if file.filename.lower().endswith('.pdf'):
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            for page in pdf_reader.pages:
                extr = page.extract_text()
                if extr:
                    text += extr + "\n"
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")
    else:
        # Assume txt
        text = content.decode('utf-8', errors='ignore')

    if not text.strip():
        raise HTTPException(status_code=400, detail="No extractable text found in file")
        
    return perform_analysis(text)

public_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')
if os.path.isdir(public_dir):
    app.mount("/", StaticFiles(directory=public_dir, html=True), name="public")

if __name__ == "__main__":
    print("Starting FastAPI Server on Port 8000...")
    print("Endpoint available at http://localhost:8000/analyze")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
