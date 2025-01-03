import * as THREE from 'three';
import React, { useState, useEffect } from "react";
import { collection, query, getDocs, where, doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import { Suspense } from 'react';
import { Users, Building2, LogOut, Database, ArrowLeft } from 'lucide-react';
import { Loader, InnerSphere } from './ThreeBackground';
import BusinessDashboard from './BusinessDashboard';

interface User {
  uid: string;
  email: string;
  displayName: string;
  createdAt: any;
  isBusinessAccount?: boolean;
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'users' | 'business' | 'data'>('users');
  const [businessUsers, setBusinessUsers] = useState<User[]>([]);

  // Business account creation form state
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);

  // Add state for selected business
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  // Add new state for search
  const [searchTerm, setSearchTerm] = useState("");

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
      navigate("/signin");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Add new handler
  const handleBusinessClick = (businessId: string) => {
    setSelectedBusinessId(businessId);
  };

  // Add search filter function
  const filteredBusinessUsers = businessUsers.filter(business => 
    business.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    business.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="relative h-screen w-full">
      {/* Three.js Background */}
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

      {/* Content */}
      <div className="relative z-10 h-screen overflow-y-auto">
        {/* Header Section */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl 
                         shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                         p-4 sm:p-8 border border-white/20 mb-4 sm:mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <h1 className="text-2xl sm:text-4xl font-['Space_Grotesk'] tracking-[0.1em] text-white/90">
                Admin Dashboard
              </h1>
              <button
                onClick={handleSignOut}
                className="w-full sm:w-auto px-6 py-3 border-2 border-white/30 rounded-full
                         text-white font-['Space_Grotesk'] tracking-[0.2em]
                         transition-all duration-300 
                         hover:border-white/60 hover:scale-105
                         hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]
                         active:scale-95
                         flex items-center justify-center gap-2"
              >
                <LogOut size={20} />
                SIGN OUT
              </button>
            </div>
          </div>

          {/* Section Toggle */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-8 border border-white/20">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <button
                onClick={() => setActiveSection('users')}
                className={`px-4 sm:px-8 py-3 rounded-full transition-all transform hover:scale-105 
                           font-['Space_Grotesk'] flex items-center justify-center gap-2 w-full sm:w-auto ${
                  activeSection === 'users'
                    ? "bg-white/20 text-white border-2 border-white/40"
                    : "bg-white/10 text-white/70 border border-white/20 hover:bg-white/20"
                }`}
              >
                <Users size={20} />
                <span className="whitespace-nowrap">Regular Users</span>
              </button>
              <button
                onClick={() => setActiveSection('business')}
                className={`px-4 sm:px-8 py-3 rounded-full transition-all transform hover:scale-105 
                           font-['Space_Grotesk'] flex items-center justify-center gap-2 w-full sm:w-auto ${
                  activeSection === 'business'
                    ? "bg-white/20 text-white border-2 border-white/40"
                    : "bg-white/10 text-white/70 border border-white/20 hover:bg-white/20"
                }`}
              >
                <Building2 size={20} />
                <span className="whitespace-nowrap">Business Accounts</span>
              </button>
              <button
                onClick={() => setActiveSection('data')}
                className={`px-4 sm:px-8 py-3 rounded-full transition-all transform hover:scale-105 
                           font-['Space_Grotesk'] flex items-center justify-center gap-2 w-full sm:w-auto ${
                  activeSection === 'data'
                    ? "bg-white/20 text-white border-2 border-white/40"
                    : "bg-white/10 text-white/70 border border-white/20 hover:bg-white/20"
                }`}
              >
                <Database size={20} />
                <span className="whitespace-nowrap">Data</span>
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          {activeSection === 'business' ? (
            <div className="space-y-4 sm:space-y-8">
              {/* Create Business Account Form */}
              <div className="backdrop-blur-xl bg-white/10 rounded-2xl 
                            shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                            p-4 sm:p-8 border border-white/20">
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
                      className="w-full p-3 text-sm sm:text-base rounded-lg bg-white/10 border border-white/20 
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
                      className="w-full p-3 text-sm sm:text-base rounded-lg bg-white/10 border border-white/20 
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
                      className="w-full p-3 text-sm sm:text-base rounded-lg bg-white/10 border border-white/20 
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
                  <table className="w-full text-sm sm:text-base">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-sm font-['Space_Grotesk'] text-white/60">
                          Company Name
                        </th>
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-sm font-['Space_Grotesk'] text-white/60">
                          Email
                        </th>
                        <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-sm font-['Space_Grotesk'] text-white/60">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {businessUsers.map((user) => (
                        <tr key={user.uid} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-white/90 font-['Space_Grotesk']">
                            {user.displayName}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-white/90 font-['Space_Grotesk']">
                            {user.email}
                          </td>
                          <td className="py-2 sm:py-3 px-2 sm:px-4 text-white/90 font-['Space_Grotesk']">
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
          ) : activeSection === 'data' ? (
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl 
                          shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                          p-4 sm:p-8 border border-white/20">
              {selectedBusinessId ? (
                <>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h2 className="text-xl sm:text-2xl font-['Space_Grotesk'] tracking-[0.1em] text-white/90">
                      Business Analytics {businessUsers.find(user => user.uid === selectedBusinessId)?.displayName && (
                        <span className="text-white/60 block sm:inline text-base sm:text-2xl mt-1 sm:mt-0">
                          {" "}({businessUsers.find(user => user.uid === selectedBusinessId)?.displayName})
                        </span>
                      )}
                    </h2>
                    <button
                      onClick={() => setSelectedBusinessId(null)}
                      className="w-full sm:w-auto px-4 py-2 rounded-lg bg-white/10 text-white/90 
                                hover:bg-white/20 transition-all duration-300
                                flex items-center justify-center gap-2"
                    >
                      <ArrowLeft size={20} />
                      Back to Overview
                    </button>
                  </div>
                  <div className="bg-transparent">
                    <BusinessDashboard 
                      businessId={selectedBusinessId} 
                      embedded={true} 
                    />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-['Space_Grotesk'] tracking-[0.1em] text-white/90 mb-6">
                    Data Analytics
                  </h2>
                  
                  {/* Add Search Bar */}
                  <div className="mb-6">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search business accounts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-4 rounded-xl bg-white/10 border border-white/20 
                                 text-white placeholder-white/50 font-['Space_Grotesk']
                                 focus:outline-none focus:ring-2 focus:ring-white/30
                                 pl-12 transition-all duration-300
                                 hover:bg-white/[0.15]"
                      />
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                        <svg 
                          className="w-5 h-5 text-white/50" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-8">
                    <h3 className="text-xl font-['Space_Grotesk'] text-white/80 mb-4">
                      Business Accounts Overview
                    </h3>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredBusinessUsers.map((business) => (
                          <div 
                            key={business.uid}
                            className="p-4 bg-white/5 rounded-lg border border-white/10 
                                      hover:bg-white/10 transition-all cursor-pointer"
                            onClick={() => handleBusinessClick(business.uid)}
                          >
                            <h4 className="text-white/90 font-['Space_Grotesk'] font-medium mb-2">
                              {business.displayName}
                            </h4>
                            <p className="text-white/60 text-sm">
                              {business.email}
                            </p>
                            <p className="text-white/40 text-xs mt-2">
                              Joined: {business.createdAt?.toDate?.() 
                                ? business.createdAt.toDate().toLocaleDateString() 
                                : business.createdAt instanceof Date 
                                  ? business.createdAt.toLocaleDateString()
                                  : 'N/A'}
                            </p>
                          </div>
                        ))}
                      </div>
                      {filteredBusinessUsers.length === 0 && (
                        <p className="text-center text-white/60 py-8 font-['Space_Grotesk']">
                          No business accounts found matching your search
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
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
                <table className="w-full text-sm sm:text-base">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-sm font-['Space_Grotesk'] text-white/60">
                        Name
                      </th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-sm font-['Space_Grotesk'] text-white/60">
                        Email
                      </th>
                      <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-sm font-['Space_Grotesk'] text-white/60">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.uid} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-white/90 font-['Space_Grotesk']">
                          {user.displayName || 'Anonymous User'}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-white/90 font-['Space_Grotesk']">
                          {user.email}
                        </td>
                        <td className="py-2 sm:py-3 px-2 sm:px-4 text-white/90 font-['Space_Grotesk']">
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