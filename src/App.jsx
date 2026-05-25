import React, { useState, useEffect } from 'react';
import './App.css';

// Core Firebase Connection Engines
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';

const initialStandbyPool = [
  { name: "Kurobane", tier: "Low-tier", fee: 150, status: "Draft Contract", notes: "Personal Friend, low budget opening slot", pull: 15, duration: 30 },
  { name: "Akhsosa", tier: "Low-tier", fee: 350, status: "Inquiry", notes: "Early afternoon day slot", pull: 20, duration: 30 },
  { name: "Shawtyrokk", tier: "Low-tier", fee: 500, status: "Inquiry", notes: "$500 previously booked for in ATL", pull: 30, duration: 30 },
  { name: "Yellabandanna", tier: "Low-tier", fee: 400, status: "Inquiry", notes: "Early stage setup", pull: 25, duration: 30 },
  { name: "Ezcodylee", tier: "Mid-tier", fee: 800, status: "Reached out", notes: "Manager info in Instagram bio", pull: 50, duration: 30 },
  { name: "Ealuhri", tier: "Mid-tier", fee: 1200, status: "Reached out", notes: "Verified routing availability from PDF", pull: 75, duration: 30 },
  { name: "Zukenee", tier: "Mid-tier", fee: 1500, status: "Reached out", notes: "Awaiting final confirmation from agent", pull: 90, duration: 30 },
  { name: "Sir Untre", tier: "Mid-tier", fee: 1000, status: "Draft Contract", notes: "Ready to sign contract sheet", pull: 65, duration: 30 },
  { name: "Bby Kell", tier: "Mid-tier", fee: 750, status: "Reached out", notes: "Zone transition block positioning", pull: 45, duration: 30 },
  { name: "Doublexl", tier: "Mid-tier", fee: 900, status: "Got prices back", notes: "$1,000 for 15m, negotiated down to $900.", pull: 55, duration: 15 },
  { name: "Diorvsyou", tier: "Mid-tier", fee: 1400, status: "Got managers info", notes: "Strong regional traction and stream counts", pull: 80, duration: 30 },
  { name: "PZ", tier: "Headliner", fee: 3000, status: "Reached out", notes: "Direct booking contact: peezyfouda@gmail.com", pull: 180, duration: 45 },
  { name: "Protect", tier: "Headliner", fee: 4500, status: "Reached out", notes: "Prime nighttime peak slot", pull: 250, duration: 45 },
  { name: "1300SAINT", tier: "Headliner", fee: 3500, status: "Reached out", notes: "High priority booking focus", pull: 210, duration: 45 },
  { name: "Sk8star", tier: "Headliner", fee: 5000, status: "Got managers info", notes: "Top tier metric draw and engagement stats", pull: 280, duration: 45 },
  { name: "Skaiwater", tier: "Headliner", fee: 6500, status: "Reached out", notes: "High momentum regional streaming data", pull: 350, duration: 45 }
];

