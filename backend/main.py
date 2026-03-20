from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
from dotenv import load_dotenv
import google.generativeai as genai
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse


load_dotenv()

app = FastAPI(title="LifeBridge AI Backend")

# Allow CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY is not set.")
else:
    genai.configure(api_key=GEMINI_API_KEY)

class AnalyzeRequest(BaseModel):
    text: str

class HelpRequest(BaseModel):
    condition: str
    severity: str
    location: str

class Hospital(BaseModel):
    name: str
    contact: str
    distance_or_location: str

class Doctor(BaseModel):
    name: str
    specialty: str
    contact: str
    availability: str

class HelpResponse(BaseModel):
    emergency_helplines: dict[str, str]
    hospitals: list[Hospital]
    doctors: list[Doctor]

# Define strictly the required output schema from Gemini.md
class EmergencyResponse(BaseModel):
    emergency_detected: bool
    category: str
    severity: str
    possible_condition: str
    confidence: str
    top_3_actions: list[str]
    first_aid_steps: list[str]
    should_call_ambulance: bool
    ui_message: str

@app.post("/api/analyze", response_model=EmergencyResponse)
async def analyze_emergency(request: AnalyzeRequest):
    if not request.text:
        raise HTTPException(status_code=400, detail="Text input is required.")

    system_instruction = """
    You are a real-time emergency response AI.
    Your job is to convert panic-driven, unclear human input into precise, life-saving instructions.

    RULES:
    - Be direct and action-oriented
    - Do NOT explain too much
    - Do NOT act like a chatbot
    - Prioritize survival
    - Keep output to top 3-5 critical actions in 'top_3_actions'
    - 'ui_message' must be a short, bold instruction for the user to see immediately.

    Risk Classification:
    - HIGH → Immediate life threat
    - MEDIUM → Urgent but stable
    - LOW → Non-critical

    You must ALWAYS return strictly structured JSON matching the provided schema.
    """

    try:
        model = genai.GenerativeModel(
            model_name='gemini-2.5-flash',
            system_instruction=system_instruction
        )
        response = model.generate_content(
            request.text,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.0
            ),
        )
        
        # Parse the JSON string returned by Gemini into a dictionary
        return json.loads(response.text)

    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        # Return a safe fallback response if the API call fails
        return {
            "emergency_detected": False,
            "category": "other",
            "severity": "LOW",
            "possible_condition": "Error analyzing input.",
            "confidence": "0%",
            "top_3_actions": ["Please try again or call emergency services if needed."],
            "first_aid_steps": [],
            "should_call_ambulance": False,
            "ui_message": str(e)
        }

@app.post("/api/find_help", response_model=HelpResponse)
async def find_help(request: HelpRequest):
    if not request.location:
        raise HTTPException(status_code=400, detail="Location is required.")

    system_instruction = f"""
    You are an emergency medical dispatcher AI. The user has a {request.severity} medical situation: {request.condition}.
    They are located at: {request.location}.
    
    You must provide:
    1. Local emergency helpline numbers for their location (ambulance, police, etc.)
    2. High-rated hospitals nearby (name, contact number).
    3. High-rated doctors or specialists appropriate for '{request.condition}', with their contact and availability.
    
    Return the response STRICTLY as a JSON matching the provided schema. Do not include markdown formatting.
    Make up highly realistic names and numbers if real-time data is unavailable.
    """

    try:
        model = genai.GenerativeModel(
            model_name='gemini-2.5-flash',
            system_instruction=system_instruction
        )
        response = model.generate_content(
            "Find emergency contacts for my location.",
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2
            ),
        )
        return json.loads(response.text)

    except Exception as e:
        print(f"Error calling Gemini help API: {e}")
        return {
            "emergency_helplines": { "Emergency": "911 or local equivalent" },
            "hospitals": [{"name": "Nearest General Hospital", "contact": "Emergency Room", "distance_or_location": "Nearby"}],
            "doctors": [{"name": "On-call Specialist", "specialty": "Emergency Medicine", "contact": "Via Hospital", "availability": "Immediate"}]
        }

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Serve React application for Cloud Run Deployments
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

    @app.exception_handler(404)
    async def custom_404_handler(request, exc):
        # Allow normal 404s for API endpoints
        if request.url.path.startswith("/api/"):
            raise exc
        # Reroute to React index.html for SPA frontend routing
        return FileResponse(os.path.join(static_dir, "index.html"))
