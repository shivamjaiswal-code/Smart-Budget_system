import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import './App.css';

// 100% Correct Live URL (l1 ke sath)
const API_URL = 'https://smart-budget-system-d5l1.onrender.com';

function App() {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('smartbudget_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      return null;
    }
  });
  
  const [isLoginView, setIsLoginView] = useState(true);
  
  // App Navigation States
  const [bottomNav, setBottomNav] = useState('Trans'); // Naya Bottom Navigation (Trans, Stats, Accounts, More)
  const [activeTab, setActiveTab] = useState('Monthly'); // Upar wale tabs
  
  const [currentMonth, setCurrentMonth] = useState('Sep 2026');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [expenses, setExpenses] = useState([]);
  
  const [allMonthExpenses, setAllMonthExpenses] = useState([]);
  const [calendarSelectedFolder, setCalendarSelectedFolder] = useState(null);
  
  const [newSection, setNewSection] = useState({ name: '', budget: '' });
  const [newExpense, setNewExpense] = useState({ name: '', amount: '' });

  // Edit Folder States
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editFolderForm, setEditFolderForm] = useState({ name: '', budget: '' });

  // --- AUTHENTICATION ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = isLoginView ? '/api/login' : '/api/signup';
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await response.json();
      
      if (response.ok) {
        if (isLoginView) {
          setUser(data.user);
          localStorage.setItem('smartbudget_user', JSON.stringify(data.user));
        } else {
          alert("Account ban gaya! Ab login karein.");
          setIsLoginView(true);
        }
      } else {
        setAuthError(data.error || "Galat details");
      }
    } catch (err) {
      console.error("Auth fetch error:", err);
      setAuthError("Server se connect nahi hua.");
    }
  };

  const logout = () => { 
    setUser(null); setSelectedSection(null); setCalendarSelectedFolder(null);
    localStorage.removeItem('smartbudget_user');
  };

  // --- DATA FETCHING ---
  const fetchSections = async () => {
    if (!user || !user.id) return;
    try {
      const safeMonth = encodeURIComponent(currentMonth);
      const res = await fetch(`${API_URL}/api/sections/${user.id}/${safeMonth}`);
      if (res.ok) {
        const data = await res.json();
        setSections(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error("Error fetching sections:", err); }
  };

  const fetchAllMonthExpenses = async () => {
    if (!user || !user.id) return;
    try {
      const safeMonth = encodeURIComponent(currentMonth);
      const res = await fetch(`${API_URL}/api/all-expenses/${user.id}/${safeMonth}`);
      if (res.ok) {
        const data = await res.json();
        setAllMonthExpenses(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error("Error fetching all month expenses:", err); }
  };

  const fetchExpenses = async (sectionId) => {
    try {
      const res = await fetch(`${API_URL}/api/expenses/${sectionId}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error("Error fetching section expenses:", err); }
  };

  useEffect(() => {
    if (user && user.id) {
      fetchSections();
      fetchAllMonthExpenses();
    }
  }, [user, currentMonth]);

  // --- ACTIONS ---
  const addSection = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/sections`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, month_year: currentMonth, sectionName: newSection.name, totalBudget: newSection.budget })
      });
      if (res.ok) { setNewSection({ name: '', budget: '' }); fetchSections(); }
    } catch (err) { console.error(err); }
  };

  const deleteSection = async (id) => {
    if (!window.confirm("Sach me ye folder delete karna hai?")) return;
    try {
      const res = await fetch(`${API_URL}/api/sections/${id}`, { method: 'DELETE' });
      if (res.ok) fetchSections();
    } catch (err) { console.error(err); }
  };

  const saveFolderEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/sections/${editingFolderId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionName: editFolderForm.name, totalBudget: editFolderForm.budget })
      });
      if (res.ok) { setEditingFolderId(null); fetchSections(); }
    } catch (err) { console.error(err); }
  };

  const addExpense = async (e) => {
    e.preventDefault();
    const formattedDate = selectedDate.toISOString().split('T')[0]; 
    try {
      const res = await fetch(`${API_URL}/api/expenses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section_id: selectedSection.id, itemName: newExpense.name, amount: newExpense.amount, expense_date: formattedDate })
      });
      if (res.ok) { setNewExpense({ name: '', amount: '' }); fetchExpenses(selectedSection.id); fetchAllMonthExpenses(); }
    } catch (err) { console.error(err); }
  };

  const getStatsUpToDate = (folderId) => {
    const folder = sections.find(s => s.id === folderId);
    const budget = folder ? Number(folder.totalBudget) : 0;
    const kharch = allMonthExpenses.filter(exp => {
      if (exp.section_id !== folderId || !exp.expense_date) return false;
      const expDate = new Date(exp.expense_date);
      const selDate = new Date(selectedDate);
      expDate.setHours(0,0,0,0); selDate.setHours(0,0,0,0);
      return expDate <= selDate;
    }).reduce((sum, exp) => sum + Number(exp.amount), 0);
    return { budget, kharch, bacha: budget - kharch };
  };

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>{isLoginView ? 'Welcome Back 👋' : 'Create Account 🚀'}</h2>
          {authError && <p className="error-msg">{authError}</p>}
          <form onSubmit={handleAuth}>
            {!isLoginView && <input type="text" placeholder="Apna Naam" required value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} />}
            <input type="email" placeholder="Email Address" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} />
            <input type="password" placeholder="Password" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
            <button type="submit" className="primary-btn w-full">{isLoginView ? 'Login' : 'Sign Up'}</button>
          </form>
          <p className="toggle-auth" onClick={() => { setIsLoginView(!isLoginView); setAuthError(''); }}>
            {isLoginView ? "Naya account banayein?" : "Pehle se account hai? Login karein"}
          </p>
        </div>
      </div>
    );
  }

  // Kharcha Add karne wali screen (Inside Folder)
  if (selectedSection && activeTab === 'Monthly' && bottomNav === 'Trans') {
    const totalExp = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const remaining = selectedSection.totalBudget - totalExp;
    return (
      <div className="app-container" style={{ paddingBottom: '80px' }}>
        <button className="back-btn" onClick={() => setSelectedSection(null)}>← Back</button>
        <div className="glass-card balance-board">
          <div className="stat"><p>Total Budget</p><h3>₹{selectedSection.totalBudget}</h3></div>
          <div className="stat border-x"><p>Total Kharcha</p><h3 className="text-red">₹{totalExp}</h3></div>
          <div className="stat"><p>Bacha Hua</p><h3 className={remaining < 0 ? "text-red" : "text-green"}>₹{remaining}</h3></div>
        </div>
        <div className="glass-card mb-2">
          <h3>Add Kharcha ({selectedSection.sectionName})</h3>
          <p style={{ fontSize: '12px', color: '#ff4757', marginBottom: '10px' }}>Date: {selectedDate.toDateString()}</p>
          <form className="flex-form" onSubmit={addExpense}>
            <input type="text" placeholder="Kya kharida?" value={newExpense.name} onChange={e => setNewExpense({ ...newExpense, name: e.target.value })} required />
            <input type="number" placeholder="Amount (₹)" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} required />
            <button type="submit" className="danger-btn">+ Add Kharcha</button>
          </form>
        </div>
      </div>
    );
  }

  const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    // paddingBottom diya hai taaki content bottom bar ke peeche na chhupe
    <div className="app-container" style={{ paddingBottom: '90px', minHeight: '100vh', position: 'relative' }}>
      
      {/* HEADER (Sirf Trans aur Stats me dikhayenge) */}
      <header className="top-nav" style={{flexDirection: 'column', alignItems: 'flex-start'}}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <h2>Hi, {user.name}! 💰</h2>
        </div>
        <button 
          onClick={() => setShowMonthPicker(true)} 
          style={{ background: '#222', color: '#fff', padding: '8px 15px', borderRadius: '8px', border: '1px solid #444', marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}
        >
          <span>{currentMonth}</span> <span>▼</span>
        </button>
      </header>

      {/* MONTH MODAL */}
      {showMonthPicker && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '360px', padding: '20px', background: '#1a1a1a', border: '1px solid #333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={() => setSelectedYear(selectedYear - 1)}>{"<"}</button>
              <h3 style={{ margin: 0 }}>{selectedYear}</h3>
              <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }} onClick={() => setSelectedYear(selectedYear + 1)}>{">"}</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {monthsList.map(m => (
                <button 
                  key={m} 
                  onClick={() => { setCurrentMonth(`${m} ${selectedYear}`); setShowMonthPicker(false); setCalendarSelectedFolder(null); }}
                  style={{ padding: '10px 4px', background: currentMonth === `${m} ${selectedYear}` ? '#ff4757' : '#2a2a2a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                >
                  {m}
                </button>
              ))}
            </div>
            <button onClick={() => setShowMonthPicker(false)} style={{ width: '100%', marginTop: '15px', padding: '8px', background: 'transparent', color: '#888', border: 'none', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

      {/* ================= MAIN CONTENT AREA ================= */}

      {/* 1. TRANS TAB (Jisme purane saare tabs rahenge) */}
      {bottomNav === 'Trans' && (
        <>
          {/* Upar Wale Tabs (Daily, Calendar, Monthly, Total) */}
          <div className="tabs-container" style={{ display: 'flex', justifyContent: 'space-around', background: '#1a1a1a', padding: '10px', borderRadius: '8px', margin: '15px 0' }}>
            {['Daily', 'Calendar', 'Monthly', 'Total'].map(tab => (
              <button 
                key={tab} onClick={() => { setActiveTab(tab); setCalendarSelectedFolder(null); }}
                style={{
                  background: 'none', border: 'none', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
                  color: activeTab === tab ? '#ff4757' : '#888',
                  borderBottom: activeTab === tab ? '2px solid #ff4757' : 'none', paddingBottom: '5px'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Daily' && (
            <div className="glass-card" style={{ padding: 0, position: 'relative', minHeight: '400px', overflow: 'hidden', background: '#1a1a1a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', padding: '15px', borderBottom: '1px solid #333' }}>
                <div style={{ textAlign: 'center' }}><p style={{ color: '#aaa', fontSize: '12px', margin: '0 0 5px 0' }}>Income</p><p style={{ color: '#4facfe', margin: 0, fontWeight: 'bold' }}>0.00</p></div>
                <div style={{ textAlign: 'center' }}><p style={{ color: '#aaa', fontSize: '12px', margin: '0 0 5px 0' }}>Expenses</p><p style={{ color: '#ff4757', margin: 0, fontWeight: 'bold' }}>{allMonthExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0).toFixed(2)}</p></div>
                <div style={{ textAlign: 'center' }}><p style={{ color: '#aaa', fontSize: '12px', margin: '0 0 5px 0' }}>Total</p><p style={{ color: '#fff', margin: 0, fontWeight: 'bold' }}>{(0 - allMonthExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0)).toFixed(2)}</p></div>
              </div>
              {allMonthExpenses.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '250px', color: '#666' }}>
                  <div style={{ fontSize: '50px', opacity: 0.6 }}>🐱</div>
                  <p style={{ marginTop: '10px', fontSize: '14px' }}>No data available.</p>
                </div>
              ) : (
                <div style={{ padding: '15px', maxHeight: '250px', overflowY: 'auto' }}>
                  {allMonthExpenses.map((exp, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid #333', background: '#222', borderRadius: '8px', marginBottom: '8px' }}>
                      <span style={{ color: '#fff', fontSize: '14px' }}>{exp.itemName}</span><span style={{ color: '#ff4757', fontWeight: 'bold' }}>-₹{exp.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Monthly' && (
            <>
              <div className="glass-card mb-2">
                <h3>Naya Budget Folder Banao</h3>
                <form className="flex-form" onSubmit={addSection}>
                  <input type="text" placeholder="Folder Name" value={newSection.name} onChange={e => setNewSection({ ...newSection, name: e.target.value })} required />
                  <input type="number" placeholder="Budget (₹)" value={newSection.budget} onChange={e => setNewSection({ ...newSection, budget: e.target.value })} required />
                  <button type="submit" className="primary-btn">+ Create</button>
                </form>
              </div>
              <div className="grid-container">
                {sections.map(sec => (
                  <div key={sec.id} className="budget-card glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <button className="del-icon" onClick={(e) => { e.stopPropagation(); deleteSection(sec.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
                      <button className="edit-icon" onClick={(e) => { e.stopPropagation(); setEditingFolderId(sec.id); setEditFolderForm({ name: sec.sectionName, budget: sec.totalBudget }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✏️</button>
                    </div>
                    <div onClick={() => { setSelectedSection(sec); fetchExpenses(sec.id); }} style={{ cursor: 'pointer' }}>
                      <h4>{sec.sectionName}</h4><h2>₹{sec.totalBudget}</h2><p className="label">Total Budget</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'Calendar' && (
            <div className="glass-card" style={{ padding: '15px' }}>
              <div style={{ background: 'white', borderRadius: '10px', padding: '10px', color: 'black' }}><Calendar onChange={(date) => { setSelectedDate(date); setCalendarSelectedFolder(null); }} value={selectedDate} /></div>
              <h4 style={{ textAlign: 'center', margin: '15px 0 10px 0', color: '#ff4757' }}>📅 {selectedDate.toDateString()}</h4>
              {!calendarSelectedFolder ? (
                <div className="grid-container">
                  {sections.map(sec => (
                    <div key={sec.id} className="budget-card glass-card" onClick={() => setCalendarSelectedFolder(sec)}>
                      <h4>{sec.sectionName}</h4><p style={{fontSize: '11px', color: '#4facfe', marginTop: '6px'}}>Tap to view details</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: '#111', padding: '20px', borderRadius: '10px', marginTop: '15px', border: '1px solid #333' }}>
                  <button onClick={() => setCalendarSelectedFolder(null)} style={{ background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', marginBottom: '15px' }}>← Back</button>
                  <h3 style={{ color: '#fff', textAlign: 'center' }}>📂 {calendarSelectedFolder.sectionName}</h3>
                  {(() => {
                    const stats = getStatsUpToDate(calendarSelectedFolder.id);
                    return (
                      <div style={{ marginTop: '15px' }}>
                        <p style={{color: '#aaa', margin: '5px 0'}}>Budget: <strong style={{color: '#4facfe'}}>₹{stats.budget}</strong></p>
                        <p style={{color: '#aaa', margin: '5px 0'}}>Kharch: <strong style={{color: '#ff4757'}}>₹{stats.kharch}</strong></p>
                        <p style={{color: '#fff', margin: '10px 0'}}>Bacha: <strong style={{color: stats.bacha < 0 ? '#ff4757' : '#2ed573'}}>₹{stats.bacha}</strong></p>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'Total' && (
            <div className="glass-card" style={{ textAlign: 'center', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>📊</div>
              <h3 style={{ color: '#fff' }}>Yearly Summary</h3>
              <p style={{ color: '#888', fontSize: '14px' }}>Data analytics soon!</p>
            </div>
          )}

          {/* Floating + Button (Sirf Trans screen par dikhega) */}
          <button onClick={() => setActiveTab('Monthly')} style={{
            position: 'fixed', bottom: '90px', right: '20px', width: '60px', height: '60px', borderRadius: '50%',
            backgroundColor: '#ff4757', color: 'white', border: 'none', fontSize: '28px', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(255, 71, 87, 0.4)', zIndex: 100
          }}>+</button>
        </>
      )}

      {/* 2. STATS TAB */}
      {bottomNav === 'Stats' && (
        <div className="glass-card" style={{ textAlign: 'center', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '60px' }}>📈</div>
          <h2 style={{ color: '#fff', margin: '15px 0' }}>Statistics</h2>
          <p style={{ color: '#888' }}>Yahan tumhare kharche ka Pie Chart aayega!</p>
        </div>
      )}

      {/* 3. ACCOUNTS TAB */}
      {bottomNav === 'Accounts' && (
        <div className="glass-card" style={{ textAlign: 'center', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '60px' }}>💳</div>
          <h2 style={{ color: '#fff', margin: '15px 0' }}>My Accounts</h2>
          <p style={{ color: '#888' }}>Bank ya Cash balance manage karne ki jagah.</p>
        </div>
      )}

      {/* 4. MORE TAB */}
      {bottomNav === 'More' && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <h2 style={{ color: '#fff', marginBottom: '20px' }}>Settings & More</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <button className="secondary-btn">⬇️ Export to Excel</button>
            <button className="secondary-btn">🌐 Change Language</button>
            <button onClick={logout} className="danger-btn" style={{marginTop: '20px'}}>🚪 Logout</button>
          </div>
        </div>
      )}

      {/* ================= FIXED BOTTOM NAVIGATION ================= */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, width: '100%', height: '70px',
        backgroundColor: '#151515', borderTop: '1px solid #2a2a2a',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        zIndex: 999, paddingBottom: 'env(safe-area-inset-bottom)'
      }}>
        {[
          { id: 'Trans', icon: '🧾', label: 'Trans.' },
          { id: 'Stats', icon: '📊', label: 'Stats' },
          { id: 'Accounts', icon: '💳', label: 'Accounts' },
          { id: 'More', icon: '⋯', label: 'More' }
        ].map(item => (
          <div 
            key={item.id} 
            onClick={() => setBottomNav(item.id)}
            style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', width: '25%',
              color: bottomNav === item.id ? '#ff4757' : '#888'
            }}
          >
            <span style={{ fontSize: '20px', marginBottom: '4px', filter: bottomNav === item.id ? 'none' : 'grayscale(100%)' }}>
              {item.icon}
            </span>
            <span style={{ fontSize: '11px', fontWeight: bottomNav === item.id ? 'bold' : 'normal' }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {/* EDIT POPUP */}
      {editingFolderId && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '350px', padding: '20px', background: '#1a1a1a', border: '1px solid #444' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px' }}>Edit Folder</h3>
            <form className="flex-form" onSubmit={saveFolderEdit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="text" value={editFolderForm.name} onChange={e => setEditFolderForm({ ...editFolderForm, name: e.target.value })} required />
              <input type="number" value={editFolderForm.budget} onChange={e => setEditFolderForm({ ...editFolderForm, budget: e.target.value })} required />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="primary-btn" style={{ flex: 1 }}>Save</button>
                <button type="button" className="secondary-btn" onClick={() => setEditingFolderId(null)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;