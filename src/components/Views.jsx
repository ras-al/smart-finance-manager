import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, BarChart, Bar } from 'recharts';
import { db } from '../firebase.js';
import { doc, setDoc } from 'firebase/firestore';

export function DashboardView({ analysis, userProfile, streaks, transactions, callGeminiAPI, aiAlert }) {
    const { totalSpent, junkFoodSpending, impulseSpending, unnecessarySpending, monthlyGraphData } = analysis;
    const [coachAdvice, setCoachAdvice] = useState('');
    const [isCoachLoading, setIsCoachLoading] = useState(true);

    const getAICoachAdvice = useCallback(async () => {
        setIsCoachLoading(true);
        const recentTransactions = transactions.slice(0, 10).map(t => `${t.name}: ₹${t.amount}`).join(', ');
        if (transactions.length === 0) {
            setCoachAdvice("Add your first transaction to get personalized savings tips!");
            setIsCoachLoading(false);
            return;
        }
        const prompt = `Based on these recent transactions [${recentTransactions}], act as a friendly financial coach. Provide 3 specific, actionable tips to help the user save money. Format the response as a single string with each tip on a new line, starting with a bullet point (e.g., "• Tip 1...\\n• Tip 2...").`;
        const advice = await callGeminiAPI(prompt);
        if (advice) {
            setCoachAdvice(advice);
        } else {
            setCoachAdvice("Could not generate advice right now. Please check back later.");
        }
        setIsCoachLoading(false);
    }, [transactions, callGeminiAPI]);

    useEffect(() => {
        getAICoachAdvice();
    }, [getAICoachAdvice]);

    const badges = useMemo(() => {
        const unlocked = [];
        if (streaks.noJunkFood >= 7) unlocked.push({ name: "Healthy Week", icon: "🥗" });
        if (streaks.noImpulseSpending >= 30) unlocked.push({ name: "Mindful Month", icon: "🧠" });
        if (analysis.totalSpent > 0 && analysis.unnecessarySpending / analysis.totalSpent < 0.1) unlocked.push({ name: "Super Saver", icon: "💰" });
        return unlocked;
    }, [streaks, analysis]);

    return (
        <div className="dashboard">
            <header className="main-header"><h1>Welcome Back!</h1><p>Here's your financial and lifestyle summary for this month.</p></header>
            
            {aiAlert && (
                <div className="card full-width ai-alert">
                    <h3>💡 Health & Wellness Tip</h3>
                    <p>{aiAlert}</p>
                </div>
            )}

            <div className="kpi-grid">
                <div className="kpi-card"><h3>Total Spent</h3><p>₹{totalSpent.toFixed(2)}</p></div>
                <div className="kpi-card"><h3>Unnecessary Spending</h3><p>₹{unnecessarySpending.toFixed(2)}</p><span className="kpi-subtext">{((unnecessarySpending / totalSpent) * 100 || 0).toFixed(1)}% of total</span></div>
                <div className="kpi-card"><h3>Junk Food Spending</h3><p>₹{junkFoodSpending.toFixed(2)}</p><span className={`kpi-subtext ${junkFoodSpending > userProfile.junkFoodLimit ? 'danger' : 'safe'}`}>Limit: ₹{userProfile.junkFoodLimit}</span></div>
                <div className="kpi-card"><h3>Impulse Purchases</h3><p>₹{impulseSpending.toFixed(2)}</p><span className={`kpi-subtext ${impulseSpending > userProfile.impulseSpendingLimit ? 'danger' : 'safe'}`}>Limit: ₹{userProfile.impulseSpendingLimit}</span></div>
            </div>

            <div className="card full-width">
                <h3>Monthly Expense Flow</h3>
                <div className="monthly-graph-container">
                    <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={monthlyGraphData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <XAxis dataKey="day" />
                            <YAxis />
                            <CartesianGrid strokeDasharray="3 3" />
                            <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                            <Line type="monotone" dataKey="spent" stroke="var(--secondary-color)" strokeWidth={2} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="content-grid">
                <div className="card"><h3>AI Savings Coach</h3>
                    <div className="ai-feature-box">
                        {isCoachLoading ? <p>✨ Thinking...</p> : <div className="ai-result">{coachAdvice.split('\n').map((line, i) => <p key={i}>{line}</p>)}</div>}
                    </div>
                </div>
                <div className="card"><h3>Streaks & Badges</h3><div className="streaks-container"><div className="streak"><span className="streak-icon">🥗</span><p>{streaks.noJunkFood} Days</p><span>No Junk Food</span></div><div className="streak"><span className="streak-icon">🛍️</span><p>{streaks.noImpulseSpending} Days</p><span>No Impulse Buys</span></div></div><div className="badges-container"><h4>Unlocked Badges</h4>{badges.length > 0 ? badges.map(b => <div key={b.name} className="badge">{b.icon} {b.name}</div>) : <p>Keep up the good habits!</p>}</div></div>
            </div>
            <div className="card full-width"><h3>Recent Transactions</h3><ul className="transaction-list">{transactions.slice(0, 5).map(t => (<li key={t.id} className="transaction-item"><div className="transaction-details"><strong>{t.name}</strong><span>{new Date(t.date).toLocaleDateString()}</span></div><div className="transaction-tags">{t.category && <span className="tag">{t.category}</span>}{t.foodTag && <span className={`tag ${t.foodTag.toLowerCase()}`}>{t.foodTag}</span>}{t.isImpulse && <span className="tag impulse">Impulse</span>}</div><div className="transaction-amount">-₹{t.amount.toFixed(2)}</div></li>))}</ul></div>
        </div>
    );
}

export function AddTransactionView({ newItem, setNewItem, handleAddItem, aiIsProcessing }) {
    return (
        <div className="add-transaction-view">
            <h1>Add New Expense</h1><p>Our AI will automatically categorize and analyze it for you.</p>
            <form onSubmit={handleAddItem} className="add-form">
                <div className="form-group"><label htmlFor="name">Item / Service</label><input type="text" id="name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g., McDonald's, Nike Shoes" required /></div>
                <div className="form-group"><label htmlFor="amount">Amount (₹)</label><input type="number" id="amount" value={newItem.amount} onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })} placeholder="e.g., 250" required /></div>
                <div className="form-group"><label htmlFor="date">Date</label><input type="date" id="date" value={newItem.date} onChange={(e) => setNewItem({ ...newItem, date: e.target.value })} required /></div>
                <button type="submit" className="submit-btn" disabled={aiIsProcessing}>{aiIsProcessing ? 'AI is Analyzing...' : 'Add & Analyze'}</button>
            </form>
        </div>
    );
}

