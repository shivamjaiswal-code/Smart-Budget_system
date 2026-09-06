import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar'; // Calendar package import kiya
import './App.css';

function App() {
  // Global States (LocalStorage Auto-Login ke sath)
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('smartbudget_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [isLoginView, setIsLoginView] = useState(true);
  const [currentMonth, setCurrentMonth] = useState('August 2026');
  const [activeTab, setActiveTab] = useState('Monthly');
  
  // Naya state: Calendar ki date ke liye (default aaj ki date)
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Auth States
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  // App States
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [expenses, setExpenses] = useState([]);
  
  // Form States
  const [newSection, setNewSection] = useState({ name: '', budget: '' });
  const [newExpense, setNewExpense] = useState({ name: '', amount: '' });

  // Edit & Delete Popup States
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', amount: '' });

  // --- AUTHENTICATION HANDLERS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const url = isLoginView ? 'http://localhost:5001/api/login' : 'http://localhost:5001/api/signup';
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await response.json();
      
      if (response.ok) {
        if (isLoginView) {
          setUser(data.user);
          localStorage.setItem('smartbudget_user', JSON.stringify(data.user)); // Auto-login data save
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
    setUser(null); 
    setSelectedSection(null); 
    localStorage.removeItem('smartbudget_user'); // Auto-login data delete
  };

  // --- DATA HANDLERS ---
  const fetchSections = async () => {
    if (!user) return;
    const res = await fetch(`http://localhost:5001/api/sections/${user.id}/${currentMonth}`);
    const data = await res.json();
    setSections(data);
  };

  const fetchExpenses = async (sectionId) => {
    const res = await fetch(`http://localhost:5001/api/expenses/${sectionId}`);
    const data = await res.json();
    setExpenses(data);
  };

  useEffect(() => {
    if (user) fetchSections();
  }, [user, currentMonth]);

  // --- ACTIONS ---
  const addSection = async (e) => {
    e.preventDefault();
    await fetch('http://localhost:5001/api/sections', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, month_year: currentMonth, sectionName: newSection.name, totalBudget: newSection.budget })
    });
    setNewSection({ name: '', budget: '' });
    fetchSections();
  };

  const deleteSection = async (id, e) => {
    e.stopPropagation();
    if(window.confirm("Folder delete karein?")) {
      await fetch(`http://localhost:5001/api/sections/${id}`, { method: 'DELETE' });
      fetchSections();
    }
  };

  const addExpense = async (e) => {
    e.preventDefault();
    
    // Calendar me select ki hui date ko format karke backend bhej rahe hain
    const formattedDate = selectedDate.toISOString().split('T')[0]; 

    await fetch('http://localhost:5001/api/expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        section_id: selectedSection.id, 
        itemName: newExpense.name, 
        amount: newExpense.amount,
        expense_date: formattedDate // Naya field backend ko bhej diya
      })
    });
    setNewExpense({ name: '', amount: '' });
    fetchExpenses(selectedSection.id);
  };

  const deleteExpense = async (id) => {
    await fetch(`http://localhost:5001/api/expenses/${id}`, { method: 'DELETE' });
    fetchExpenses(selectedSection.id);
  };

  const saveEdit = async (id) => {
    await fetch(`http://localhost:5001/api/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemName: editForm.name, amount: editForm.amount })
    });
    setEditingExpense(null);
    fetchExpenses(selectedSection.id);
  };

  // --- VIEW 1: AUTHENTICATION SCREEN ---
  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>{isLoginView ? 'Welcome Back 👋' : 'Create Account 🚀'}</h2>
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

  // --- VIEW 2: DASHBOARD (FOLDERS & TABS VIEW) ---
  if (!selectedSection) {
    return (
      <div className="app-container">
        <header className="top-nav">
          <div className="user-info">
            <h2>Hi, {user.name}! 💰</h2>
            <select value={currentMonth} onChange={(e) => setCurrentMonth(e.target.value)} className="month-selector">
              <option value="July 2026">July 2026</option>
              <option value="August 2026">August 2026</option>
              <option value="September 2026">September 2026</option>
            </select>
          </div>
          <button onClick={logout} className="logout-btn">Logout</button>
        </header>

        <div className="tabs-container" style={{ display: 'flex', justifyContent: 'space-around', background: '#222', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
          {['Daily', 'Calendar', 'Monthly', 'Total'].map(tab => (
            <button 
              key={tab} onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
                color: activeTab === tab ? '#ff4757' : '#888',
                borderBottom: activeTab === tab ? '2px solid #ff4757' : 'none',
                paddingBottom: '5px'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* --- MONTHLY TAB --- */}
        {activeTab === 'Monthly' && (
          <>
            <div className="glass-card mb-2">
              <h3>Naya Budget Folder Banao</h3>
              <form className="flex-form" onSubmit={addSection}>
                <input type="text" placeholder="Folder Name (eg. Rent)" value={newSection.name} onChange={e => setNewSection({ ...newSection, name: e.target.value })} required />
                <input type="number" placeholder="Total Budget (₹)" value={newSection.budget} onChange={e => setNewSection({ ...newSection, budget: e.target.value })} required />
                <button type="submit" className="primary-btn">+ Create</button>
              </form>
            </div>
            <h3 className="section-title">My Folders ({currentMonth})</h3>
            <div className="grid-container">
              {sections.length === 0 ? <p className="empty">Koi folder nahi hai. Naya banayein!</p> : null}
              {sections.map(sec => (
                <div key={sec.id} className="budget-card glass-card" onClick={() => { setSelectedSection(sec); fetchExpenses(sec.id); }}>
                  <button className="del-icon" onClick={(e) => deleteSection(sec.id, e)}>🗑️</button>
                  <h4>{sec.sectionName}</h4>
                  <h2>₹{sec.totalBudget}</h2>
                  <p className="label">Total Budget</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* --- CALENDAR TAB --- */}
        {activeTab === 'Calendar' && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
            <h3 style={{ marginBottom: '15px' }}>📅 Select Date for Expenses</h3>
            <div style={{ background: 'white', borderRadius: '10px', padding: '10px', color: 'black' }}>
               <Calendar onChange={setSelectedDate} value={selectedDate} />
            </div>
            <p style={{ marginTop: '20px', color: '#ff4757', fontWeight: 'bold', fontSize: '18px' }}>
              Selected Date: {selectedDate.toDateString()}
            </p>
            <p style={{ color: '#aaa', fontSize: '14px', textAlign: 'center', marginTop: '10px' }}>
              (Note: Ab kisi folder par click karke kharcha add karo, wo is chuni hui date par save hoga!)
            </p>
          </div>
        )}

        {(activeTab === 'Daily' || activeTab === 'Total') && (
          <div className="glass-card text-center" style={{ padding: '30px 10px' }}>
            <h3>🚧 {activeTab} View</h3>
            <p style={{ color: '#aaa' }}>Jaldi hi yahan naye features aayenge.</p>
          </div>
        )}
      </div>
    );
  }

  // --- VIEW 3: EXPENSE DETAILS SCREEN ---
  const totalExp = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const remaining = selectedSection.totalBudget - totalExp;

  return (
    <div className="app-container">
      <button className="back-btn" onClick={() => setSelectedSection(null)}>← Back to Dashboard</button>
      
      <div className="glass-card balance-board">
        <div className="stat">
          <p>Total Budget</p>
          <h3>₹{selectedSection.totalBudget}</h3>
        </div>
        <div className="stat border-x">
          <p>Total Kharcha</p>
          <h3 className="text-red">₹{totalExp}</h3>
        </div>
        <div className="stat">
          <p>Bacha Hua</p>
          <h3 className={remaining < 0 ? "text-red" : "text-green"}>₹{remaining}</h3>
        </div>
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

      <div className="glass-card">
        <h3>Transactions</h3>
        {expenses.length === 0 ? <p className="empty">Koi kharcha add nahi kiya.</p> : null}
        {expenses.map(exp => (
          <div key={exp.id} className="expense-row">
            {editingExpense === exp.id ? (
              <div className="flex-form" style={{width: '100%', gap: '10px'}}>
                <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                <input type="number" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} />
                <button className="primary-btn" onClick={() => saveEdit(exp.id)}>Save</button>
                <button className="secondary-btn" onClick={() => setEditingExpense(null)}>Cancel</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="exp-name">{exp.itemName}</span>
                  <span style={{ fontSize: '12px', color: '#888' }}>{exp.expense_date ? new Date(exp.expense_date).toDateString() : 'No Date'}</span>
                </div>
                <div className="exp-right">
                  <span className="text-red font-bold">- ₹{exp.amount}</span>
                  <button className="edit-text-btn" onClick={() => { setEditingExpense(exp.id); setEditForm({ name: exp.itemName, amount: exp.amount }); }}>Edit</button>
                  <button className="del-text-btn" onClick={() => setDeleteConfirmId(exp.id)}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {deleteConfirmId && (
        <div className="modal-backdrop" style={{position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000}}>
          <div className="glass-card" style={{background: '#1a1a1a', padding: '25px', borderRadius: '12px', textAlign: 'center', border: '1px solid #444'}}>
            <h3 style={{color: '#fff', marginBottom: '15px'}}>Kya aap sach me is kharche ko delete karna chahte hain?</h3>
            <div style={{display: 'flex', gap: '12px', justifyContent: 'center'}}>
              <button className="danger-btn" onClick={() => { deleteExpense(deleteConfirmId); setDeleteConfirmId(null); }}>Yes, Delete</button>
              <button className="secondary-btn" onClick={() => setDeleteConfirmId(null)} style={{background: '#555', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;