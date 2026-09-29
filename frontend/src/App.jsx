import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import './App.css';

// Apna asali Render wala URL
const API_URL = 'https://smart-budget-system-d5li.onrender.com'; 

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('smartbudget_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [isLoginView, setIsLoginView] = useState(true);
  const [currentMonth, setCurrentMonth] = useState('Sep 2026');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2026);
  
  const [activeTab, setActiveTab] = useState('Monthly');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [expenses, setExpenses] = useState([]);
  
  // Naya State: Calendar ke saare kharche aur Calendar me click kiya hua folder
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
        headers: { 'Content-Type': 'application/json' },
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
        setAuthError(data.error);
      }
    } catch (err) { setAuthError("Server se connect nahi hua."); }
  };

  const logout = () => { 
    setUser(null); setSelectedSection(null); setCalendarSelectedFolder(null);
    localStorage.removeItem('smartbudget_user');
  };

  // --- DATA FETCHING ---
  const fetchSections = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/api/sections/${user.id}/${currentMonth}`);
      const data = await res.json();
      setSections(data);
    } catch (err) { console.error(err); }
  };

  const fetchAllMonthExpenses = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/api/all-expenses/${user.id}/${currentMonth}`);
      const data = await res.json();
      setAllMonthExpenses(data);
    } catch (err) { console.error(err); }
  };

  const fetchExpenses = async (sectionId) => {
    try {
      const res = await fetch(`${API_URL}/api/expenses/${sectionId}`);
      const data = await res.json();
      setExpenses(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (user) {
      fetchSections();
      fetchAllMonthExpenses();
    }
  }, [user, currentMonth]);

  // --- ACTIONS ---
  const addSection = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/api/sections`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, month_year: currentMonth, sectionName: newSection.name, totalBudget: newSection.budget })
    });
    setNewSection({ name: '', budget: '' });
    fetchSections();
  };

  const addExpense = async (e) => {
    e.preventDefault();
    const formattedDate = selectedDate.toISOString().split('T')[0]; 
    await fetch(`${API_URL}/api/expenses`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_id: selectedSection.id, itemName: newExpense.name, amount: newExpense.amount, expense_date: formattedDate })
    });
    setNewExpense({ name: '', amount: '' });
    fetchExpenses(selectedSection.id);
    fetchAllMonthExpenses(); // Refresh global expenses
  };

  // --- CALENDAR LOGIC (The Magic) ---
  const getStatsUpToDate = (folderId) => {
    // 1. Us folder ka total budget
    const folder = sections.find(s => s.id === folderId);
    const budget = folder ? Number(folder.totalBudget) : 0;

    // 2. Us date tak ka kharch calculate karna
    const kharch = allMonthExpenses.filter(exp => {
      if (exp.section_id !== folderId || !exp.expense_date) return false;
      const expDate = new Date(exp.expense_date);
      const selDate = new Date(selectedDate);
      expDate.setHours(0,0,0,0); selDate.setHours(0,0,0,0);
      return expDate <= selDate; // Sirf selected date ya usse pehle wale kharche
    }).reduce((sum, exp) => sum + Number(exp.amount), 0);

    return { budget, kharch, bacha: budget - kharch };
  };

  // --- VIEWS ---
  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Welcome Back 👋</h2>
          {authError && <p className="error-msg">{authError}</p>}
          <form onSubmit={handleAuth}>
            {!isLoginView && <input type="text" placeholder="Apna Naam" required onChange={e => setAuthForm({...authForm, name: e.target.value})} />}
            <input type="email" placeholder="Email Address" required onChange={e => setAuthForm({...authForm, email: e.target.value})} />
            <input type="password" placeholder="Password" required onChange={e => setAuthForm({...authForm, password: e.target.value})} />
            <button type="submit" className="primary-btn w-full">{isLoginView ? 'Login' : 'Sign Up'}</button>
          </form>
          <p className="toggle-auth" onClick={() => setIsLoginView(!isLoginView)}>
            {isLoginView ? "Naya account banayein?" : "Pehle se account hai? Login karein"}
          </p>
        </div>
      </div>
    );
  }

  // Expense List View (Monthly Tab se open hone wala)
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
          <h3>Kharcha Add Karein</h3>
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
    <div className="app-container">
      <header className="top-nav" style={{flexDirection: 'column', alignItems: 'flex-start'}}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <h2>Hi, {user.name}! 💰</h2>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
        <button onClick={() => setShowMonthPicker(true)} style={{ background: '#222', color: '#fff', padding: '8px 15px', borderRadius: '8px', border: '1px solid #444', marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span>{currentMonth}</span> <span>▼</span>
        </button>
      </header>

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

      {/* MONTHLY TAB */}
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
              <div key={sec.id} className="budget-card glass-card" onClick={() => { setSelectedSection(sec); fetchExpenses(sec.id); }}>
                <h4>{sec.sectionName}</h4>
                <h2>₹{sec.totalBudget}</h2>
              </div>
            ))}
          </div>
        </>
      )}

      {/* CALENDAR TAB (The Magic Feature) */}
      {activeTab === 'Calendar' && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '10px', padding: '10px', color: 'black' }}>
             <Calendar onChange={(date) => { setSelectedDate(date); setCalendarSelectedFolder(null); }} value={selectedDate} />
          </div>
          
          <h4 style={{ textAlign: 'center', margin: '20px 0 10px 0', color: '#ff4757' }}>
            📅 Date: {selectedDate.toDateString()}
          </h4>

          {/* Condition 1: Agar Calendar me koi folder select NAHI kiya hai, toh saare Folders ki list dikhao */}
          {!calendarSelectedFolder ? (
            <div>
              <p style={{ color: '#888', textAlign: 'center', fontSize: '14px', marginBottom: '15px' }}>Data dekhne ke liye kisi folder par click karein 👇</p>
              <div className="grid-container">
                {sections.map(sec => (
                  <div key={sec.id} className="budget-card glass-card" onClick={() => setCalendarSelectedFolder(sec)}>
                    <h4>{sec.sectionName}</h4>
                    <p style={{fontSize: '12px', color: '#aaa', margin: 0}}>Tap to view stats</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            
          /* Condition 2: Agar Calendar me koi folder select kiya hai, toh sirf 3 stats dikhao (No List) */
            <div style={{ background: '#111', padding: '20px', borderRadius: '10px', marginTop: '15px', border: '1px solid #333' }}>
               <button onClick={() => setCalendarSelectedFolder(null)} style={{ background: 'transparent', color: '#888', border: 'none', cursor: 'pointer', marginBottom: '15px' }}>← Back to Folders</button>
               
               <h3 style={{ color: '#fff', marginBottom: '20px', textAlign: 'center', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                 📂 {calendarSelectedFolder.sectionName} Stats
               </h3>
               
               {(() => {
                 const stats = getStatsUpToDate(calendarSelectedFolder.id);
                 return (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span style={{ color: '#aaa', fontSize: '15px' }}>Total Budget:</span>
                       <h3 style={{ color: '#4facfe', margin: 0 }}>₹{stats.budget}</h3>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span style={{ color: '#aaa', fontSize: '15px' }}>Us Date Tak Kharch:</span>
                       <h3 style={{ color: '#ff4757', margin: 0 }}>₹{stats.kharch}</h3>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #333', paddingTop: '15px' }}>
                       <span style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold' }}>Bacha Hua Paisa:</span>
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