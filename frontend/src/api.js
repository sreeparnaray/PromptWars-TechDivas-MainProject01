import axios from 'axios';

const API_URL = '/api';

export const analyzeEmergency = async (text) => {
  try {
    const response = await axios.post(`${API_URL}/analyze`, { text });
    return response.data;
  } catch (error) {
    console.error("Error calling backend API", error);
    return {
      emergency_detected: false,
      category: "other",
      severity: "LOW",
      possible_condition: "Connection Error",
      confidence: "0%",
      top_3_actions: ["Could not connect to the emergency service. Please call emergency services directly."],
      first_aid_steps: [],
      should_call_ambulance: true,
      ui_message: "System offline. Call local emergency."
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
