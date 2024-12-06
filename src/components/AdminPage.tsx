import * as THREE from 'three';
import React, { useState, useEffect } from "react";
import { collection, query, getDocs, where, doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import { Suspense } from 'react';
import { Users, Building2, LogOut } from 'lucide-react';

interface User {
  uid: string;
  email: string;
  displayName: string;
  createdAt: any;
  isBusinessAccount?: boolean;
}

// Add the Loader component
function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="text-white text-xl">
        {progress.toFixed(0)}% loaded
      </div>
    </Html>
  )
}

// Add the InnerSphere component
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

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'users' | 'business'>('users');
  const [businessUsers, setBusinessUsers] = useState<User[]>([]);

  // Business account creation form state
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchBusinessUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      
      const usersList: User[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.email && 
            userData.email.toLowerCase() !== "admin@sonder.com" && 
            !userData.isBusinessAccount) {
          usersList.push({
            uid: doc.id,
            email: userData.email,
            displayName: userData.displayName || 'Anonymous User',
            createdAt: userData.createdAt,
            isBusinessAccount: userData.isBusinessAccount || false
          });
        }
      });
      
      setUsers(usersList);
      console.log("Fetched users:", usersList);
    } catch (err) {
      setError("Failed to fetch users");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessUsers = async () => {
    try {
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      
      const businessList: User[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.email && userData.isBusinessAccount) {
          businessList.push({
            uid: doc.id,
            email: userData.email,
            displayName: userData.displayName || 'Anonymous Business',
            createdAt: userData.createdAt,
            isBusinessAccount: true
          });
        }
      });
      
      setBusinessUsers(businessList);
    } catch (err) {
      console.error("Error fetching business users:", err);
    }
  };

  const handleCreateBusinessAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAccountError(null);

    if (!companyName.trim() || !email.trim() || !password.trim()) {
      setCreateAccountError("All fields are required");
      return;
    }

    try {
      // Create authentication account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { user } = userCredential;

      // Create user document
      await setDoc(doc(db, "users", user.uid), {
        email: email.toLowerCase(),
        displayName: companyName,
        isBusinessAccount: true,
        createdAt: new Date(),
      });

      // Fetch updated business users list
      await fetchBusinessUsers();

      // Reset form
      setCompanyName("");
      setEmail("");
      setPassword("");

      // Show success message
      alert("Business account created successfully!");
    } catch (err) {
      console.error("Error creating business account:", err);
      setCreateAccountError("Failed to create business account. Please try again.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="min-h-screen w-full overflow-y-auto relative">
      {/* Three.js Background */}
      <div className="fixed inset-0">
        <Canvas className="w-full h-full" gl={{ antialias: true, alpha: true }}>
          <Suspense fallback={<Loader />}>
            <InnerSphere />
          </Suspense>
        </Canvas>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen pb-20">
        {/* Header Section */}
        <div className="max-w-6xl mx-auto px-4 pt-8">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl 
                         shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                         p-8 border border-white/20 mb-8">
            <div className="flex justify-between items-center">
              <h1 className="text-4xl font-['Space_Grotesk'] tracking-[0.1em] text-white/90">
                Admin Dashboard
              </h1>
              <button
                onClick={handleSignOut}
                className="px-6 py-3 border-2 border-white/30 rounded-full
                         text-white font-['Space_Grotesk'] tracking-[0.2em]
                         transition-all duration-300 
                         hover:border-white/60 hover:scale-105
                         hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]
                         active:scale-95
                         flex items-center gap-2"
              >
                <LogOut size={20} />
                SIGN OUT
              </button>
            </div>
          </div>

          {/* Section Toggle */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 mb-8 border border-white/20">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveSection('users')}
                className={`px-8 py-3 rounded-full transition-all transform hover:scale-105 
                           font-['Space_Grotesk'] flex items-center gap-2 ${
                  activeSection === 'users'
                    ? "bg-white/20 text-white border-2 border-white/40"
                    : "bg-white/10 text-white/70 border border-white/20 hover:bg-white/20"
                }`}
              >
                <Users size={20} />
                Regular Users
              </button>
              <button
                onClick={() => setActiveSection('business')}
                className={`px-8 py-3 rounded-full transition-all transform hover:scale-105 
                           font-['Space_Grotesk'] flex items-center gap-2 ${
                  activeSection === 'business'
                    ? "bg-white/20 text-white border-2 border-white/40"
                    : "bg-white/10 text-white/70 border border-white/20 hover:bg-white/20"
                }`}
              >
                <Building2 size={20} />
                Business Accounts
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          {activeSection === 'business' ? (
            <div className="space-y-8">
              {/* Create Business Account Form */}
              <div className="backdrop-blur-xl bg-white/10 rounded-2xl 
                            shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                            p-8 border border-white/20">
                <h2 className="text-2xl font-['Space_Grotesk'] tracking-[0.1em] text-white/90 mb-6">
                  Create Business Account
                </h2>
                <form onSubmit={handleCreateBusinessAccount} className="space-y-4">
                  <div>
                    <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full p-3 rounded-lg bg-white/10 border border-white/20 
                               text-white placeholder-white/50 font-['Space_Grotesk']
                               focus:outline-none focus:ring-2 focus:ring-white/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 rounded-lg bg-white/10 border border-white/20 
                               text-white placeholder-white/50 font-['Space_Grotesk']
                               focus:outline-none focus:ring-2 focus:ring-white/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 rounded-lg bg-white/10 border border-white/20 
                               text-white placeholder-white/50 font-['Space_Grotesk']
                               focus:outline-none focus:ring-2 focus:ring-white/30"
                      required
                      minLength={6}
                    />
                  </div>
                  {createAccountError && (
                    <p className="text-red-400 text-sm font-['Space_Grotesk']">{createAccountError}</p>
                  )}
                  <button
                    type="submit"
                    className="w-full py-3 border-2 border-white/30 rounded-full
                             text-white font-['Space_Grotesk'] tracking-[0.2em]
                             transition-all duration-300 
                             hover:border-white/60 hover:scale-105
                             hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]
                             active:scale-95"
                  >
                    CREATE BUSINESS ACCOUNT
                  </button>
                </form>
              </div>

              {/* Business Users List */}
              <div className="backdrop-blur-xl bg-white/10 rounded-2xl 
                            shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                            p-8 border border-white/20">
                <h2 className="text-2xl font-['Space_Grotesk'] tracking-[0.1em] text-white/90 mb-6">
                  Business Accounts
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-sm font-['Space_Grotesk'] text-white/60">
                          Company Name
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-['Space_Grotesk'] text-white/60">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-['Space_Grotesk'] text-white/60">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {businessUsers.map((user) => (
                        <tr key={user.uid} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-3 px-4 text-white/90 font-['Space_Grotesk']">
                            {user.displayName}
                          </td>
                          <td className="py-3 px-4 text-white/90 font-['Space_Grotesk']">
                            {user.email}
                          </td>
                          <td className="py-3 px-4 text-white/90 font-['Space_Grotesk']">
                            {user.createdAt?.toDate?.() 
                              ? user.createdAt.toDate().toLocaleDateString() 
                              : user.createdAt instanceof Date 
                                ? user.createdAt.toLocaleDateString()
                                : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {businessUsers.length === 0 && (
                    <p className="text-center text-white/60 py-8 font-['Space_Grotesk']">
                      No business accounts found
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Regular Users List */
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl 
                          shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                          p-8 border border-white/20">
              <h2 className="text-2xl font-['Space_Grotesk'] tracking-[0.1em] text-white/90 mb-6">
                Regular Users
              </h2>
              {error && (
                <p className="text-red-400 mb-4 font-['Space_Grotesk']">{error}</p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-sm font-['Space_Grotesk'] text-white/60">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-['Space_Grotesk'] text-white/60">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-['Space_Grotesk'] text-white/60">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.uid} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-3 px-4 text-white/90 font-['Space_Grotesk']">
                          {user.displayName || 'Anonymous User'}
                        </td>
                        <td className="py-3 px-4 text-white/90 font-['Space_Grotesk']">
                          {user.email}
                        </td>
                        <td className="py-3 px-4 text-white/90 font-['Space_Grotesk']">
                          {user.createdAt?.toDate?.() 
                            ? user.createdAt.toDate().toLocaleDateString() 
                            : user.createdAt instanceof Date 
                              ? user.createdAt.toLocaleDateString()
                              : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <p className="text-center text-white/60 py-8 font-['Space_Grotesk']">
                    No users found
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage; 