export default function App() {
  // --- CORE SYSTEM NAVIGATION ---
  const [currentView, setCurrentView] = useState('dashboard');

  // --- FIREBASE SECURITY AUTH SYSTEM ---
  const [user, setUser] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // --- DATABASE CENTRAL STATE ---
  const [lineups, setLineups] = useState([
    { id: '1', name: "Crosswire 2026", activeRoster: [], bench: initialStandbyPool, ticketCap: 1150, artistBudget: 18000, startTimeStr: "15:00" }
  ]);
  const [currentLineupId, setCurrentLineupId] = useState('1');

  // --- COMPONENT WORKSPACE FORMS STATE ---
  const [newLineupName, setNewLineupName] = useState('');
  const [newLineupCap, setNewLineupCap] = useState('1150');
  const [newLineupBudget, setNewLineupBudget] = useState('18000');

  const [showAddArtistModal, setShowAddArtistModal] = useState(false);
  const [isEditingArtist, setIsEditingArtist] = useState(false);
  const [selectedArtistName, setSelectedArtistName] = useState('');

  const [newArtist, setNewArtist] = useState({
    name: '', tier: 'Low-tier', fee: '', status: 'Inquiry', notes: '', pull: '', duration: 30
  });

  const TICKET_PRICE = 40;

  // Track Dynamic Workspace Selections Safely
  const activeLineup = lineups.find(l => l.id === currentLineupId) || lineups[0];
  const activeRoster = activeLineup?.activeRoster || [];
  const bench = activeLineup?.bench || [];
  const allArtists = [...activeRoster, ...bench];
  const selectedArtist = allArtists.find(a => a.name === selectedArtistName) || activeRoster[0] || bench[0];

  const currentSpend = activeRoster.reduce((sum, a) => sum + Number(a.fee || 0), 0);
  const currentPull = activeRoster.reduce((sum, a) => sum + Number(a.pull || 0), 0);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setCurrentView('dashboard');
        const savedLocal = localStorage.getItem('lineup_iq_local');
        if (savedLocal) setLineups(JSON.parse(savedLocal));
      }
    });
    return () => unsubscribe();
  }, []);

  // Fire-Store Sync Stream Engine
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.lineups) setLineups(data.lineups);
      } else {
        setDoc(docRef, { lineups });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Fallback Local Storage Sync Engine
  useEffect(() => {
    if (!user) {
      localStorage.setItem('lineup_iq_local', JSON.stringify(lineups));
    }
  }, [lineups, user]);

  const saveWorkspaceState = async (updatedArray) => {
    setLineups(updatedArray);
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), { lineups: updatedArray }, { merge: true });
      } catch (err) {
        console.error("Cloud Write Interrupted: ", err);
      }
    }
  };

  // --- CONTROLLER HANDLERS ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setShowAuthModal(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSignOut = () => {
    signOut(auth);
    setLineups([{ id: '1', name: "Crosswire 2026", activeRoster: [], bench: initialStandbyPool, ticketCap: 1150, artistBudget: 18000, startTimeStr: "15:00" }]);
    setCurrentLineupId('1');
    setCurrentView('dashboard');
  };

  const handleCreateLineupSubmit = (e) => {
    e.preventDefault();
    if (!user) return; // Guard clause security check
    if (!newLineupName.trim()) return;

    const created = {
      id: Date.now().toString(),
      name: newLineupName.trim(),
      activeRoster: [],
      bench: [],
      ticketCap: Number(newLineupCap) || 1150,
      artistBudget: Number(newLineupBudget) || 18000,
      startTimeStr: "15:00"
    };

    const nextLineups = [...lineups, created];
    saveWorkspaceState(nextLineups);
    setCurrentLineupId(created.id);
    setSelectedArtistName('');
    
    setNewLineupName('');
    setNewLineupCap('1150');
    setNewLineupBudget('18000');
    setCurrentView('editor');
  };

  const handleDeleteLineup = (id, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to completely delete this festival lineup layout?")) return;
    let nextLineups = lineups.filter(l => l.id !== id);
    if (nextLineups.length === 0) {
      nextLineups = [{ id: '1', name: "Crosswire 2026", activeRoster: [], bench: initialStandbyPool, ticketCap: 1150, artistBudget: 18000, startTimeStr: "15:00" }];
    }
    saveWorkspaceState(nextLineups);
    setCurrentLineupId(nextLineups[0].id);
  };

  const handleUpdateTopMetricStrip = (field, value) => {
    const updated = lineups.map(l => l.id === currentLineupId ? { ...l, [field]: value } : l);
    saveWorkspaceState(updated);
  };

  const handleMoveArtistLists = (newActive, newBench) => {
    const updated = lineups.map(l => l.id === currentLineupId ? { ...l, activeRoster: newActive, bench: newBench } : l);
    saveWorkspaceState(updated);
  };

  // Automated Timeline Clock Scheduler
  const calculateArtistTimeBlock = (index) => {
    let elapsedMinutes = 0;
    for (let i = 0; i < index; i++) {
      const setDuration = Number(activeRoster[i].duration) || 30;
      const turnAroundTime = 15;
      elapsedMinutes += (setDuration + turnAroundTime);
    }
    const [hours, minutes] = (activeLineup.startTimeStr || "15:00").split(':').map(Number);
    const dateInstance = new Date();
    dateInstance.setHours(hours, minutes, 0, 0);
    dateInstance.setMinutes(dateInstance.getMinutes() + elapsedMinutes);
    return dateInstance.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const handleAddArtistSubmit = (e) => {
    e.preventDefault();
    if (!newArtist.name) return;
    const formatted = {
      ...newArtist,
      fee: Number(newArtist.fee) || 0,
      pull: Number(newArtist.pull) || 0,
      duration: Number(newArtist.duration) || 30
    };
    handleMoveArtistLists(activeRoster, [formatted, ...bench]);
    setSelectedArtistName(formatted.name);
    setNewArtist({ name: '', tier: 'Low-tier', fee: '', status: 'Inquiry', notes: '', pull: '', duration: 30 });
    setShowAddArtistModal(false);
  };

  const handleEditArtistSubmit = (e) => {
    e.preventDefault();
    const dataForm = new FormData(e.target);
    const updated = {
      ...selectedArtist,
      fee: Number(dataForm.get('fee')),
      status: dataForm.get('status'),
      pull: Number(dataForm.get('pull')),
      duration: Number(dataForm.get('duration')),
      tier: dataForm.get('tier'),
      notes: dataForm.get('notes')
    };

    if (activeRoster.some(a => a.name === updated.name)) {
      handleMoveArtistLists(activeRoster.map(a => a.name === updated.name ? updated : a), bench);
    } else {
      handleMoveArtistLists(activeRoster, bench.map(a => a.name === updated.name ? updated : a));
    }
    setIsEditingArtist(false);
  };

  const handleRemoveArtistFromPool = (name, e) => {
    e.stopPropagation();
    if (!confirm(`Permanently remove ${name} from this project?`)) return;
    const nextActive = activeRoster.filter(a => a.name !== name);
    const nextBench = bench.filter(a => a.name !== name);
    handleMoveArtistLists(nextActive, nextBench);
    if (selectedArtistName === name) {
      const remaining = [...nextActive, ...nextBench];
      setSelectedArtistName(remaining.length > 0 ? remaining[0].name : '');
    }
  };

  // Native HTML5 Drop and Drag Transition System Controls
  const handleDragStart = (e, artistName) => {
    e.dataTransfer.setData("text/plain", artistName);
  };

  const handleDragOverArea = (e) => {
    e.preventDefault(); 
  };

  const handleDropToActiveSequence = (e) => {
    e.preventDefault();
    const targetName = e.dataTransfer.getData("text/plain");
    const artistObj = bench.find(a => a.name === targetName);
    if (artistObj) {
      const nextBench = bench.filter(a => a.name !== targetName);
      const nextActive = [...activeRoster, artistObj];
      handleMoveArtistLists(nextActive, nextBench);
      setSelectedArtistName(targetName);
    }
  };

  const handleDropToStandbyPool = (e) => {
    e.preventDefault();
    const targetName = e.dataTransfer.getData("text/plain");
    const artistObj = activeRoster.find(a => a.name === targetName);
    if (artistObj) {
      const nextActive = activeRoster.filter(a => a.name !== targetName);
      const nextBench = [...bench, artistObj];
      handleMoveArtistLists(nextActive, nextBench);
      setSelectedArtistName(targetName);
    }
  };

  return (
    <div className="app-container">
      
      {/* 🔐 AUTH CONNECTION MODAL */}
      {showAuthModal && (
        <div className="modal-backdrop-layer">
          <div className="panel modal-container-card">
            <div className="panel-header">
              <h2 className="panel-title">{isSignUp ? "Register Account" : "Sign In"}</h2>
            </div>
            <form onSubmit={handleAuthSubmit} className="negotiator-form">
              <input required type="email" placeholder="Operator Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="input-premium-brutalist" />
              <input required type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="input-premium-brutalist" />
              <button type="submit" className="btn-square-brand-solid">Confirm System Verification</button>
              <button type="button" onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }}>
                {isSignUp ? "Already registered? Login instead" : "Need a professional workspace? Register here"}
              </button>
              <button type="button" onClick={() => setShowAuthModal(false)} className="btn-square-outline">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* 📊 INTERFACE VIEW 1: CLEAN DASHBOARD COMMAND CENTER */}
      {currentView === 'dashboard' && (
        <div className="dashboard-view-wrapper animate-fade">
          {/* HEADER SECTION */}
          <div className="header">
            <div className="brand-wrapper">
              <h1 className="brand-title">LINEUPIQ<span className="brand-dot">.</span></h1>
              <span className="brand-version">v2.0 Dashboard</span>
            </div>
            
            <div>
              {user ? (
                <button 
                  onClick={handleSignOut} 
                  className="btn-square-outline"
                  style={{ padding: '6px 14px', fontSize: '0.7rem', color: 'var(--moshpit-red)', borderColor: 'var(--border-heavy)' }}
                >
                  SIGN OUT
                </button>
              ) : (
                <button 
                  onClick={() => { setIsSignUp(false); setShowAuthModal(true); }} 
                  className="btn-square-brand-solid"
                  style={{ padding: '6px 14px', fontSize: '0.7rem' }}
                >
                  Sign In
                </button>
              )}
            </div>
          </div>

          {/* MAIN CONTENT SPLIT GRID */}
          <div className="layout-grid" style={{ marginTop: '24px' }}>
            
            {/* LEFT SIDE: YOUR LINEUPS GRID DIRECTORY */}
            <div className="column-left">
              <h2 className="panel-title" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                YOUR LINEUPS ({lineups.length})
              </h2>
              
              <div className="dashboard-grid-layout">
                {lineups.map(item => {
                  const totalCost = item.activeRoster?.reduce((sum, a) => sum + Number(a.fee || 0), 0) || 0;

                  return (
                    <div 
                      key={item.id} 
                      onClick={() => { setCurrentLineupId(item.id); setSelectedArtistName(''); setCurrentView('editor'); }}
                      className="panel dashboard-card"
                      style={{ minHeight: '190px', justifyContent: 'space-between', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 className="brand-title" style={{ fontSize: '1.2rem', letterSpacing: '-0.02em' }}>{item.name}</h3>
                        {lineups.length > 1 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteLineup(item.id, e); }} 
                            className="directory-trash-cross"
                          >
                            &times;
                          </button>
                        )}
                      </div>
                      
                      <div className="read-only-data-grid" style={{ gap: '8px', marginTop: '12px' }}>
                        <div className="form-row-item">
                          <span className="sidebar-field-label">Acts</span>
                          <span className="sidebar-field-value" style={{ fontSize: '0.95rem' }}>{item.activeRoster?.length || 0}</span>
                        </div>
                        <div className="form-row-item">
                          <span className="sidebar-field-label">Ticket Cap</span>
                          <span className="sidebar-field-value text-mono" style={{ fontSize: '0.95rem' }}>{item.ticketCap?.toLocaleString() || 0}</span>
                        </div>
                        <div className="form-row-item">
                          <span className="sidebar-field-label">Budget</span>
                          <span className="sidebar-field-value text-mono" style={{ fontSize: '0.95rem', color: totalCost > (item.artistBudget || 0) ? 'var(--moshpit-red)' : 'inherit' }}>
                            ${totalCost.toLocaleString()} / ${(item.artistBudget || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <button className="btn-square-outline" style={{ width: '100%', padding: '8px 0', fontSize: '0.65rem', marginTop: '16px' }}>
                        Open Lineup Layout &rarr;
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT SIDE: BRUTALIST SPACE CREATION FORM (AUTH PROTECTED) */}
            <div className="panel" style={{ justifyContent: 'center' }}>
              {user ? (
                <>
                  <h3 className="panel-title" style={{ marginBottom: '20px' }}>
                    + INITIALIZE WORKSPACE
                  </h3>
                  
                  <form onSubmit={handleCreateLineupSubmit} className="negotiator-form" style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label className="sidebar-field-label">Lineup Name</label>
                      <input
                        required
                        type="text"
                        value={newLineupName}
                        onChange={(e) => setNewLineupName(e.target.value)}
                        placeholder="e.g., Crosswire"
                        className="input-premium-brutalist"
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label className="sidebar-field-label">Ticket Cap</label>
                      <input
                        required
                        type="number"
                        value={newLineupCap}
                        onChange={(e) => setNewLineupCap(e.target.value)}
                        placeholder="1150"
                        className="input-premium-brutalist"
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label className="sidebar-field-label">Artist Budget ($)</label>
                      <input
                        required
                        type="number"
                        value={newLineupBudget}
                        onChange={(e) => setNewLineupBudget(e.target.value)}
                        placeholder="18000"
                        className="input-premium-brutalist"
                      />
                    </div>

                    <button type="submit" className="btn-square-brand-solid" style={{ marginTop: '8px' }}>
                      Create Layout
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <h3 className="panel-title" style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
                    Workspace Locked
                  </h3>
                  <p className="notes-content-text" style={{ fontSize: '0.9rem', marginBottom: '20px' }}>
                    You must be signed into an account to generate customized, production-ready lineup workspace layouts.
                  </p>
                  <button 
                    onClick={() => { setIsSignUp(false); setShowAuthModal(true); }} 
                    className="btn-square-brand-solid"
                    style={{ width: '100%' }}
                  >
                    Sign In to Unlock
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 🛠️ INTERFACE VIEW 2: MAIN DYNAMIC CREATOR GRID FRAMEWORK */}
      {currentView === 'editor' && (
        <div className="editor-workspace-wrapper animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <header className="header">
            <div className="brand-wrapper">
              <button onClick={() => setCurrentView('dashboard')} className="btn-square-outline" style={{ padding: '6px 14px', marginRight: '8px', fontSize: '0.7rem' }}>
                &larr; Dashboard Directory
              </button>
              <h1 className="brand-title">{activeLineup.name}</h1>
            </div>
            <div className="header-controls">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="sidebar-field-label">View Layout:</span>
                <select value={currentLineupId} onChange={e => { setCurrentLineupId(e.target.value); setSelectedArtistName(''); }} className="native-dropdown-premium">
                  {lineups.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <button type="button" onClick={() => setShowAddArtistModal(true)} className="btn-square-outline" style={{ background: '#000', color: '#fff', marginLeft: '12px' }}>+ Create Profile</button>
            </div>
          </header>

          {/* DYNAMIC TOP METRICS STRIP */}
          <div className="continuous-metrics-strip">
            <div className="metric-strip-cell">
              <span className="stat-label">Ticket Cap Allocation</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <input type="number" value={activeLineup.ticketCap || 1150} onChange={e => handleUpdateTopMetricStrip('ticketCap', Number(e.target.value))} className="clean-inline-input" style={{ color: currentPull > (activeLineup.ticketCap || 1150) ? 'var(--moshpit-red)' : 'inherit', fontSize: '2rem', fontWeight: 900, border: 'none', background: 'transparent', width: '140px', fontFamily: 'monospace' }} />
                <span className="sidebar-field-label">({currentPull.toLocaleString()} SOLD)</span>
              </div>
            </div>
            <div className="metric-strip-divider" />
            <div className="metric-strip-cell">
              <span className="stat-label">Talent Budget Limit ($)</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'monospace' }}>$</span>
                <input type="number" value={activeLineup.artistBudget || 18000} onChange={e => handleUpdateTopMetricStrip('artistBudget', Number(e.target.value))} className="clean-inline-input" style={{ color: currentSpend > (activeLineup.artistBudget || 18000) ? 'var(--moshpit-red)' : 'inherit', fontSize: '2rem', fontWeight: 900, border: 'none', background: 'transparent', width: '160px', fontFamily: 'monospace' }} />
                <span className="sidebar-field-label">(${currentSpend.toLocaleString()} COMMITTED)</span>
              </div>
            </div>
            <div className="metric-strip-divider" />
            <div className="metric-strip-cell">
              <span className="stat-label">Show Open Clock</span>
              <input type="time" value={activeLineup.startTimeStr || "15:00"} onChange={e => handleUpdateTopMetricStrip('startTimeStr', e.target.value)} className="clean-inline-input" style={{ fontSize: '1.75rem', width: '140px', border: 'none', background: 'transparent', fontWeight: '900', fontFamily: 'monospace' }} />
            </div>
          </div>

          {/* ADD ARTIST MODAL */}
          {showAddArtistModal && (
            <div className="modal-backdrop-layer">
              <div className="panel modal-container-card">
                <div className="panel-header">
                  <h2 className="panel-title">Add Artist Profile</h2>
                </div>
                <form onSubmit={handleAddArtistSubmit} className="negotiator-form" style={{ textAlign: 'left' }}>
                  <input required type="text" placeholder="Performance Name" value={newArtist.name} onChange={e => setNewArtist({...newArtist, name: e.target.value})} className="input-premium-brutalist" />
                  <select value={newArtist.tier} onChange={e => setNewArtist({...newArtist, tier: e.target.value})} className="input-premium-brutalist">
                    <option value="Headliner">Headliner</option>
                    <option value="Mid-tier">Mid-tier</option>
                    <option value="Low-tier">Low-tier</option>
                  </select>
                  <input type="number" placeholder="Guaranteed Offer Fee ($)" value={newArtist.fee} onChange={e => setNewArtist({...newArtist, fee: e.target.value})} className="input-premium-brutalist" />
                  <input type="number" placeholder="Expected Ticket Pull Count" value={newArtist.pull} onChange={e => setNewArtist({...newArtist, pull: e.target.value})} className="input-premium-brutalist" />
                  <select value={newArtist.duration} onChange={e => setNewArtist({...newArtist, duration: Number(e.target.value)})} className="input-premium-brutalist">
                    <option value="15">15 Minutes Set Slot</option>
                    <option value="30">30 Minutes Set Slot</option>
                    <option value="45">45 Minutes Set Slot</option>
                    <option value="60">60 Minutes Set Slot</option>
                  </select>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button type="submit" className="btn-square-brand-solid" style={{ flex: 1 }}>Insert Profile</button>
                    <button type="button" onClick={() => setShowAddArtistModal(false)} className="btn-square-outline" style={{ flex: 1 }}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* DYNAMIC TWO-COLUMN CONFIGURATOR BLOCKS */}
          <div className="layout-grid">
            
            {/* LEFT COLUMN: ACTIVE SEQUENCE & STANDBY POOLS */}
            <div className="column-left">
              
              {/* STAGE TIMELINE CONTAINER DROPTARGET */}
              <div 
                className="panel main-stage"
                onDragOver={handleDragOverArea}
                onDrop={handleDropToActiveSequence}
              >
                <div className="panel-header">
                  <h2 className="panel-title">Today's Lineup ({activeRoster.length})</h2>
                </div>
                <div className="timeline-track-container">
                  {activeRoster.length === 0 ? (
                    <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', border: '2px dashed var(--border-light)' }}>
                      Drag standby pool performance items down here to route them into the active timeline track sequence.
                    </div>
                  ) : (
                    activeRoster.map((artist, idx) => (
                      <div 
                        key={artist.name} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, artist.name)}
                        onClick={() => { setSelectedArtistName(artist.name); setIsEditingArtist(false); }} 
                        className="artist-card" 
                        style={{ borderLeft: selectedArtistName === artist.name ? '4px solid var(--moshpit-red)' : 'none', paddingLeft: selectedArtistName === artist.name ? '12px' : '0' }}
                      >
                        <div className="card-identity-block">
                          <div className="card-time-wrapper">
                            <span className="card-time">{calculateArtistTimeBlock(idx)}</span>
                          </div>
                          <div className="card-text-stack">
                            <span className="card-name">{artist.name}</span>
                            <div className="card-sub-labels">
                              <span className="badge-pill tier-highlight">{artist.tier}</span>
                              <span className="badge-pill duration-meta">{artist.duration} MINS</span>
                            </div>
                          </div>
                        </div>
                        <div className="card-metrics-block">
                          <div className="card-vibe-metric" style={{ marginRight: '16px' }}>
                            <span className="card-vibe-label">PROJECTED PULL</span>
                            <span className="card-vibe-value text-mono">{artist.pull?.toLocaleString() || 0}</span>
                          </div>
                          <div className="card-vibe-metric">
                            <span className="card-vibe-label">GUARANTEE</span>
                            <span className="card-vibe-value text-mono">${artist.fee?.toLocaleString() || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* STANDBY DISCOVERY REPOSITORIES LIST */}
              <div 
                className="panel bench"
                onDragOver={handleDragOverArea}
                onDrop={handleDropToStandbyPool}
              >
                <div className="panel-header">
                  <h2 className="panel-title">Standby Pools Available ({bench.length})</h2>
                </div>
                <div className="hold-pool-container">
                  {bench.length === 0 ? (
                    <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      No available artist components waiting on deck. Use "+ Create Profile" to construct fresh assets.
                    </div>
                  ) : (
                    bench.map(artist => (
                      <div 
                        key={artist.name}
                        draggable
                        onDragStart={(e) => handleDragStart(e, artist.name)}
                        onClick={() => { setSelectedArtistName(artist.name); setIsEditingArtist(false); }}
                        className="artist-card"
                        style={{ borderLeft: selectedArtistName === artist.name ? '4px solid var(--text-secondary)' : 'none', paddingLeft: selectedArtistName === artist.name ? '12px' : '0' }}
                      >
                        <div className="card-identity-block">
                          <div className="card-time-wrapper">
                            <span className="card-time" style={{ color: 'var(--text-muted)' }}>--:--</span>
                          </div>
                          <div className="card-text-stack">
                            <span className="card-name" style={{ color: 'var(--text-secondary)' }}>{artist.name}</span>
                            <div className="card-sub-labels">
                              <span className="badge-pill tier-highlight">{artist.tier}</span>
                              <span className="badge-pill duration-meta">{artist.duration} MINS</span>
                            </div>
                          </div>
                        </div>
                        <div className="card-metrics-block">
                          <div className="card-vibe-metric" style={{ marginRight: '16px' }}>
                            <span className="card-vibe-label">TIX DEMAND</span>
                            <span className="card-vibe-value">{artist.pull}</span>
                          </div>
                          <div className="card-vibe-metric">
                            <span className="card-vibe-label">FEE MATRIX</span>
                            <span className="card-vibe-value">${artist.fee}</span>
                          </div>
                          <button type="button" className="inline-delete-cross" onClick={(e) => { e.stopPropagation(); handleRemoveArtistFromPool(artist.name, e); }}>&times;</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: NEGOTIATION PROFILES WORKBENCH */}
            <div className="panel right-sidebar-card">
              {selectedArtist ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', textAlign: 'left' }}>
                  
                  <div className="notes-section">
                    <h2 className="brand-title" style={{ fontSize: '1.75rem', marginBottom: '8px' }}>{selectedArtist.name}</h2>
                    <p className="notes-content-text">{selectedArtist.notes || "No operational context log profile records on this card layout yet."}</p>
                  </div>

                  <hr className="clean-rule-divider" />

                  <div className="financial-vector-section">
                    <h3 className="panel-title section-title-spacing">Contract Metrics</h3>

                    {isEditingArtist ? (
                      <form onSubmit={handleEditArtistSubmit} className="negotiator-form">
                        <div className="form-row-item">
                          <span className="sidebar-field-label">Tier Group</span>
                          <select name="tier" defaultValue={selectedArtist.tier} className="input-premium-brutalist" style={{ padding: '6px' }}>
                            <option value="Headliner">Headliner</option>
                            <option value="Mid-tier">Mid-tier</option>
                            <option value="Low-tier">Low-tier</option>
                          </select>
                        </div>
                        <div className="form-row-item">
                          <span className="sidebar-field-label">Set Clock Duration</span>
                          <select name="duration" defaultValue={selectedArtist.duration} className="input-premium-brutalist" style={{ padding: '6px' }}>
                            <option value="15">15 Min</option>
                            <option value="30">30 Min</option>
                            <option value="45">45 Min</option>
                            <option value="60">60 Min</option>
                          </select>
                        </div>
                        <div className="form-row-item">
                          <span className="sidebar-field-label">Guaranteed Fee ($)</span>
                          <input name="fee" type="number" defaultValue={selectedArtist.fee} className="input-premium-brutalist" style={{ padding: '6px', width: '140px' }} />
                        </div>
                        <div className="form-row-item">
                          <span className="sidebar-field-label">Expected Pull</span>
                          <input name="pull" type="number" defaultValue={selectedArtist.pull} className="input-premium-brutalist" style={{ padding: '6px', width: '140px' }} />
                        </div>
                        <div className="form-row-item">
                          <span className="sidebar-field-label">Booking Status</span>
                          <select name="status" defaultValue={selectedArtist.status} className="input-premium-brutalist" style={{ padding: '6px' }}>
                            <option value="Booked">Booked</option>
                            <option value="Reached out">Reached out</option>
                            <option value="Inquiry">Inquiry</option>
                            <option value="Draft Contract">Draft Contract</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span className="sidebar-field-label">Roster System Logs</span>
                          <textarea name="notes" defaultValue={selectedArtist.notes} className="input-premium-brutalist" style={{ minHeight: '80px', fontFamily: 'inherit', fontSize: '0.85rem' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                          <button type="submit" className="btn-square-brand-solid" style={{ flex: 1, padding: '10px', background: '#000', borderColor: '#000' }}>Commit Data</button>
                          <button type="button" onClick={() => setIsEditingArtist(false)} className="btn-square-outline" style={{ flex: 1, padding: '10px' }}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="read-only-data-grid">
                        <div className="form-row-item">
                          <span className="sidebar-field-label">Placement:</span>
                          <span className="sidebar-field-value" style={{ fontSize: '1rem' }}>
                            {activeRoster.findIndex(a => a.name === selectedArtist.name) !== -1 ? 'ACTIVE SET LINEUP' : 'STANDBY LOCK POOL'}
                          </span>
                        </div>
                        <div className="form-row-item">
                          <span className="sidebar-field-label">Cost / Pay:</span>
                          <span className="sidebar-field-value text-mono" style={{ fontSize: '1rem' }}>${selectedArtist.fee.toLocaleString()} USD</span>
                        </div>
                        <div className="form-row-item">
                          <span className="sidebar-field-label">Status:</span>
                          <span className="sidebar-field-value" style={{ fontSize: '1rem' }}>{selectedArtist.status}</span>
                        </div>
                        <div className="form-row-item breakeven-container">
                          <span className="breakeven-label">BREAK-EVEN:</span>
                          <span className="breakeven-value">${(Math.ceil(selectedArtist.fee / TICKET_PRICE) * TICKET_PRICE).toLocaleString()} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({Math.ceil(selectedArtist.fee / TICKET_PRICE)} TIX)</span></span>
                        </div>
                        
                        <button type="button" onClick={() => setIsEditingArtist(true)} className="status-tag-block offer-block">
                          Review Offer / Negotiate
                        </button>
                      </div>
                    )}

                  </div>
                </div>
              ) : (
                <div style={{ padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Select an artist profile to inspect contract financials.
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}