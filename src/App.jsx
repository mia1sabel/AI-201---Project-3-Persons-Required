import React, { useState, useEffect } from 'react';
import './App.css';

// Firebase Imports
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

const initialRoster = [
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
  // --- FIREBASE ACCOUNT STATE ---
  const [user, setUser] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // --- MULTI-LINEUP WORKSPACE MANAGERS ---
  const [lineups, setLineups] = useState([
    { id: '1', name: "Main Stage Draft", activeRoster: [], bench: initialRoster }
  ]);
  const [currentLineupId, setCurrentLineupId] = useState('1');

  // --- CORE APP METRICS ---
  const [ticketCap, setTicketCap] = useState(1150);
  const [artistBudget, setArtistBudget] = useState(18000);
  const [startTimeStr, setStartTimeStr] = useState("15:00");

  const TICKET_PRICE = 40; 
  const BRAND_RED = '#FF0033';

  // --- UI LOCAL STATES ---
  const [selectedArtistName, setSelectedArtistName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLineupName, setNewLineupName] = useState('');
  const [newArtist, setNewArtist] = useState({
    name: '', tier: 'Low-tier', fee: '', status: 'Inquiry', notes: '', pull: '', duration: 30
  });

  // Safe Multi-Workspace Active References
  const activeLineup = lineups.find(l => l.id === currentLineupId) || lineups[0];
  const { activeRoster, bench } = activeLineup;
  const allArtists = [...activeRoster, ...bench];
  const selectedArtist = allArtists.find(a => a.name === selectedArtistName) || allArtists[0];
  const currentSpend = activeRoster.reduce((sum, artist) => sum + artist.fee, 0);
  const currentPull = activeRoster.reduce((sum, artist) => sum + artist.pull, 0);

  // 1. Listen for Real-time Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        const saved = localStorage.getItem('crosswire_cloud_lineups');
        if (saved) setLineups(JSON.parse(saved));
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-Time Cloud Subscription via Firestore
  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.lineups) setLineups(data.lineups);
        if (data.ticketCap) setTicketCap(data.ticketCap);
        if (data.artistBudget) setArtistBudget(data.artistBudget);
        if (data.startTimeStr) setStartTimeStr(data.startTimeStr);
      } else {
        setDoc(docRef, {
          lineups,
          ticketCap,
          artistBudget,
          startTimeStr
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Fallback Local Storage Backup
  useEffect(() => {
    if (!user) {
      localStorage.setItem('crosswire_cloud_lineups', JSON.stringify(lineups));
    }
  }, [lineups, user]);

  // Global Workspace Sync Engine
  const saveWorkspaceData = async (updatedLineups, optCap, optBudget, optTime) => {
    const nextLineups = updatedLineups || lineups;
    const nextCap = optCap !== undefined ? optCap : ticketCap;
    const nextBudget = optBudget !== undefined ? optBudget : artistBudget;
    const nextTime = optTime !== undefined ? optTime : startTimeStr;

    setLineups(nextLineups);
    if (optCap !== undefined) setTicketCap(optCap);
    if (optBudget !== undefined) setArtistBudget(optBudget);
    if (optTime !== undefined) setStartTimeStr(optTime);

    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), {
          lineups: nextLineups,
          ticketCap: nextCap,
          artistBudget: nextBudget,
          startTimeStr: nextTime
        }, { merge: true });
      } catch (err) {
        console.error("Firestore Update Protection Intercept: ", err);
      }
    }
  };

  const updateCurrentLineupData = (newActive, newBench) => {
    const updated = lineups.map(l => l.id === currentLineupId ? { ...l, activeRoster: newActive, bench: newBench } : l);
    saveWorkspaceData(updated);
  };

  // Auth Submit Routing
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

  const handleLogout = () => {
    signOut(auth);
    setCurrentLineupId('1');
  };

  // Your Director's Dynamic Time Calculator Engine
  const getDynamicTime = (index) => {
    let totalMinutes = 0;
    for (let i = 0; i < index; i++) {
        const setDuration = Number(activeRoster[i].duration) || 30;
        const breakTime = 15;
        totalMinutes += (setDuration + breakTime);
    }
    const [hours, minutes] = startTimeStr.split(':').map(Number);
    const startTime = new Date();
    startTime.setHours(hours, minutes, 0, 0); 
    startTime.setMinutes(startTime.getMinutes() + totalMinutes);
    return startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Drag and Drop Controllers
  const handleDragStart = (e, sourceList, index) => {
    setDraggedItem({ list: sourceList, index });
    e.dataTransfer.setData('sourceList', sourceList);
    e.dataTransfer.setData('sourceIndex', index);
  };

  const handleDragOver = (e, targetList) => {
    e.preventDefault();
    const panel = e.currentTarget.closest('.panel');
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    const mouseY = e.clientY;
    const threshold = 60; 
    const topZone = rect.top + threshold;
    const bottomZone = rect.bottom - threshold;

    if (mouseY < topZone) {
      panel.scrollTop -= 8;
    } else if (mouseY > bottomZone) {
      panel.scrollTop += 8;
    }

    const cards = Array.from(panel.querySelectorAll('.artist-card'));
    let calculatedIndex = targetList === 'active' ? activeRoster.length : bench.length;

    if (cards.length > 0) {
      const nextCard = cards.find(card => {
        const box = card.getBoundingClientRect();
        return mouseY < (box.top + box.height / 2);
      });

      if (nextCard) {
        const cardName = nextCard.getAttribute('data-name');
        const list = targetList === 'active' ? activeRoster : bench;
        const foundIndex = list.findIndex(a => a.name === cardName);
        if (foundIndex !== -1) calculatedIndex = foundIndex;
      }
    }

    if (dragOverItem?.list !== targetList || dragOverItem?.index !== calculatedIndex) {
      setDragOverItem({ list: targetList, index: calculatedIndex });
    }
  };

  const handleDrop = (e, targetList) => {
    e.preventDefault();
    const sourceList = e.dataTransfer.getData('sourceList');
    const sourceIndex = parseInt(e.dataTransfer.getData('sourceIndex'), 10);
    
    const targetIndex = dragOverItem && dragOverItem.list === targetList 
      ? dragOverItem.index 
      : (targetList === 'active' ? activeRoster.length : bench.length);

    setDraggedItem(null);
    setDragOverItem(null);

    if (sourceList === targetList && sourceIndex === targetIndex) return;

    let sourceArray = sourceList === 'active' ? [...activeRoster] : [...bench];
    let targetArray = targetList === 'active' ? [...activeRoster] : [...bench];
    const [movedItem] = sourceArray.splice(sourceIndex, 1);
    
    if (sourceList === targetList) {
      let finalTargetIndex = targetIndex;
      if (sourceIndex < targetIndex) finalTargetIndex--;
      finalTargetIndex = Math.max(0, Math.min(finalTargetIndex, sourceArray.length));
      sourceArray.splice(finalTargetIndex, 0, movedItem);
      sourceList === 'active' ? updateCurrentLineupData(sourceArray, bench) : updateCurrentLineupData(activeRoster, sourceArray);
    } else {
      let finalTargetIndex = Math.max(0, Math.min(targetIndex, targetArray.length));
      targetArray.splice(finalTargetIndex, 0, movedItem);
      sourceList === 'active' ? updateCurrentLineupData(sourceArray, targetArray) : updateCurrentLineupData(targetArray, sourceArray);
    }
  };

  const handleCreateLineup = (e) => {
    e.preventDefault();
    if (!newLineupName.trim()) return;
    const newId = Date.now().toString();
    const created = { id: newId, name: newLineupName.trim(), activeRoster: [], bench: initialRoster };
    saveWorkspaceData([...lineups, created]);
    setCurrentLineupId(newId);
    setNewLineupName('');
  };

  const handleAddArtist = (e) => {
    e.preventDefault();
    if (!newArtist.name) return;
    const created = {
      ...newArtist,
      fee: Number(newArtist.fee) || 0,
      pull: Number(newArtist.pull) || 0,
      duration: Number(newArtist.duration) || 30
    };
    updateCurrentLineupData(activeRoster, [created, ...bench]);
    setSelectedArtistName(created.name);
    setNewArtist({ name: '', tier: 'Low-tier', fee: '', status: 'Inquiry', notes: '', pull: '', duration: 30 });
    setShowAddModal(false);
  };

  const handleDeleteArtist = (name, e) => {
    e.stopPropagation(); 
    e.preventDefault();
    
    const confirmClear = window.confirm(`Permanently delete ${name} from roster parameters?`);
    if (!confirmClear) return;

    const filteredActive = activeRoster.filter(a => a.name !== name);
    const filteredBench = bench.filter(a => a.name !== name);
    
    updateCurrentLineupData(filteredActive, filteredBench);

    if (selectedArtistName === name) {
      const remaining = [...filteredActive, ...filteredBench];
      setSelectedArtistName(remaining.length > 0 ? remaining[0].name : '');
    }
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedArtist = {
      ...selectedArtist,
      fee: Number(formData.get('fee')),
      status: formData.get('status'),
      pull: Number(formData.get('pull')),
      duration: Number(formData.get('duration')),
      tier: formData.get('tier'),
      notes: formData.get('notes') 
    };

    if (activeRoster.some(a => a.name === updatedArtist.name)) {
      updateCurrentLineupData(activeRoster.map(a => a.name === updatedArtist.name ? updatedArtist : a), bench);
    } else {
      updateCurrentLineupData(activeRoster, bench.map(a => a.name === updatedArtist.name ? updatedArtist : a));
    }
    setIsEditing(false);
  };

  const renderArtistCard = (artist, index, listType) => {
    const isDragged = draggedItem?.list === listType && draggedItem?.index === index;
    const isHovered = dragOverItem?.list === listType && dragOverItem?.index === index;
    const isSelected = selectedArtist && selectedArtist.name === artist.name;

    return (
      <div 
        key={artist.name}
        data-name={artist.name}
        draggable
        onDragStart={(e) => handleDragStart(e, listType, index)}
        onClick={() => { setSelectedArtistName(artist.name); setIsEditing(false); }}
        className="artist-card"
        style={{ 
          opacity: isDragged ? 0.2 : 1,
          borderBottom: isHovered && !isDragged ? '1px solid var(--border-heavy)' : '1px solid var(--border-light)',
          background: isSelected ? 'rgba(0, 0, 0, 0.05)' : 'transparent'
        }}
      >
        <div className="card-identity-block">
          <div className="card-time-wrapper">
            <span className="card-time">{listType === 'active' ? getDynamicTime(index) : '--:--'}</span>
          </div>
          
          <div className="card-text-stack">
            <span className="card-name" style={{ textDecoration: isSelected ? 'underline' : 'none' }}>{artist.name}</span>
            <div className="card-sub-labels">
              <span className="badge-pill tier-highlight">{artist.tier}</span>
              <span className="badge-pill duration-meta">{artist.duration} MINS</span>
            </div>
          </div>
        </div>

        <div className="card-metrics-block">
          <div className="card-vibe-metric" style={{ marginRight: '16px' }}>
            <span className="card-vibe-label">Tix Pull</span>
            <span className="card-vibe-value">{artist.pull}</span>
          </div>
          <div className="card-vibe-metric" style={{ marginRight: '12px' }}>
            <span className="card-vibe-label">Cost</span>
            <span className="card-vibe-value">${artist.fee}</span>
          </div>
          <button 
            type="button" 
            className="inline-delete-cross" 
            onClick={(e) => handleDeleteArtist(artist.name, e)}
          >
            ×
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* BRAND INTERFACE HEADER */}
      <header className="header">
        <div className="brand-wrapper">
          <h1 className="brand-title">LineupIQ<span className="brand-dot">.</span></h1>
          <span className="brand-version">v2.0</span>
        </div>
        
        <div className="header-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Workspace Switcher */}
          <div className="lineup-selector-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '2px solid #000', padding: '4px 12px', background: '#fff' }}>
            <span className="stat-label" style={{ margin: 0, fontSize: '0.75rem' }}>Workspace:</span>
            <select value={currentLineupId} onChange={e => { setCurrentLineupId(e.target.value); setSelectedArtistName(''); }} style={{ border: 'none', fontWeight: '900', textTransform: 'uppercase', outline: 'none', cursor: 'pointer' }}>
              {lineups.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {/* Create Layout Sub-Form */}
          <form onSubmit={handleCreateLineup} style={{ display: 'flex', gap: '4px' }}>
            <input required type="text" placeholder="Layout Title..." value={newLineupName} onChange={e => setNewLineupName(e.target.value)} className="input-premium-brutalist" style={{ padding: '6px 10px', fontSize: '0.75rem' }} />
            <button type="submit" className="btn-square-outline" style={{ padding: '6px 12px' }}>Save New</button>
          </form>

          <button type="button" onClick={() => setShowAddModal(true)} className="btn-square-outline" style={{ background: '#000', color: '#fff' }}>
            + Add Artist
          </button>

          <button type="button" onClick={() => user ? handleLogout() : setShowAuthModal(true)} className="btn-square-outline" style={{ borderColor: BRAND_RED, color: BRAND_RED, fontWeight: 'bold' }}>
            {user ? `Sign Out (${user.email})` : 'Sync Device'}
          </button>
        </div>
      </header>

      {/* DYNAMIC ADJUSTABLE CONTINUOUS STRIP */}
      <div className="continuous-metrics-strip" style={{ padding: '6px 16px' }}>
        <div className="metric-strip-cell">
          <div className="stat-label">Ticket Cap</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="number" value={ticketCap} onChange={e => saveWorkspaceData(null, Number(e.target.value), undefined, undefined)} className="clean-inline-input text-mono" style={{ color: currentPull > ticketCap ? BRAND_RED : 'var(--text-primary)', width: '90px', fontValues: 'inherit', fontWeight: '900', fontSize: '1.4rem', border: 'none', background: 'transparent' }} />
            <span className="inline-progress-subtext" style={{ fontSize: '0.8rem', opacity: 0.6 }}>({currentPull.toLocaleString()} SOLD)</span>
          </div>
        </div>
        <div className="metric-strip-divider" />
        <div className="metric-strip-cell">
          <div className="stat-label">Artist Budget</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontWeight: '900', fontSize: '1.4rem' }}>$</span>
            <input type="number" value={artistBudget} onChange={e => saveWorkspaceData(null, undefined, Number(e.target.value), undefined)} className="clean-inline-input text-mono" style={{ color: currentSpend > artistBudget ? BRAND_RED : 'var(--text-primary)', width: '110px', fontWeight: '900', fontSize: '1.4rem', border: 'none', background: 'transparent' }} />
            <span className="inline-progress-subtext" style={{ fontSize: '0.8rem', opacity: 0.6 }}>(${currentSpend.toLocaleString()} ALLOCATED)</span>
          </div>
        </div>
        <div className="metric-strip-divider" />
        <div className="metric-strip-cell">
          <div className="stat-label">Show Door Time</div>
          <input type="time" value={startTimeStr} onChange={e => saveWorkspaceData(null, undefined, undefined, e.target.value)} className="clean-inline-input text-mono" style={{ fontSize: '1.3rem', width: '130px', fontWeight: '900', border: 'none', background: 'transparent' }} />
        </div>
      </div>

      {/* SECURITY CLOUD MODULE MODAL */}
      {showAuthModal && (
        <div className="modal-backdrop-layer">
          <div className="modal-container-card panel">
            <h2 className="panel-title">{isSignUp ? "Create Account" : "Sync Workspace Profile"}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '12px 0' }}>
              Access cloud syncing capabilities across screen contexts.
            </p>
            <form onSubmit={handleAuthSubmit} className="negotiator-form">
              <input required type="email" placeholder="Email Address" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="input-premium-brutalist" style={{ marginBottom: '8px' }} />
              <input required type="password" placeholder="Password (min 6 chars)" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="input-premium-brutalist" style={{ marginBottom: '12px' }} />
              <button type="submit" className="btn-square-brand-solid" style={{ width: '100%', padding: '12px', background: '#000', color: '#fff' }}>
                {isSignUp ? "Register Account" : "Connect Setup"}
              </button>
              <button type="button" onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', textDecoration: 'underline', marginTop: '12px', fontSize: '0.8rem', cursor: 'pointer' }}>
                {isSignUp ? "Have an account? Log In" : "Need an account? Register"}
              </button>
              <button type="button" onClick={() => setShowAuthModal(false)} className="btn-square-outline" style={{ width: '100%', marginTop: '8px' }}>Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* DIALOG NEW ENTRY MODULE */}
      {showAddModal && (
        <div className="modal-backdrop-layer">
          <div className="modal-container-card panel">
            <div className="panel-header">
              <h2 className="panel-title">New Artist Entry</h2>
            </div>
            <form onSubmit={handleAddArtist} className="negotiator-form">
              <div className="form-row-item">
                <span className="sidebar-field-label">Artist Name</span>
                <input required type="text" value={newArtist.name} onChange={e => setNewArtist({...newArtist, name: e.target.value})} className="input-premium-brutalist" />
              </div>
              <div className="form-row-item">
                <span className="sidebar-field-label">Tier Group</span>
                <select value={newArtist.tier} onChange={e => setNewArtist({...newArtist, tier: e.target.value})} className="input-premium-brutalist">
                  <option value="Headliner">Headliner</option>
                  <option value="Mid-tier">Mid-tier</option>
                  <option value="Low-tier">Low-tier</option>
                </select>
              </div>
              <div className="form-row-item">
                <span className="sidebar-field-label">Fee ($)</span>
                <input type="number" value={newArtist.fee} onChange={e => setNewArtist({...newArtist, fee: e.target.value})} className="input-premium-brutalist" />
              </div>
              <div className="form-row-item">
                <span className="sidebar-field-label">Projected Ticket Pull</span>
                <input type="number" value={newArtist.pull} onChange={e => setNewArtist({...newArtist, pull: e.target.value})} className="input-premium-brutalist" />
              </div>
              <div className="form-row-item">
                <span className="sidebar-field-label">Duration</span>
                <select value={newArtist.duration} onChange={e => setNewArtist({...newArtist, duration: e.target.value})} className="input-premium-brutalist">
                  <option value="15">15 Min</option>
                  <option value="30">30 Min</option>
                  <option value="45">45 Min</option>
                  <option value="60">60 Min</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <button type="submit" className="btn-square-outline" style={{ background: '#000', color: '#fff', flex: 1 }}>Add</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-square-outline" style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CORE WORKSPACE GRID CONTAINER */}
      <div className="layout-grid">
        <div className="column-left">
          <div className="panel main-stage" onDragOver={(e) => handleDragOver(e, 'active')} onDrop={(e) => handleDrop(e, 'active')}>
            <div className="panel-header">
                <h2 className="panel-title">Lineup ({activeRoster.length})</h2>
            </div>
            <div className="timeline-track-container">
              {activeRoster.map((artist, i) => renderArtistCard(artist, i, 'active'))}
            </div>
          </div>

          <div className="panel bench" onDragOver={(e) => handleDragOver(e, 'bench')} onDrop={(e) => handleDrop(e, 'bench')}>
            <div className="panel-header">
                <h2 className="panel-title" style={{ color: 'var(--text-secondary)' }}>Standby Pool ({bench.length})</h2>
            </div>
            <div className="hold-pool-container">
              {bench.map((artist, i) => renderArtistCard(artist, i, 'bench'))}
            </div>
          </div>
        </div>

        {/* FINANCIAL RIGHT SIDE PANEL */}
        <div className="column-right panel right-sidebar-card">
          {selectedArtist ? (
            <>
              <div className="notes-section" style={{ marginTop: '0px' }}>
                   <h2 className="panel-title">{selectedArtist.name}</h2>
                   <p className="notes-content-text" style={{ marginTop: '16px', textAlign: 'left' }}>{selectedArtist.notes || "No workspace log lines found for active profile focus."}</p>
              </div>

              <hr className="clean-rule-divider" />

              <div className="financial-vector-section">
                <h2 className="panel-title section-title-spacing">Finances</h2>

                {isEditing ? (
                  <form onSubmit={handleEditSubmit} className="negotiator-form">
                    <div className="form-row-item">
                        <span className="stat-label">Tier Group</span>
                        <select name="tier" defaultValue={selectedArtist.tier} className="input-premium-brutalist" style={{ width: '140px' }}>
                            <option value="Headliner">Headliner</option>
                            <option value="Mid-tier">Mid-tier</option>
                            <option value="Low-tier">Low-tier</option>
                        </select>
                    </div>
                    <div className="form-row-item">
                        <span className="stat-label">Duration Block</span>
                        <select name="duration" defaultValue={selectedArtist.duration} className="input-premium-brutalist" style={{ width: '140px' }}>
                            <option value="15">15 Minutes</option><option value="30">30 Minutes</option><option value="45">45 Minutes</option><option value="60">60 Minutes</option>
                        </select>
                    </div>
                    <div className="form-row-item">
                        <span className="stat-label">Guaranteed Fee ($)</span>
                        <input name="fee" type="number" defaultValue={selectedArtist.fee} className="input-premium-brutalist" style={{ width: '120px', textAlign: 'right' }} />
                    </div>
                    <div className="form-row-item">
                        <span className="stat-label">Projected Ticket Pull</span>
                        <input name="pull" type="number" defaultValue={selectedArtist.pull} className="input-premium-brutalist" style={{ width: '120px', textAlign: 'right' }} />
                    </div>
                    <div className="form-row-item">
                        <span className="stat-label">Status</span>
                        <select name="status" defaultValue={selectedArtist.status} className="input-premium-brutalist" style={{ width: '180px' }}>
                            <option value="Booked">Booked</option>
                            <option value="Reached out">Reached out</option>
                            <option value="Inquiry">Inquiry</option>
                            <option value="Draft Contract">Draft Contract</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                        <span className="stat-label">Edit Notes</span>
                        <textarea name="notes" defaultValue={selectedArtist.notes} className="input-premium-brutalist" style={{ minHeight: '80px', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.4' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: 'auto' }}>
                        <button type="submit" className="btn-square-brand-solid" style={{ flex: 1 }}>Commit</button>
                        <button type="button" onClick={() => setIsEditing(false)} className="btn-square-outline" style={{ flex: 1 }}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div className="read-only-data-grid">
                    <div className="form-row-item">
                      <span className="sidebar-field-label">Schedule Block:</span>
                      <span className="sidebar-field-value">
                        {activeRoster.findIndex(a => a.name === selectedArtist.name) !== -1 
                          ? `${getDynamicTime(activeRoster.findIndex(a => a.name === selectedArtist.name))} (${selectedArtist.duration} MIN)` 
                          : 'STANDBY POOL'}
                      </span>
                    </div>
                    <div className="form-row-item">
                      <span className="sidebar-field-label">Cost:</span>
                      <span className="sidebar-field-value text-mono">${selectedArtist.fee.toLocaleString()} USD</span>
                    </div>
                    <div className="form-row-item">
                      <span className="sidebar-field-label">Status:</span>
                      <span className="sidebar-field-value">{selectedArtist.status}</span>
                    </div>
                    <div className="form-row-item breakeven-container">
                        <span className="breakeven-label">BREAK-EVEN:</span>
                        <span className="breakeven-value">
                          {Math.ceil(selectedArtist.fee / TICKET_PRICE)} TICKETS
                        </span>
                    </div>
                    <button onClick={() => setIsEditing(true)} className="status-tag-block offer-block">Review Offer</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state-message" style={{ margin: 'auto' }}>No Artists Left In Roster Parameters</div>
          )}
        </div>
      </div>
    </div>
  );
}