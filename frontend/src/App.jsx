import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import './App.css';

// Exact Live Backend URL (no trailing slash)
const API_URL = 'https://smart-budget-system-d5li.onrender.com';

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
  const [currentMonth, setCurrentMonth] = useState('September 2026');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2026);
  
  const [activeTab, setActiveTab] = useState('Monthly');
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

  // --- AUTHENTICATION ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = isLoginView ? '/api/login' : '/api/signup';
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
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
      setAuthError("Server se connect nahi hua. Kripya thodi der baad koshish karein.");
    }
  };

  const logout = () => { 
    setUser(null); 
    setSelectedSection(null); 
    setCalendarSelectedFolder(null);
    localStorage.removeItem('smartbudget_user');
  };

  // --- DATA FETCHING (Encoded params ke sath safe fetch) ---
  const fetchSections = async () => {
    if (!user || !user.id) return;
    try {
      const safeMonth = encodeURIComponent(currentMonth);
      const res = await fetch(`${API_URL}/api/sections/${user.id}/${safeMonth}`);
      if (res.ok) {
        const data = await res.json();
        setSections(Array.isArray(data) ? data : []);
      }
    } catch (err) { 
      console.error("Error fetching sections:", err); 
    }
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
    } catch (err) { 
      console.error("Error fetching all month expenses:", err); 
    }
  };

  const fetchExpenses = async (sectionId) => {
    try {
      const res = await fetch(`${API_URL}/api/expenses/${sectionId}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(Array.isArray(data) ? data : []);
      }
    } catch (err) { 
      console.error("Error fetching section expenses:", err); 
    }
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
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id, 
          month_year: currentMonth, 
          sectionName: newSection.name, 
          totalBudget: newSection.budget 
        })
      });
      if (res.ok) {
        setNewSection({ name: '', budget: '' });
        fetchSections();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addExpense = async (e) => {
    e.preventDefault();
    const formattedDate = selectedDate.toISOString().split('T')[0]; 
    try {
      const res = await fetch(`${API_URL}/api/expenses`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          section_id: selectedSection.id, 
          itemName: newExpense.name, 
          amount: newExpense.amount, 
          expense_date: formattedDate 
        })
      });
      if (res.ok) {
        setNewExpense({ name: '', amount: '' });
        fetchExpenses(selectedSection.id);
        fetchAllMonthExpenses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- SMART CALENDAR STATS ---
  const getStatsUpToDate = (folderId) => {
    const folder = sections.find(s => s.id === folderId);
    const budget = folder ? Number(folder.totalBudget) : 0;

    const kharch = allMonthExpenses.filter(exp => {
      if (exp.section_id !== folderId || !exp.expense_date) return false;
      const expDate = new Date(exp.expense_date);
      const selDate = new Date(selectedDate);
      expDate.setHours(0,0,0,0); 
      selDate.setHours(0,0,0,0);
      return expDate <= selDate;
    }).reduce((sum, exp) => sum + Number(exp.amount), 0);

    return { budget, kharch, bacha: budget - kharch };
  };

  // --- VIEW 1: AUTH SCREEN ---
  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>{isLoginView ? 'Welcome Back 👋' : 'Create Account 🚀'}</h2>
          {authError && <p className="error-msg">{authError}</p>}
          <form onSubmit={handleAuth}>
            {!isLoginView && (
              <input 
                type="text" 
                placeholder="Apna Naam" 
                required 
                value={authForm.name} 
                onChange={e => setAuthForm({...authForm, name: e.target.value})} 
              />
            )}
            <input 
              type="email" 
              placeholder="Email Address" 
              required 
              value={authForm.email} 
              onChange={e => setAuthForm({...authForm, email: e.target.value})} 
            />
            <input 
              type="password" 
              placeholder="Password" 
              required 
              value={authForm.password} 
              onChange={e => setAuthForm({...authForm, password: e.target.value})} 
            />
            <button type="submit" className="primary-btn w-full">
              {isLoginView ? 'Login' : 'Sign Up'}
            </button>
          </form>
          <p className="toggle-auth" onClick={() => { setIsLoginView(!isLoginView); setAuthError(''); }}>
            {isLoginView ? "Naya account banayein?" : "Pehle se account hai? Login karein"}
          </p>
        </div>
      </div>
    );
  }

  // --- VIEW 2: EXPENSE DETAIL VIEW ---
  if (selectedSection && activeTab === 'Monthly') {
    const totalExp = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const remaining = selectedSection.totalBudget - totalExp;
    return (
      <div className="app-container">
        <button className="back-btn" onClick={() => setSelectedSection(null)}>← Back to Folders</button>
        <div className="glass-card balance-board">
          <div className="stat"><p>Total Budget</p><h3>₹{selectedSection.totalBudget}</h3></div>
          <div className="stat border-x"><p>Total Kharcha</p><h3 className="text-red">₹{totalExp}</h3></div>
          <div className="stat"><p>Bacha Hua</p><h3 className={remaining < 0 ? "text-red" : "text-green"}>₹{remaining}</h3></div>
        </div>
        <div className="glass-card mb-2">
          <h3>Kharcha Add Karein ({selectedSection.sectionName})</h3>
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

  const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="app-container">
      {/* HEADER */}
      <header className="top-nav" style={{flexDirection: 'column', alignItems: 'flex-start'}}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <h2>Hi, {user.name}! 💰</h2>
          <button onClick={logout} className="logout-btn">Logout</button>
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
                  onClick={() => { setCurrentMonth(`${m} ${selectedYear}`); setShowMonthPicker(false); }}
                  style={{ padding: '10px 4px', background: currentMonth === `${m} ${selectedYear}` ? '#ff4757' : '#2a2a2a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
            <button onClick={() => setShowMonthPicker(false)} style={{ width: '100%', marginTop: '15px', padding: '8px', background: 'transparent', color: '#888', border: 'none', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

      {/* TABS */}
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

      {/* TAB 1: MONTHLY */}
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
            {sections.length === 0 ? <p className="empty">Koi folder nahi mila is mahine ke liye.</p> : null}
            {sections.map(sec => (
              <div key={sec.id} className="budget-card glass-card" onClick={() => { setSelectedSection(sec); fetchExpenses(sec.id); }}>
                <h4>{sec.sectionName}</h4>
                <h2>₹{sec.totalBudget}</h2>
                <p className="label">Total Budget</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* TAB 2: CALENDAR */}
      {activeTab === 'Calendar' && (
        <div className="glass-card" style={{ padding: '15px' }}>
          <div style={{ background: 'white', borderRadius: '10px', padding: '10px', color: 'black' }}>
             <Calendar onChange={(date) => { setSelectedDate(date); setCalendarSelectedFolder(null); }} value={selectedDate} />
          </div>
          
          <h4 style={{ textAlign: 'center', margin: '15px 0 10px 0', color: '#ff4757' }}>
            📅 Date: {selectedDate.toDateString()}
          </h4>

          {!calendarSelectedFolder ? (
            <div>
              <p style={{ color: '#888', textAlign: 'center', fontSize: '13px', marginBottom: '12px' }}>Stats dekhne ke liye kisi folder par click karein 👇</p>
              <div className="grid-container">
                {sections.map(sec => (
                  <div key={sec.id} className="budget-card glass-card" onClick={() => setCalendarSelectedFolder(sec)}>
                    <h4>{sec.sectionName}</h4>
                    <p style={{fontSize: '11px', color: '#4facfe', marginTop: '6px'}}>Tap to view details</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: '#111', padding: '20px', borderRadius: '10px', marginTop: '15px', border: '1px solid #333' }}>
               <button onClick={() => setCalendarSelectedFolder(null)} style={{ background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', marginBottom: '15px' }}>← Back to Folders</button>
               <h3 style={{ color: '#fff', marginBottom: '20px', textAlign: 'center', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                 📂 {calendarSelectedFolder.sectionName}
               </h3>
               {(() => {
                 const stats = getStatsUpToDate(calendarSelectedFolder.id);
                 return (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span style={{ color: '#aaa', fontSize: '14px' }}>Total Budget:</span>
                       <h3 style={{ color: '#4facfe', margin: 0 }}>₹{stats.budget}</h3>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span style={{ color: '#aaa', fontSize: '14px' }}>Us Date Tak Kharch:</span>
                       <h3 style={{ color: '#ff4757', margin: 0 }}>₹{stats.kharch}</h3>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #333', paddingTop: '12px' }}>
                       <span style={{ color: '#fff', fontSize: '15px', fontWeight: 'bold' }}>Bacha Hua Paisa:</span>
                       <h3 style={{ color: stats.bacha < 0 ? '#ff4757' : '#2ed573', margin: 0 }}>₹{stats.bacha}</h3>
                     </div>
                   </div>
                 );
               })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;