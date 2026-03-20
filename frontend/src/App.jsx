import React, { useState, useEffect } from 'react';
import { Mic, Activity, AlertTriangle, Phone, MapPin, Loader2, Hospital, Stethoscope, Navigation, Bell, Clock, Square } from 'lucide-react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { analyzeEmergency, findEmergencyHelp } from './api';

function App() {
  const [currentScreen, setCurrentScreen] = useState('home'); 
  const [analysisResult, setAnalysisResult] = useState(null);
  const [helpResult, setHelpResult] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [familyNotified, setFamilyNotified] = useState(false);
  
  const { isListening, transcript, error, startListening, stopListening } = useSpeechRecognition();

  useEffect(() => {
    if (isListening && transcript) setTextInput(transcript);
  }, [transcript, isListening]);

  const playTTS = (message) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAnalyze = async (textToAnalyze) => {
    if (!textToAnalyze.trim()) return;
    
    setCurrentScreen('analysis');
    try {
      const result = await analyzeEmergency(textToAnalyze);
      setAnalysisResult(result);
      if (result.emergency_detected) {
          setCurrentScreen('location');
      } else {
          setCurrentScreen('result');
          playTTS(result.ui_message);
      }
    } catch (err) {
      console.error(err);
      setCurrentScreen('home');
      alert("Analysis failed. Please try again.");
    }
  };

  const fetchHelpData = async (locationStr) => {
    setCurrentScreen('seeking_help');
    try {
      const helpData = await findEmergencyHelp(analysisResult.possible_condition, analysisResult.severity, locationStr);
      setHelpResult(helpData);
    } catch(err) {
      console.error(err);
    } finally {
      setCurrentScreen('result');
      // Speak the short bold UI message when entering Result screen
      if (analysisResult?.ui_message) {
        playTTS(analysisResult.ui_message + ". " + (analysisResult.top_3_actions ? analysisResult.top_3_actions[0] : ""));
      }
    }
  };

  const handleLocationSubmit = () => {
    if (!locationInput.trim()) return;
    fetchHelpData(locationInput);
  };

  const handleGPSLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const coords = `${position.coords.latitude}, ${position.coords.longitude}`;
      fetchHelpData(coords);
    }, () => {
      alert("Unable to retrieve your location. Please enter manually.");
    });
  };

  const handleNotifyFamily = () => {
    setFamilyNotified(true);
    setTimeout(() => setFamilyNotified(false), 3000);
  };

  const resetApp = () => {
    window.speechSynthesis?.cancel();
    setCurrentScreen('home');
    setAnalysisResult(null);
    setHelpResult(null);
    setTextInput('');
    setLocationInput('');
  };

  return (
    <div className="app-container">
      {currentScreen === 'home' && (
        <div className="screen fade-in home-screen">
          <div className="header">
            <h1 className="brand-name">LifeBridge AI</h1>
            <p className="tagline">From Panic to Action in Seconds</p>
          </div>
          
          <div className="input-section">
            <button 
              className={`mic-button ${isListening ? 'listening' : ''}`}
              onMouseDown={startListening}
              onMouseUp={stopListening}
              onTouchStart={startListening}
              onTouchEnd={stopListening}
            >
              {isListening ? <Square size={40} color="white" fill="white" /> : <Mic size={48} color="var(--color-primary)" />}
              {isListening && <div className="pulse-ring"></div>}
            </button>
            <p className={`instruction ${isListening ? 'text-primary' : ''}`}>
              {isListening ? "Listening... Release to analyze" : "Hold to describe the emergency"}
            </p>
            
            <div className="text-divider"><span>OR TYPE INSTEAD</span></div>
            
            <div className="text-input-wrapper">
              <textarea 
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="E.g., My father has chest pain and sweating heavily..."
                rows={3}
              />
              <button 
                className="btn btn-primary analyze-btn"
                onClick={() => handleAnalyze(textInput)}
                disabled={!textInput.trim()}
              >
                Analyze Emergency
              </button>
            </div>
          </div>
        </div>
      )}

      {currentScreen === 'analysis' && (
        <div className="screen fade-in center-screen">
          <div className="loader-container">
            <Loader2 size={64} className="spinning-loader" color="var(--color-primary)" />
            <h2>Analyzing situation...</h2>
            <p>Processing medical logic and risk assessment</p>
          </div>
        </div>
      )}

      {currentScreen === 'location' && (
        <div className="screen fade-in center-screen">
          <div className="location-prompt">
            <MapPin size={48} color="var(--color-primary)" style={{marginBottom: '16px'}} />
            <h2>Emergency Detected</h2>
            <p>Please provide your location to locate nearby help immediately.</p>
            
            <button className="btn btn-secondary gps-btn" onClick={handleGPSLocation}>
              <Navigation size={20} style={{marginRight: '8px'}} /> Use Current GPS Location
            </button>
            
            <div className="text-divider"><span>OR ENTER MANUALLY</span></div>
            
            <input 
              type="text"
              className="location-input"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="City, Area, or Landmark"
            />
            <button 
              className="btn btn-primary"
              onClick={handleLocationSubmit}
              disabled={!locationInput.trim()}
              style={{marginTop: '16px'}}
            >
              Find Help
            </button>
          </div>
        </div>
      )}

      {currentScreen === 'seeking_help' && (
        <div className="screen fade-in center-screen">
          <div className="loader-container">
            <Loader2 size={64} className="spinning-loader" color="var(--color-secondary)" />
            <h2>Locating Help...</h2>
            <p>Finding emergency contacts, nearby hospitals, and doctors.</p>
          </div>
        </div>
      )}

      {currentScreen === 'result' && analysisResult && (
        <div className="screen fade-in result-screen">
          <div className="header sticky-header">
            <button className="back-btn" onClick={resetApp}>← Back</button>
            <h2>AI Decision Dashboard</h2>
          </div>

          <div className="scrollable-content">
            {/* Top Section: Winning UI Layout */}
            <div className={`critical-header risk-${analysisResult.severity.toLowerCase()}`}>
              <div className="risk-title">
                <Activity size={32} />
                <h1>{analysisResult.severity} RISK — ACT NOW</h1>
              </div>
              <h2 className="condition-text">Insight: {analysisResult.possible_condition}</h2>
              <div className="ui-message-box">
                <p>{analysisResult.ui_message}</p>
              </div>
            </div>

            {/* Emergency Timer */}
            {analysisResult.should_call_ambulance && (
              <div className="timer-card fade-in">
                <div className="timer-icon"><Clock size={28} /></div>
                <div className="timer-info">
                  <h3>Ambulance ETA: ~8 mins</h3>
                  <p>Keep the patient stable while waiting.</p>
                </div>
              </div>
            )}

            {/* Critical Actions Cards */}
            <div className="actions-section">
              <h3>Immediate Critical Actions</h3>
              <div className="action-cards">
                {analysisResult.top_3_actions && analysisResult.top_3_actions.map((action, idx) => (
                  <div className="action-card" key={idx}>
                    <div className="action-number">{idx + 1}</div>
                    <div className="action-text">{action}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Secondary First Aid */}
            {analysisResult.first_aid_steps && analysisResult.first_aid_steps.length > 0 && (
              <div className="actions-section secondary-actions">
                <h3>Follow-up First Aid</h3>
                <ul className="checklist">
                  {analysisResult.first_aid_steps.map((step, idx) => (
                    <li key={idx} className="checkbox-item">
                      <div className="checkbox-circle"></div>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Action Buttons */}
            <div className="quick-buttons">
              <button className="btn btn-rapid-red" onClick={() => window.location.href="tel:911"}>
                <Phone size={20} /> CALL AMBULANCE
              </button>
              <button className="btn btn-rapid-blue" onClick={handleGPSLocation}>
                <MapPin size={20} /> SHARE LOCATION
              </button>
              <button className={`btn ${familyNotified ? 'btn-rapid-green' : 'btn-rapid-dark'}`} onClick={handleNotifyFamily}>
                <Bell size={20} /> {familyNotified ? "ALERT SENT ✓" : "NOTIFY FAMILY"}
              </button>
            </div>

            {/* Nearby Help Section */}
            {helpResult && (
              <div className="nearby-help-section fade-in">
                <h3>Nearby Emergency Help</h3>
                
                {helpResult.hospitals && helpResult.hospitals.length > 0 && (
                  <div className="help-card">
                     <h4><Hospital size={18} /> High-Rated Hospitals Nearby</h4>
                     <ul className="facility-list">
                       {helpResult.hospitals.map((hospital, idx) => (
                         <li key={idx}>
                            <div className="facility-info">
                              <h5>{hospital.name}</h5>
                              <p className="dist">{hospital.distance_or_location}</p>
                            </div>
                            <a href={`tel:${hospital.contact}`} className="contact-btn"><Phone size={16} /> {hospital.contact}</a>
                         </li>
                       ))}
                     </ul>
                  </div>
                )}

                {(analysisResult.severity === 'MEDIUM' || analysisResult.severity === 'HIGH') && helpResult.doctors && helpResult.doctors.length > 0 && (
                  <div className="help-card">
                     <h4><Stethoscope size={18} /> Available Specialists</h4>
                     <ul className="facility-list">
                       {helpResult.doctors.map((doctor, idx) => (
                         <li key={idx}>
                            <div className="facility-info">
                              <h5>{doctor.name}</h5>
                              <p className="dist">{doctor.specialty} • {doctor.availability}</p>
                            </div>
                            <a href={`tel:${doctor.contact}`} className="contact-btn"><Phone size={16} /> {doctor.contact}</a>
                         </li>
                       ))}
                     </ul>
                  </div>
                )}
              </div>
            )}
            
            <div style={{minHeight:"100px"}}></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
