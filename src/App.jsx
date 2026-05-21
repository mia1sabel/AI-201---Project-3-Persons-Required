import React, { useState, useEffect } from 'react';
import './App.css';

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
  const [activeRoster, setActiveRoster] = useState(() => {
    const saved = localStorage.getItem('crosswireActive');
    return saved ? JSON.parse(saved) : [];
  });
  const [bench, setBench] = useState(() => {
    const saved = localStorage.getItem('crosswireBench');
    return saved ? JSON.parse(saved) : initialRoster;
  });
  
  const [selectedArtistName, setSelectedArtistName] = useState(() => {
    const savedActive = localStorage.getItem('crosswireActive');
    const savedBench = localStorage.getItem('crosswireBench');
    const parsedActive = savedActive ? JSON.parse(savedActive) : [];
    const parsedBench = savedBench ? JSON.parse(savedBench) : initialRoster;
    return parsedActive[0]?.name || parsedBench[0]?.name || '';
  });

  const [isEditing, setIsEditing] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [newArtist, setNewArtist] = useState({
    name: '', tier: 'Low-tier', fee: '', status: 'Inquiry', notes: '', pull: '', duration: 30
  });

  useEffect(() => {
    localStorage.setItem('crosswireActive', JSON.stringify(activeRoster));
    localStorage.setItem('crosswireBench', JSON.stringify(bench));
  }, [activeRoster, bench]);

  const TOTAL_BUDGET = 18000;
  const CAPACITY = 1150;
  const TICKET_PRICE = 40; 
  const BRAND_RED = '#FF0033';

  const allArtists = [...activeRoster, ...bench];
  const selectedArtist = allArtists.find(a => a.name === selectedArtistName) || allArtists[0];
  const currentSpend = activeRoster.reduce((sum, artist) => sum + artist.fee, 0);
  const currentPull = activeRoster.reduce((sum, artist) => sum + artist.pull, 0);

  // Director's Updates: Start 1 hour late (3:00 PM) + add 15 min break between acts
  const getDynamicTime = (index) => {
    let totalMinutes = 0;
    for (let i = 0; i < index; i++) {
        const setDuration = Number(activeRoster[i].duration) || 30;
        const breakTime = 15;
        totalMinutes += (setDuration + breakTime);
    }
    const startTime = new Date();
    startTime.setHours(15, 0, 0, 0); // Pushed from 2:00 PM to 3:00 PM (giving an hour buffer before music starts)
    startTime.setMinutes(startTime.getMinutes() + totalMinutes);
    return startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

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
      sourceList === 'active' ? setActiveRoster(sourceArray) : setBench(sourceArray);
    } else {
      let finalTargetIndex = Math.max(0, Math.min(targetIndex, targetArray.length));
      targetArray.splice(finalTargetIndex, 0, movedItem);
      sourceList === 'active' ? setActiveRoster(sourceArray) : setBench(sourceArray);
      targetList === 'active' ? setActiveRoster(targetArray) : setBench(targetArray);
    }
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
    setBench([created, ...bench]);
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
    
    setActiveRoster(filteredActive);
    setBench(filteredBench);

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
      setActiveRoster(activeRoster.map(a => a.name === updatedArtist.name ? updatedArtist : a));
    } else {
      setBench(bench.map(a => a.name === updatedArtist.name ? updatedArtist : a));
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
      <header className="header">
        <div className="brand-wrapper">
          <h1 className="brand-title">LineupIQ<span className="brand-dot">.</span></h1>
          <span className="brand-version">v2.0</span>
        </div>
        <button type="button" onClick={() => setShowAddModal(true)} className="btn-square-outline">
          + Add Artist
        </button>
      </header>

      <div className="continuous-metrics-strip">
        <div className="metric-strip-cell">
          <div className="stat-label">Ticket Cap</div>
          <div className="stat-value" style={{ color: currentPull > CAPACITY ? BRAND_RED : 'var(--text-primary)' }}>
            {currentPull.toLocaleString()} / {CAPACITY.toLocaleString()}
          </div>
        </div>
        <div className="metric-strip-divider" />
        <div className="metric-strip-cell">
          <div className="stat-label">Artist Budget</div>
          <div className="stat-value" style={{ color: currentSpend > TOTAL_BUDGET ? BRAND_RED : 'var(--text-primary)' }}>
            ${currentSpend.toLocaleString()} / ${TOTAL_BUDGET.toLocaleString()}
          </div>
        </div>
      </div>

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