export function AnalyticsView({ analysis, callGeminiAPI }) {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];
    const { junkFoodSpending, totalCalories, pieData, thisMonthTransactions } = analysis;
    const [mealSuggestions, setMealSuggestions] = useState('');
    const [isMealLoading, setIsMealLoading] = useState(false);

    const getMealIdeas = async () => {
        setIsMealLoading(true);
        setMealSuggestions('');
        const junkFoods = thisMonthTransactions.filter(t => t.foodTag === 'Junk').map(t => t.name).slice(0,5).join(', ');
        if (!junkFoods) {
            setMealSuggestions('No junk food transactions found to analyze!');
            setIsMealLoading(false);
            return;
        }
        const prompt = `A user frequently eats the following junk foods: ${junkFoods}. Suggest 3 healthier and budget-friendly meal alternatives they could make or buy. For each suggestion, give a name and a one-sentence description. Format as a single string with each suggestion on a new line, starting with a bullet point.`;
        const suggestions = await callGeminiAPI(prompt);
        if (suggestions) setMealSuggestions(suggestions);
        setIsMealLoading(false);
    };

    return (
        <div className="analytics-view">
            <h1>Analytics & AI Insights</h1>
            <div className="content-grid">
                <div className="card"><h3>Spending by Category</h3><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>{pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value) => `₹${value.toFixed(2)}`} /><Legend /></PieChart></ResponsiveContainer></div>
                <div className="card"><h3>Calorie vs. Cost Dashboard</h3><div className="calorie-cost-info"><div><h4>Total Junk Food Spend</h4><p>₹{junkFoodSpending.toFixed(2)}</p></div><div><h4>Total Calories from Junk</h4><p>{totalCalories.toLocaleString()} kcal</p></div></div>
                    <div className="ai-feature-box">
                        {isMealLoading ? <p>✨ Generating ideas...</p> : mealSuggestions ? <div className="ai-result">{mealSuggestions.split('\n').map((line, i) => <p key={i}>{line}</p>)}</div> : <p>Get healthier meal ideas based on your habits.</p>}
                        <button onClick={getMealIdeas} disabled={isMealLoading}>✨ Get Healthier Alternatives</button>
                    </div>
                </div>
            </div>
            <div className="card full-width"><h3>Spending & Health Correlation</h3><p>This chart shows the link between daily spending and calorie intake from food purchases.</p><ResponsiveContainer width="100%" height={400}><LineChart data={thisMonthTransactions.map(t => ({ date: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), spending: t.amount, calories: t.estimatedCalories || 0 })).reverse()} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis yAxisId="left" stroke="var(--secondary-color)" label={{ value: 'Spending (₹)', angle: -90, position: 'insideLeft' }} /><YAxis yAxisId="right" orientation="right" stroke="#82ca9d" label={{ value: 'Calories (kcal)', angle: -90, position: 'insideRight' }}/><Tooltip /><Legend /><Line yAxisId="left" type="monotone" dataKey="spending" stroke="var(--secondary-color)" activeDot={{ r: 8 }} /><Line yAxisId="right" type="monotone" dataKey="calories" stroke="#82ca9d" /></LineChart></ResponsiveContainer></div>
        </div>
    );
}

