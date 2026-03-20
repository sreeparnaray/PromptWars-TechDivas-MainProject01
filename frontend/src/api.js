import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

export const analyzeEmergency = async (text) => {
  try {
    const response = await axios.post(`${API_URL}/analyze`, { text });
    return response.data;
  } catch (error) {
    console.error("Error calling backend API", error);
    return {
      emergency_detected: false,
      category: "other",
      symptoms: [],
      possible_condition: "Connection Error",
      severity: "LOW",
      confidence: "0%",
      immediate_actions: ["Could not connect to the emergency service. Please call emergency services directly."],
      should_call_ambulance: true,
      first_aid_type: "none",
      warnings: ["System offline"]
    };
  }
};

export const findEmergencyHelp = async (condition, severity, location) => {
  try {
    const response = await axios.post(`${API_URL}/find_help`, { condition, severity, location });
    return response.data;
  } catch (error) {
    console.error("Error calling find_help API", error);
    return null;
  }
};
