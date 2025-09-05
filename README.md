# Rooted - AI-Powered Finance Manager
<a href="https://rooted-financial.vercel.app">Click Here for Live View</a>

Rooted is a smart, intuitive web application designed to bring clarity and control to your personal finances. By leveraging AI-driven insights, Rooted automatically categorizes your spending, analyzes your habits, and provides personalized advice to help you achieve your financial goals. Track your expenses, monitor your progress, and cultivate healthier financial habits with a seamless, real-time experience.

## ✨ Key Features
- **AI-Powered Transaction Analysis**: Automatically categorizes expenses, detects impulse buys, identifies junk food spending, and even estimates the caloric content of your food purchases.
- **Interactive Dashboard**: Get a comprehensive overview of your financial health with key performance indicators (KPIs) like total spending, unnecessary purchases, and progress against your set limits.
- **AI Savings Coach**: Receive personalized, actionable tips from an AI-powered coach that analyzes your recent transactions to help you save money.
- **Health & Wellness Integration**: Rooted goes beyond finances by providing AI-generated health alerts and suggesting healthier meal alternatives based on your spending habits.
- **Spending Comparison**: Visualize and compare your financial habits across different months with an AI-generated analysis of your progress.
- **Real-time Financial Charts**: Monitor your monthly expense flow, spending by category, and the correlation between your spending and health with dynamic charts.
- **Goals & Challenges**: Set personal financial goals for junk food, impulse spending, and savings. Take on AI-powered challenges to build better habits and unlock achievement badges.
- **Secure Authentication**: Your financial data is kept secure with reliable user authentication powered by Firebase.
- **AI Chatbot**: Get instant answers to your financial questions from a friendly AI assistant that understands your financial context.

## 🛠️ Technologies Used
- **React**: For building a dynamic and responsive user interface.
- **Vite**: As the build tool for a fast and optimized development experience.
- **Firebase**: For secure user authentication and real-time data persistence with Firestore.
- **Recharts**: To create beautiful and interactive charts for data visualization.
- **Google Generative AI (Gemini)**: The AI engine that powers automated transaction analysis, personalized coaching, and intelligent insights.

## ⚙️ Installation and Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/ras-al/smart-finance-manager.git
   ```
2. **Navigate to the project directory**:
   ```bash
   cd smart-finance-manager
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up environment variables**:
   - Create a `.env` file in the root of your project.
   - Add your Firebase and Gemini API keys to the `.env` file:
     ```
     VITE_FIREBASE_API_KEY="YOUR_API_KEY"
     VITE_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
     VITE_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
     VITE_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
     VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
     VITE_FIREBASE_APP_ID="YOUR_APP_ID"
     VITE_GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
     ```
5. **Run the development server**:
   ```bash
   npm run dev
   ```

## 💻 Usage
Once the application is running, open your browser to the provided localhost address. You can either register for a new account or log in if you already have one. Start by adding your expenses, and let Rooted's AI do the rest. Explore the different views to gain insights into your spending and make informed financial decisions.

## 📂 Project Structure
```
/src
|-- /components
|   |-- Views.jsx      # Contains all the main view components
|-- App.jsx            # Main application component with state and logic
|-- firebase.js        # Firebase configuration and initialization
|-- main.jsx           # Entry point of the React application
|-- styles.css         # Main styling for the application
```

## 📸 Screenshots
<img width="2879" height="1626" alt="image" src="https://github.com/user-attachments/assets/7135d251-b390-4879-9421-f4fe9b6be10d" />


## 🗺️ Roadmap
- [ ] Advanced budgeting features with customizable categories.
- [ ] Financial goal setting with progress tracking.
- [ ] Transaction tagging and advanced search functionality.
- [ ] Data export functionality (CSV, PDF).
- [ ] Automated bill reminders and subscription tracking.
- [ ] Multi-currency support for international users.

## 📜 License
This project is licensed under the MIT License.
