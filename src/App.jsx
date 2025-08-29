import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { auth, db } from './firebase'; // Import from your firebase.js file
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, onSnapshot, query, where, doc, setDoc } from 'firebase/firestore';
import { DashboardView, AddTransactionView, AnalyticsView, GoalsView, ReportsView, SettingsView } from './components/Views'; // Import views from components/Views.jsx
import './styles.css'; // Import your CSS file

// --- Main App Component ---
export default function App() {
    // --- State Management ---
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [view, setView] = useState('dashboard');
    const [newItem, setNewItem] = useState({ name: '', amount: '', date: new Date().toISOString().split('T')[0] });
    const [aiIsProcessing, setAiIsProcessing] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const [userProfile, setUserProfile] = useState(null);
    const [streaks, setStreaks] = useState({ noJunkFood: 0, noImpulseSpending: 0 });
    const [authDetails, setAuthDetails] = useState({ email: '', password: '' });
    const [isLoginView, setIsLoginView] = useState(true);
    const [aiAlert, setAiAlert] = useState('');
    const [theme, setTheme] = useState('light'); // 'light' or 'dark'

    const defaultProfile = { junkFoodLimit: 2000, impulseSpendingLimit: 10000, savingsGoal: 5000 };

    // --- Theme Toggling Effect ---
    useEffect(() => {
        document.body.className = theme + '-theme';
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    // --- Gemini API Call Helper ---
    const callGeminiAPI = useCallback(async (prompt) => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);
            const result = await response.json();
            return result.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error("Gemini API Error:", error);
            showNotification("Error communicating with AI.", "error");
            return null;
        }
    }, []);

    // --- Authentication Effect ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, "users", currentUser.uid);
                const unsubProfile = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserProfile(data.profile || defaultProfile);
                        setStreaks(data.streaks || { noJunkFood: 0, noImpulseSpending: 0 });
                    } else {
                        setUserProfile(defaultProfile);
                        setDoc(userDocRef, {
                            email: currentUser.email,
                            displayName: currentUser.email.split('@')[0],
                            profile: defaultProfile,
                            streaks: { noJunkFood: 0, noImpulseSpending: 0 },
                            createdAt: new Date()
                        });
                    }
                });
                setLoading(false);
                return () => unsubProfile();
            } else {
                setUser(null);
                setUserProfile(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // --- Firestore Real-time Data Fetching Effect ---
    useEffect(() => {
        if (user) {
            const q = query(collection(db, "transactions"), where("userId", "==", user.uid));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const transactionsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                transactionsData.sort((a, b) => new Date(b.date) - new Date(a.date));
                setTransactions(transactionsData);
                updateStreaks(transactionsData);
            });
            return () => unsubscribe();
        }
    }, [user]);

    // --- AI Health Alert Effect ---
    useEffect(() => {
        if (transactions.length > 0) {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const junkFoodLastWeek = transactions.filter(t => t.foodTag === 'Junk' && new Date(t.date) > oneWeekAgo);
            if (junkFoodLastWeek.length > 2) {
                const generateAlert = async () => {
                    const prompt = `A user has eaten junk food ${junkFoodLastWeek.length} times in the last 7 days. Write a gentle, non-judgmental alert (2-3 sentences) encouraging them to consider healthier options for their next meal. Mention that moderation is key to a healthy lifestyle.`;
                    const alertText = await callGeminiAPI(prompt);
                    if (alertText) setAiAlert(alertText);
                };
                generateAlert();
            } else {
                setAiAlert('');
            }
        }
    }, [transactions, callGeminiAPI]);
    
    // --- Utility Functions ---
    const showNotification = (message, type = 'success', duration = 3000) => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), duration);
    };

    // --- Email/Password Authentication ---
    const handleAuthChange = (e) => setAuthDetails({ ...authDetails, [e.target.name]: e.target.value });
    const handleLogin = (e) => {
        e.preventDefault();
        signInWithEmailAndPassword(auth, authDetails.email, authDetails.password)
            .then(() => showNotification(`Welcome back!`, 'success'))
            .catch((error) => showNotification(error.message, 'error'));
    };
    const handleSignUp = (e) => {
        e.preventDefault();
        createUserWithEmailAndPassword(auth, authDetails.email, authDetails.password)
            .then(() => showNotification('Account created successfully! Welcome!', 'success'))
            .catch((error) => showNotification(error.message, 'error'));
    };

    // --- AI Processing for a single transaction ---
    const processWithGemini = async (name, amount) => {
        setAiIsProcessing(true);
        const prompt = `Analyze the expense: "${name}" for amount ${amount}. Return a clean JSON object with fields: "category" (one of ["Food", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Other"]), "isImpulse" (boolean), "foodTag" (if Food, one of ["Junk", "Healthy", "Neutral"], else null), "estimatedCalories" (number), "suggestion" (short tip).`;
        try {
            const resultText = await callGeminiAPI(prompt);
            if(resultText) {
                const jsonText = resultText.replace(/```json|```/g, '').trim();
                return JSON.parse(jsonText);
            }
            throw new Error("Empty response from AI");
        } catch (error) {
            return { category: "Other", isImpulse: false, foodTag: null, estimatedCalories: 0, suggestion: "Could not analyze." };
        } finally {
            setAiIsProcessing(false);
        }
    };

    // --- Add Transaction ---
    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItem.name || !newItem.amount || !user) return;
        const aiData = await processWithGemini(newItem.name, newItem.amount);
        await addDoc(collection(db, "transactions"), {
            ...newItem, amount: parseFloat(newItem.amount), userId: user.uid, ...aiData, createdAt: new Date()
        });
        showNotification(`Added "${newItem.name}"! AI Insight: ${aiData.suggestion}`);
        setNewItem({ name: '', amount: '', date: new Date().toISOString().split('T')[0] });
        setView('dashboard');
    };

    // --- Streak Calculation ---
    const updateStreaks = useCallback((currentTransactions) => {
        if (currentTransactions.length === 0) return;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        let junkStreak = 0, impulseStreak = 0, lastJunkDate = null, lastImpulseDate = null;
        const sorted = [...currentTransactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        for (const t of sorted) {
            const tDate = new Date(t.date); tDate.setHours(0, 0, 0, 0);
            if (t.foodTag === 'Junk') lastJunkDate = tDate;
            if (t.isImpulse) lastImpulseDate = tDate;
        }
        if (lastJunkDate) junkStreak = Math.floor((today - lastJunkDate) / (1000 * 60 * 60 * 24));
        else junkStreak = Math.floor((today - new Date(sorted[0].date)) / (1000 * 60 * 60 * 24));
        if (lastImpulseDate) impulseStreak = Math.floor((today - lastImpulseDate) / (1000 * 60 * 60 * 24));
        else impulseStreak = Math.floor((today - new Date(sorted[0].date)) / (1000 * 60 * 60 * 24));
        const newStreaks = { noJunkFood: Math.max(0, junkStreak), noImpulseSpending: Math.max(0, impulseStreak) };
        setStreaks(newStreaks);
        if (user) setDoc(doc(db, "users", user.uid), { streaks: newStreaks }, { merge: true });
    }, [user]);
    
    // --- Data Analysis ---
    const analysis = useMemo(() => {
        const now = new Date();
        const thisMonthTransactions = transactions.filter(t => new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear());
        const totalSpent = thisMonthTransactions.reduce((acc, t) => acc + t.amount, 0);
        const junkFoodSpending = thisMonthTransactions.filter(t => t.foodTag === 'Junk').reduce((acc, t) => acc + t.amount, 0);
        const impulseSpending = thisMonthTransactions.filter(t => t.isImpulse).reduce((acc, t) => acc + t.amount, 0);
        const totalCalories = thisMonthTransactions.reduce((acc, t) => acc + (t.estimatedCalories || 0), 0);
        const categorySpending = thisMonthTransactions.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
        const pieData = Object.keys(categorySpending).map(key => ({ name: key, value: categorySpending[key] }));
        const unnecessarySpending = impulseSpending;
        return { totalSpent, junkFoodSpending, impulseSpending, totalCalories, pieData, unnecessarySpending, thisMonthTransactions };
    }, [transactions]);
    
    // --- Render Logic ---
    if (loading || (user && !userProfile)) {
        return <div className="loading-screen"><h1>Loading Smart Manager...</h1></div>;
    }

    if (!user) {
        return (
            <>
                {notification.show && <div className={`notification ${notification.type}`}>{notification.message}</div>}
                <div className="login-container">
                    <div className="login-box">
                        <h1>{isLoginView ? 'Welcome Back' : 'Create Account'}</h1>
                        <p>Your AI companion for better savings and health.</p>
                        <form onSubmit={isLoginView ? handleLogin : handleSignUp} className="auth-form">
                            <input name="email" type="email" placeholder="Email" value={authDetails.email} onChange={handleAuthChange} required />
                            <input name="password" type="password" placeholder="Password" value={authDetails.password} onChange={handleAuthChange} required />
                            <button type="submit">{isLoginView ? 'Login' : 'Sign Up'}</button>
                        </form>
                        <p className="auth-toggle">{isLoginView ? "Don't have an account?" : "Already have an account?"}<button onClick={() => setIsLoginView(!isLoginView)}>{isLoginView ? 'Sign Up' : 'Login'}</button></p>
                    </div>
                </div>
            </>
        );
    }
    
    const renderView = () => {
        switch (view) {
            case 'dashboard': return <DashboardView analysis={analysis} userProfile={userProfile} streaks={streaks} transactions={transactions} callGeminiAPI={callGeminiAPI} aiAlert={aiAlert} />;
            case 'add': return <AddTransactionView newItem={newItem} setNewItem={setNewItem} handleAddItem={handleAddItem} aiIsProcessing={aiIsProcessing} />;
            case 'analytics': return <AnalyticsView analysis={analysis} callGeminiAPI={callGeminiAPI} />;
            case 'goals': return <GoalsView analysis={analysis} userProfile={userProfile} streaks={streaks} />;
            case 'reports': return <ReportsView analysis={analysis} callGeminiAPI={callGeminiAPI} />;
            case 'settings': return <SettingsView user={user} userProfile={userProfile} showNotification={showNotification} />;
            default: return <DashboardView analysis={analysis} userProfile={userProfile} streaks={streaks} transactions={transactions} callGeminiAPI={callGeminiAPI} aiAlert={aiAlert} />;
        }
    };

    return (
        <div className="app-container">
            {notification.show && <div className={`notification ${notification.type}`}>{notification.message}</div>}
            <aside className="sidebar">
                <div className="sidebar-header"><h2>Smart AI</h2></div>
                <nav className="sidebar-nav">
                    <button onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'active' : ''}>Dashboard</button>
                    <button onClick={() => setView('analytics')} className={view === 'analytics' ? 'active' : ''}>Analytics</button>
                    <button onClick={() => setView('goals')} className={view === 'goals' ? 'active' : ''}>Goals</button>
                    <button onClick={() => setView('reports')} className={view === 'reports' ? 'active' : ''}>Reports</button>
                    <button onClick={() => setView('settings')} className={view === 'settings' ? 'active' : ''}>Settings</button>
                </nav>
                <div className="sidebar-footer">
                    <button onClick={toggleTheme} className="theme-toggle">
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                    <div className="user-profile">
                        <span>{user.displayName || user.email}</span>
                    </div>
                     <button onClick={() => auth.signOut()} className="logout-btn">Logout</button>
                </div>
            </aside>
            <main className="main-content">{renderView()}</main>
            <button className="fab" onClick={() => setView('add')}>+</button>
        </div>
    );
}
