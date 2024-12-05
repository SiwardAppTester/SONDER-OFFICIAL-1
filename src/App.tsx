import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
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
import Discover from "./components/Discover";
import NewWelcomeScreen from "./components/NewWelcomeScreen";
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense } from 'react';

// Add Loader component
function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="text-white text-xl font-['Space_Grotesk']">
        {progress.toFixed(0)}% loaded
      </div>
    </Html>
  )
}

// Add InnerSphere component
function InnerSphere() {
  return (
    <>
      <Environment preset="sunset" />
      <PerspectiveCamera makeDefault position={[0, 0, 0]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      
      <mesh scale={[-15, -15, -15]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          side={THREE.BackSide}
          color="#1a1a1a"
          metalness={0.9}
          roughness={0.1}
          envMapIntensity={1}
        />
      </mesh>
    </>
  )
}

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
        {/* Three.js Background */}
        <div className="absolute inset-0">
          <Canvas
            className="w-full h-full"
            gl={{ antialias: true, alpha: true }}
          >
            <Suspense fallback={<Loader />}>
              <InnerSphere />
            </Suspense>
          </Canvas>
        </div>

        {/* Content */}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center">
          {/* Logo */}
          <h1 className="md:text-[160px] text-[70px] font-[500] mb-12 tracking-[0.12em]
                        text-white/95 font-['Outfit']
                        drop-shadow-[0_0_30px_rgba(255,255,255,0.25)]
                        transition-all duration-700 ease-out
                        hover:tracking-[0.2em] hover:drop-shadow-[0_0_40px_rgba(255,255,255,0.35)]">
            SONDER
          </h1>

          {/* Loading animation */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" 
                 style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" 
                 style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" 
                 style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen">
      <div className="fixed inset-0">
        <Canvas
          className="w-full h-full"
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={<Loader />}>
            <InnerSphere />
          </Suspense>
        </Canvas>
      </div>

      <div className="app flex flex-col min-h-screen relative z-10">
        <main className="flex-grow">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={!user ? <NewWelcomeScreen /> : <Navigate to="/home" />} />
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
                <Route path="/discover" element={<Discover />} />
              </>
            )}

            {/* Regular user routes */}
            {!isBusinessAccount && user && (
              <>
                <Route path="/home" element={<Home />} />
                <Route path="/discover" element={<Discover />} />
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
    </div>
  );
};

// Wrap the App with BrowserRouter
const AppWrapper: React.FC = () => {
  return (
    <Router>
      <App />
    </Router>
  );
};

export default AppWrapper;
