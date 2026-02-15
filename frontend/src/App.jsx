import { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import UploadResume from './pages/UploadResume';
import JobDescription from './pages/JobDescription';
import Auth from './pages/Auth';
import { Shield, CheckCircle, AlertCircle, FileText, ChevronRight } from 'lucide-react';

// Use environment variable for API URL or default to local
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {
  const [session, setSession] = useState(null);
  const [resumeId, setResumeId] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUploadSuccess = (id) => {
    setResumeId(id);
    setError("");
  };

  const handleAnalysisStarted = async (newJobId) => {
    setJobId(newJobId);
    if (!resumeId) {
      setError("Please upload a resume first.");
      return;
    }
    await runMatching(resumeId, newJobId);
  };

  const runMatching = async (rId, jId) => {
    setLoading(true);
    setError("");
    setResults([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("User not authenticated");
      }

      const res = await fetch(`${API_URL}/match-resumes?job_id=${jId}&resume_id=${rId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (res.ok) {
        setResults(Array.isArray(data) ? data : [data]);
      } else {
        setError(data.detail || data.message || "Matching failed.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to analysis engine.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setResumeId(null);
    setJobId(null);
    setResults([]);
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="app-container">
      {/* Navbar */}
      <header className="dashboard-header">
        <div className="brand-title">
          <Shield size={28} color="var(--primary)" fill="var(--primary-light)" />
          ResumeParser
          <span className="brand-badge">AI PRO</span>
        </div>
        <button onClick={handleSignOut} className="btn-secondary">Sign Out</button>
      </header>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Left: Upload */}
        <div className="glass-panel animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h3><CheckCircle size={22} className="text-secondary" /> Resume Upload</h3>
          <p>Upload the candidate's PDF resume. Secure & Private.</p>
          <UploadResume onUploadSuccess={handleUploadSuccess} apiUrl={API_URL} />
          {resumeId && (
            <div style={{ marginTop: '1rem', padding: '10px', background: '#ecfdf5', color: '#047857', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={16} /> Resume Ready for Analysis
            </div>
          )}
        </div>

        {/* Right: Job Criteria */}
        <div className="glass-panel animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h3><FileText size={22} className="text-secondary" /> Target Criteria</h3>
          <p>Define the job description and required skills.</p>
          <JobDescription onAnalysisStarted={handleAnalysisStarted} apiUrl={API_URL} />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="animate-fade-in" style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', marginBottom: '2rem' }}>
          <AlertCircle size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results Section */}
      {loading && (
        <div className="results-section animate-fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem' }}></div>
          <h3>Analyzing Profile Match...</h3>
          <p className="text-secondary">Comparing semantic meaning, skills, and experience.</p>
        </div>
      )}

      {results.length > 0 && !loading && (
        <div className="results-section animate-slide-up">
          <div className="card-header" style={{ marginBottom: '2rem' }}>
            <h2>Analysis Results</h2>
            <p className="text-secondary">AI-generated match score based on your criteria.</p>
          </div>

          <div className="results-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {results.map((res, idx) => (
              <div key={idx} className={`candidate-card ${res.eligibility === 'Eligible' ? 'eligible' : 'not-eligible'}`}>

                {/* Score Circle */}
                <div className="score-container">
                  <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto' }}>
                    <svg width="80" height="80" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="45" fill="none" stroke={res.match_score >= 75 ? '#10b981' : res.match_score >= 50 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="8"
                        strokeDasharray={`${2 * Math.PI * 45}`}
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - res.match_score / 100)}`}
                        transform="rotate(-90 50 50)"
                        style={{ transition: 'stroke-dashoffset 1s ease' }}
                      />
                    </svg>
                    <div className="score-text">
                      <span className="score-number" style={{ fontSize: '1.4rem' }}>{Math.round(res.match_score)}</span>
                      <span className="score-percent">%</span>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 className="candidate-name" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                        {res.filename || `Candidate ${idx + 1}`}
                      </h4>
                      <span className={`status-badge ${res.eligibility === 'Eligible' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                        style={{ background: res.eligibility === 'Eligible' ? '#dcfce7' : '#fee2e2', color: res.eligibility === 'Eligible' ? '#15803d' : '#b91c1c' }}>
                        {res.eligibility}
                      </span>
                    </div>

                    <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                      View Details <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
                    </button>
                  </div>

                  <div className="card-stats" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', gap: '2rem' }}>
                    <div className="stat-item">
                      <span className="stat-label">Experience</span>
                      <span className="stat-value">{res.details?.years_of_experience || 0} Yrs</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Skills Match</span>
                      <span className="stat-value">{Math.round(res.details?.skill_match || 0)}%</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Role Fit</span>
                      <span className="stat-value">{Math.round(res.details?.role_similarity || 0)}%</span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
