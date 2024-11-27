import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { auth } from "./firebase";
import Home from "./components/Home";
import AddPost from "./components/AddPost";
import SignIn from "./components/SignIn";
import { User as FirebaseUser } from "firebase/auth";
import WelcomeScreen from "./components/WelcomeScreen";
import Search from "./components/Search";
import AdminPage from "./components/AdminPage";
import Chat from "./components/Chat";
import Profile from "./components/Profile";
import Calendar from "./components/Calendar";
import BusinessCalendar from './components/BusinessCalendar';
import { getDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import CompleteProfile from "./components/CompleteProfile";
import BusinessDashboard from './components/BusinessDashboard';

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBusinessAccount, setIsBusinessAccount] = useState(false);

  const isAdmin = (user: FirebaseUser | null) => {
    return user?.email?.toLowerCase() === "admin@sonder.com";
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsBusinessAccount(!!userData?.isBusinessAccount);
        setUser(user);
      } else {
        setIsBusinessAccount(false);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-rose-100 flex flex-col justify-center items-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl opacity-20 -top-20 -left-20 animate-pulse"></div>
          <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl opacity-20 -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        {/* Logo */}
        <div className="text-6xl font-bold mb-12 transform hover:scale-105 transition-transform duration-300 cursor-default flex justify-center relative z-10">
          <span className="text-purple-600">S</span>
          <span style={{ color: '#DC2626' }}>o</span>
          <span className="text-purple-600">nder</span>
        </div>

        {/* Loading animation */}
        <div className="flex items-center justify-center gap-3 relative z-10">
          <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app flex flex-col min-h-screen">
        <main className="flex-grow">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={!user ? <WelcomeScreen /> : <Navigate to="/home" />} />
            <Route path="/signin" element={!user ? <SignIn /> : <Navigate to="/home" />} />
            
            {/* Protected routes */}
            <Route path="/complete-profile" element={user ? <CompleteProfile /> : <Navigate to="/signin" />} />
            
            {/* Business user routes */}
            {isBusinessAccount && user && (
              <>
                <Route path="/home" element={<Navigate to="/add-post" replace />} />
                <Route path="/add-post" element={<AddPost />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/chat/:userId" element={<Chat />} />
                <Route path="/business-calendar" element={<BusinessCalendar />} />
                <Route path="/business-dashboard" element={<BusinessDashboard />} />
              </>
            )}

            {/* Regular user routes */}
            {!isBusinessAccount && user && (
              <>
                <Route path="/home" element={<Home />} />
                <Route path="/add-post" element={<AddPost />} />
                <Route path="/search" element={<Search />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/chat/:userId" element={<Chat />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/business-calendar" element={<BusinessCalendar />} />
                {isAdmin(user) && <Route path="/admin" element={<AdminPage />} />}
              </>
            )}

            {/* Catch all route */}
            <Route path="*" element={<Navigate to={user ? "/home" : "/"} replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