export function GoalsView({ analysis, userProfile, streaks }) {
    const junkProgress = (analysis.junkFoodSpending / userProfile.junkFoodLimit) * 100;
    const impulseProgress = (analysis.impulseSpending / userProfile.impulseSpendingLimit) * 100;
    const savingsProgress = (analysis.totalSpent < userProfile.savingsGoal) ? ((userProfile.savingsGoal - analysis.totalSpent) / userProfile.savingsGoal) * 100 : 0;
    const challenges = [
        { id: 1, name: "1 Week No Late-Night Swiggy", icon: "🌙", description: "Avoid food orders after 10 PM for 7 days straight.", completed: streaks.noJunkFood >= 7 },
        { id: 2, name: "Impulse-Free Weekend", icon: "🛍️", description: "Make no impulse purchases from Friday to Sunday.", completed: streaks.noImpulseSpending >= 3 },
        { id: 3, name: "Under Budget Hero", icon: "🎯", description: "Keep your total spending below your monthly savings goal.", completed: savingsProgress >= 100 },
    ];

    return (
        <div className="goals-view">
            <h1>Goals & Challenges</h1><p>Track your progress and take on personalized AI challenges.</p>
            <div className="content-grid">
                <div className="card"><h3>Weekly/Monthly Goals</h3><div className="goal-item"><label>Junk Food Budget (₹{analysis.junkFoodSpending.toFixed(0)} / ₹{userProfile.junkFoodLimit})</label><div className="progress-bar-container"><div className="progress-bar" style={{ width: `${Math.min(junkProgress, 100)}%`, backgroundColor: junkProgress > 100 ? '#e74c3c' : '#2ecc71' }}></div></div></div><div className="goal-item"><label>Impulse Spending Limit (₹{analysis.impulseSpending.toFixed(0)} / ₹{userProfile.impulseSpendingLimit})</label><div className="progress-bar-container"><div className="progress-bar" style={{ width: `${Math.min(impulseProgress, 100)}%`, backgroundColor: impulseProgress > 100 ? '#e74c3c' : '#f39c12' }}></div></div></div><div className="goal-item"><label>Monthly Savings Goal (Save ₹{Math.max(0, userProfile.savingsGoal - analysis.totalSpent).toFixed(0)})</label><div className="progress-bar-container"><div className="progress-bar" style={{ width: `${Math.min(savingsProgress, 100)}%`, backgroundColor: '#3498db' }}></div></div></div></div>
                <div className="card"><h3>Custom AI Challenges</h3><ul className="challenges-list">{challenges.map(c => (<li key={c.id} className={`challenge-item ${c.completed ? 'completed' : ''}`}><span className="challenge-icon">{c.icon}</span><div className="challenge-details"><strong>{c.name}</strong><p>{c.description}</p></div><span className="challenge-status">{c.completed ? '✅' : '⏳'}</span></li>))}</ul></div>
            </div>
        </div>
    );
}

