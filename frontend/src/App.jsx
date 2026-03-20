import React, { useState } from 'react';
import { Mic, ArrowRight, Activity, AlertTriangle, Phone, MapPin, Loader2, Hospital, Stethoscope, Navigation } from 'lucide-react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { analyzeEmergency, findEmergencyHelp } from './api';

function App() {
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home' | 'analysis' | 'location' | 'seeking_help' | 'result'
  const [analysisResult, setAnalysisResult] = useState(null);
  const [helpResult, setHelpResult] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  
  const { isListening, transcript, error, startListening, stopListening } = useSpeechRecognition();

  React.useEffect(() => {
    if (isListening && transcript) {
      setTextInput(transcript);
    }
  }, [transcript, isListening]);

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

  const resetApp = () => {
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
              <Mic size={48} color={isListening ? "white" : "var(--color-primary)"} />
              {isListening && <div className="pulse-ring"></div>}
            </button>
            <p className="instruction">
              {isListening ? "Listening... Release to stop" : "Hold to describe the emergency"}
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
                Analyze <ArrowRight size={20} style={{marginLeft: '8px'}} />
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
              Find Help <ArrowRight size={20} style={{marginLeft: '8px'}} />
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
            <h2>AI Assessment</h2>
          </div>

          <div className={`scrollable-content`}>
            <div className={`risk-banner risk-${analysisResult.severity.toLowerCase()}`}>
              <Activity size={24} />
              <div>
                <h3>{analysisResult.severity} RISK</h3>
                <p>{analysisResult.possible_condition}</p>
              </div>
            </div>

            <div className="actions-section">
              <h3>What to Do Now</h3>
              <ul className="action-list">
                {analysisResult.immediate_actions.map((action, idx) => (
                  <li key={idx}>
                    <span className="step-number">{idx + 1}</span>
                    <span className="step-text">{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            {analysisResult.warnings && analysisResult.warnings.length > 0 && (
              <div className="warnings-section">
                <AlertTriangle size={20} color="var(--color-primary)" />
                <ul>
                  {analysisResult.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {helpResult && (
              <div className="nearby-help-section fade-in">
                <h3>Nearby Emergency Help</h3>
                
                {helpResult.emergency_helplines && Object.keys(helpResult.emergency_helplines).length > 0 && (
                  <div className="help-card helplines">
                    <h4><Phone size={18} /> Direct Emergency Helplines</h4>
                    <div className="helplines-grid">
                      {Object.entries(helpResult.emergency_helplines).map(([name, number]) => (
                         <a key={name} href={`tel:${number}`} className="helpline-btn">
                           <strong>{name.replace('_', ' ').toUpperCase()}</strong>
                           <span>{number}</span>
                         </a>
                      ))}
                    </div>
                  </div>
                )}
                
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

            {analysisResult.should_call_ambulance && !helpResult && (
              <div className="emergency-actions" style={{marginTop: '24px'}}>
                <button className="btn btn-primary call-btn" onClick={() => window.location.href="tel:911"}>
                  <Phone size={20} style={{marginRight: '8px'}} />
                  Call Ambulance Immediately
                </button>
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
