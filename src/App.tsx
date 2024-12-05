import React, { useState, useEffect, useRef } from "react";
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
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense } from 'react';

// Add Loader component
function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
        <div className="text-white/80 text-sm mt-4 font-['Space_Grotesk']">
          {progress.toFixed(0)}%
        </div>
      </div>
    </Html>
  )
}

// Add InnerSphere component
function InnerSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <>
      <Environment preset="sunset" />
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      
      <mesh ref={meshRef} scale={[-15, -15, -15]}>
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