export function ReportsView({ analysis, callGeminiAPI }) {
    const [report, setReport] = useState('');
    const [isReportLoading, setIsReportLoading] = useState(false);

    const generateReport = async () => {
        setIsReportLoading(true);
        setReport('');
        const summary = {
            totalSpent: analysis.totalSpent.toFixed(2),
            unnecessarySpending: analysis.unnecessarySpending.toFixed(2),
            junkFoodSpending: analysis.junkFoodSpending.toFixed(2),
            impulseSpending: analysis.impulseSpending.toFixed(2),
            topCategory: analysis.pieData.length > 0 ? analysis.pieData.sort((a,b) => b.value - a.value)[0].name : 'N/A'
        };
        const prompt = `Here is a user's spending summary for the month: ${JSON.stringify(summary)}. Act as a positive and motivational financial analyst. Write a short summary report (3-4 sentences) of their progress. Highlight one positive achievement and suggest one key area to focus on for next month. Format it as a friendly, encouraging paragraph.`;
        const result = await callGeminiAPI(prompt);
        if (result) setReport(result);
        setIsReportLoading(false);
    };

    return (
        <div className="reports-view">
            <h1>Monthly AI Report</h1>
            <p>Get a personalized summary of your financial and lifestyle performance for the current month.</p>
            <div className="card full-width">
                <h3>Your Performance Review</h3>
                <div className="ai-feature-box">
                    {isReportLoading ? <p>✨ Analyzing your month...</p> : report ? <div className="ai-result"><p>{report}</p></div> : <p>Click the button to generate your personalized AI report.</p>}
                    <button onClick={generateReport} disabled={isReportLoading}>✨ Generate Monthly Report</button>
                </div>
            </div>
        </div>
    );
}

