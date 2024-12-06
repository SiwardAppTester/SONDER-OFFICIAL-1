import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { auth } from "./firebase";
import Home from "./components/Home";
import AddPost from "./components/AddPost";
import SignIn from "./components/SignIn";
import { User as FirebaseUser } from "firebase/auth";
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
import Discover from "./components/Discover";
import NewWelcomeScreen from "./components/NewWelcomeScreen";
import { Loader, InnerSphere, ThreeBackground } from './components/ThreeBackground';
import FestivalDetails from './components/FestivalDetails';
import AboutUs from "./components/AboutUs";
import BusinessSettings from './components/BusinessSettings';
import { UserProfileProvider } from './contexts/UserProfileContext';

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBusinessAccount, setIsBusinessAccount] = useState(false);
  const location = useLocation();

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
      <div className="relative min-h-screen w-full overflow-hidden bg-black">
        <ThreeBackground />
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen">
      <ThreeBackground />
      <div className="app flex flex-col min-h-screen relative z-10">
        <main className="flex-grow">
          <Routes>
            {/* Public routes */}
            <Route 
              path="/" 
              element={!user ? <NewWelcomeScreen /> : <Navigate to="/home" />} 
            />
            
            {/* Move signin route after root path */}
            <Route 
              path="/signin" 
              element={<SignIn />} 
            />
            
            {/* Protected routes */}
            <Route path="/complete-profile" element={user ? <CompleteProfile /> : <Navigate to="/signin" />} />
            
            {/* Business user routes */}
            {isBusinessAccount && user && (
              <>
                <Route path="/home" element={<Navigate to="/add-post" replace />} />
                <Route path="/add-post" element={<AddPost />} />
                <Route path="/chat" element={<Chat isBusinessAccount={isBusinessAccount} />} />
                <Route path="/chat/:userId" element={<Chat isBusinessAccount={isBusinessAccount} />} />
                <Route path="/business-calendar" element={<BusinessCalendar />} />
                <Route path="/business-dashboard" element={<BusinessDashboard />} />
                <Route path="/discover" element={<Discover isBusinessAccount={isBusinessAccount} />} />
                <Route path="/business-settings" element={<BusinessSettings />} />
              </>
            )}

            {/* Regular user routes */}
            {!isBusinessAccount && user && (
              <>
                <Route path="/home" element={<Home />} />
                <Route path="/discover" element={<Discover isBusinessAccount={isBusinessAccount} />} />
                <Route path="/add-post" element={<AddPost />} />
                <Route path="/search" element={<Search />} />
                <Route path="/chat" element={<Chat isBusinessAccount={isBusinessAccount} />} />
                <Route path="/chat/:userId" element={<Chat isBusinessAccount={isBusinessAccount} />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/business-calendar" element={<BusinessCalendar />} />
                {isAdmin(user) && <Route path="/admin" element={<AdminPage />} />}
              </>
            )}

            {/* Catch all route */}
            <Route path="*" element={<Navigate to={user ? "/home" : "/"} replace />} />
            <Route path="/festival/:festivalId" element={<FestivalDetails />} />
            <Route path="/about" element={<AboutUs />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

// Wrap the App with BrowserRouter
const AppWrapper: React.FC = () => {
  return (
    <Router>
      <UserProfileProvider>
        <App />
      </UserProfileProvider>
    </Router>
  );
};

export default AppWrapper;
