import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom";
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
import AboutUs from "./components/AboutUs";
import BusinessSettings from './components/BusinessSettings';
import { UserProfileProvider } from './contexts/UserProfileContext';
import FestivalManagement from "./components/FestivalManagement";
import UserSettings from './components/UserSettings';
import BusinessTermsAndConditions from './components/BusinessTermsAndConditions';
import TermsAndConditions from './components/TermsAndConditions';
import UserManagement from './components/UserManagement';
import HelpAndSupport from './components/HelpAndSupport';
import { applyActionCode } from 'firebase/auth';
import { Canvas, useThree, useFrame, useLoader } from '@react-three/fiber';
import { Suspense } from 'react';
import ResetPassword from './components/ResetPassword';
import ReadMore from './pages/ReadMore';

const EmailVerified: React.FC = () => {
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get the action code from the URL
        const actionCode = new URLSearchParams(window.location.search).get('oobCode');
        
        if (actionCode) {
          // Apply the action code
          await applyActionCode(auth, actionCode);
          setVerificationStatus('success');
          
          // Redirect to signin after a short delay
          setTimeout(() => {
            navigate('/signin', { 
              state: { 
                verificationSuccess: true,
                message: 'Email verified successfully! Please sign in.' 
              }
            });
          }, 3000);
        }
      } catch (error) {
        console.error('Error verifying email:', error);
        setVerificationStatus('error');
      }
    };

    verifyEmail();
  }, [navigate]);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Three.js Background */}
      <div className="absolute inset-0">
        <Canvas className="w-full h-full" gl={{ antialias: true, alpha: true }}>
          <Suspense fallback={<Loader />}>
            <InnerSphere />
          </Suspense>
        </Canvas>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center items-center">
        <div className="w-full max-w-md mx-auto px-4 text-center">
          <div className="text-[50px] md:text-[100px] font-[500] mb-8 tracking-[0.12em]
                        text-white/95 font-['Outfit']
                        drop-shadow-[0_0_30px_rgba(255,255,255,0.25)]">
            SONDER
          </div>
          
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20">
            {verificationStatus === 'verifying' && (
              <p className="text-white/90 text-xl font-['Space_Grotesk']">
                Verifying your email...
              </p>
            )}
            {verificationStatus === 'success' && (
              <>
                <h2 className="text-2xl font-['Space_Grotesk'] text-white/90 mb-4">
                  Email Verified Successfully!
                </h2>
                <p className="text-white/70 font-['Space_Grotesk']">
                  Redirecting you to sign in...
                </p>
              </>
            )}
            {verificationStatus === 'error' && (
              <p className="text-red-400 font-['Space_Grotesk']">
                Error verifying email. Please try again or contact support.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

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
                <Route path="/search" element={<Search />} />
                <Route path="/profile/:userId" element={<Profile />} />
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
            <Route path="/about" element={<AboutUs />} />
            <Route path="/festival-management/:festivalId" element={<FestivalManagement />} />
            <Route path="/settings" element={<UserSettings />} />
            <Route path="/business-terms" element={<BusinessTermsAndConditions />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/help-support" element={<HelpAndSupport />} />
            <Route path="/business/:businessId" element={<BusinessDashboard />} />
            <Route path="/verified" element={<EmailVerified />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/read-more" element={<ReadMore />} />
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