export function SettingsView({ user, userProfile, showNotification }) {
    const [limits, setLimits] = useState(userProfile);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLimits(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        if (!user) {
            showNotification("You must be logged in to save settings.", "error");
            setIsSaving(false);
            return;
        }
        const userDocRef = doc(db, "users", user.uid);
        try {
            await setDoc(userDocRef, { profile: limits }, { merge: true });
            showNotification("Settings saved successfully!", "success");
        } catch (error) {
            console.error("Error saving settings:", error);
            showNotification("Failed to save settings.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="settings-view">
            <h1>Settings</h1>
            <p>Customize your monthly limits and goals.</p>
            <form onSubmit={handleSave} className="add-form">
                <div className="form-group">
                    <label htmlFor="junkFoodLimit">Junk Food Spending Limit (₹)</label>
                    <input
                        type="number"
                        id="junkFoodLimit"
                        name="junkFoodLimit"
                        value={limits.junkFoodLimit}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="impulseSpendingLimit">Impulse Spending Limit (₹)</label>
                    <input
                        type="number"
                        id="impulseSpendingLimit"
                        name="impulseSpendingLimit"
                        value={limits.impulseSpendingLimit}
                        onChange={handleChange}
                        required
                    />
                </div>
                 <div className="form-group">
                    <label htmlFor="savingsGoal">Monthly Savings Goal (₹)</label>
                    <input
                        type="number"
                        id="savingsGoal"
                        name="savingsGoal"
                        value={limits.savingsGoal}
                        onChange={handleChange}
                        required
                    />
                </div>
                <button type="submit" className="submit-btn" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
            </form>
        </div>
    );
}

export function ComparisonView({ allTransactions, callGeminiAPI }) {
    const [period1, setPeriod1] = useState(new Date().toISOString().slice(0, 7));
    const [period2, setPeriod2] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7));
    const [comparisonData, setComparisonData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [aiSummary, setAiSummary] = useState('');

    const handleCompare = useCallback(async () => {
        setIsLoading(true);
        setAiSummary('');

        const analyzePeriod = (period) => {
            const transactions = allTransactions.filter(t => t.date.startsWith(period));
            const totalSpent = transactions.reduce((acc, t) => acc + t.amount, 0);
            const junkFoodSpending = transactions.filter(t => t.foodTag === 'Junk').reduce((acc, t) => acc + t.amount, 0);
            const impulseSpending = transactions.filter(t => t.isImpulse).reduce((acc, t) => acc + t.amount, 0);
            return { totalSpent, junkFoodSpending, impulseSpending };
        };

        const data1 = analyzePeriod(period1);
        const data2 = analyzePeriod(period2);

        const chartData = [
            { name: 'Total Spent', [period1]: data1.totalSpent, [period2]: data2.totalSpent },
            { name: 'Junk Food', [period1]: data1.junkFoodSpending, [period2]: data2.junkFoodSpending },
            { name: 'Impulse Buys', [period1]: data1.impulseSpending, [period2]: data2.impulseSpending },
        ];
        setComparisonData(chartData);

        const prompt = `Compare the user's spending between two months. Period 1 (${period1}): ${JSON.stringify(data1)}. Period 2 (${period2}): ${JSON.stringify(data2)}. Provide a short, insightful summary of their financial changes. Highlight any improvements or areas where spending increased.`;
        const summary = await callGeminiAPI(prompt);
        if (summary) {
            setAiSummary(summary);
        }
        setIsLoading(false);
    }, [allTransactions, period1, period2, callGeminiAPI]);

    return (
        <div className="comparison-view">
            <h1>Spending Comparison</h1>
            <p>Compare your spending habits between different months.</p>
            <div className="card comparison-form">
                <div className="form-group">
                    <label>Period 1</label>
                    <input type="month" value={period1} onChange={e => setPeriod1(e.target.value)} />
                </div>
                <div className="form-group">
                    <label>Period 2</label>
                    <input type="month" value={period2} onChange={e => setPeriod2(e.target.value)} />
                </div>
                <button onClick={handleCompare} disabled={isLoading} className="submit-btn">
                    {isLoading ? 'Analyzing...' : 'Compare Periods'}
                </button>
            </div>

            {comparisonData && (
                <div className="content-grid">
                    <div className="card">
                        <h3>Comparison Chart</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={comparisonData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey={period1} fill="var(--primary-color)" />
                                <Bar dataKey={period2} fill="var(--secondary-color)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="card">
                        <h3>AI Analysis</h3>
                        <div className="ai-feature-box">
                            {isLoading ? <p>Generating AI summary...</p> : aiSummary ? <div className="ai-result"><p>{aiSummary}</p></div> : <p>AI summary will appear here.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function Chatbot({ callGeminiAPI, user, analysis }) {
    const [isOpen, setIsOpen] = useState(false);
    const userName = user?.displayName || user?.email.split('@')[0];
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setMessages([
                { sender: 'bot', text: `Hello, ${userName}! I am your Rooted financial assistant. How can I help you with your finances today?` }
            ]);
        }
    }, [isOpen, userName]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const financialContext = `
            Here is a summary of the user's current monthly finances:
            - Total Spent: ₹${analysis.totalSpent.toFixed(2)}
            - Junk Food Spending: ₹${analysis.junkFoodSpending.toFixed(2)}
            - Impulse Spending: ₹${analysis.impulseSpending.toFixed(2)}
            - Top Spending Category: ${analysis.pieData.length > 0 ? analysis.pieData.sort((a, b) => b.value - a.value)[0].name : 'N/A'}
        `;

        const systemInstruction = `You are a helpful and friendly financial assistant for an app called Rooted, speaking to a user named ${userName}. Your goal is to provide concise, clear, and encouraging advice on personal finance, budgeting, and healthy spending habits. Use the provided financial context to give personalized answers. Do not answer questions outside the scope of personal finance and well-being.
    
        ${financialContext}
        `;

        const response = await callGeminiAPI(input, systemInstruction);

        if (response) {
            const botMessage = { sender: 'bot', text: response };
            setMessages(prev => [...prev, botMessage]);
        } else {
            const errorMessage = { sender: 'bot', text: "Sorry, I'm having trouble connecting right now. Please try again later." };
            setMessages(prev => [...prev, errorMessage]);
        }
        setIsLoading(false);
    };

    return (
        <div className="chatbot-container">
            <button className="chatbot-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? '✕' : '💬'}
            </button>
            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <h3>Rooted AI Assistant</h3>
                    </div>
                    <div className="chatbot-messages">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.sender}`}>
                                {msg.text}
                            </div>
                        ))}
                        {isLoading && <div className="message bot">Typing...</div>}
                        <div ref={messagesEndRef} />
                    </div>
                    <form className="chatbot-input-form" onSubmit={handleSendMessage}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a financial question..."
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading}>Send</button>
                    </form>
                </div>
            )}
        </div>
    );
}

