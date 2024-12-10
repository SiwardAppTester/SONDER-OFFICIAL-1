import React, { useState, useEffect, Suspense } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc, getDocs, query, where, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Trash2, Plus, X, Menu } from 'lucide-react';
import BusinessSidebar from './BusinessSidebar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
import { firebaseApp } from '../firebase';
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, Html, useProgress } from '@react-three/drei';
import * as THREE from 'three';

interface SubUser {
  uid: string;
  email: string;
  displayName: string;
  createdAt: any;
  parentBusinessId: string;
}

const UserManagement: React.FC = () => {
  const [user] = useAuthState(auth);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchSubUsers();
    }
  }, [user]);

  const fetchSubUsers = async () => {
    if (!user) return;

    try {
      const subUsersRef = collection(db, "users");
      const q = query(subUsersRef, where("parentBusinessId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      
      const users: SubUser[] = [];
      querySnapshot.forEach((doc) => {
        users.push({ uid: doc.id, ...doc.data() } as SubUser);
      });
      
      setSubUsers(users);
    } catch (err) {
      console.error("Error fetching sub-users:", err);
      setError("Failed to fetch users");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newUserEmail || !newUserPassword || !newUserName) {
      setError("All fields are required");
      return;
    }

    try {
      // Get the current business user's data first
      const businessUserDoc = await getDoc(doc(db, "users", user?.uid || ""));
      const businessUserData = businessUserDoc.data();

      // Create the new user account using a secondary auth instance
      const secondaryAuth = getAuth(firebaseApp);
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUserEmail, newUserPassword);
      const newUser = userCredential.user;

      // Create user document with business account linkage
      await setDoc(doc(db, "users", newUser.uid), {
        email: newUserEmail.toLowerCase(),
        displayName: newUserName,
        parentBusinessId: user?.uid,
        createdAt: serverTimestamp(),
        isSubAccount: true,
        isBusinessAccount: true,
        businessName: businessUserData?.displayName || businessUserData?.businessName,
        accessibleFestivals: businessUserData?.accessibleFestivals || [],
        businessId: user?.uid,
      });

      // Sign out from secondary auth instance
      await secondaryAuth.signOut();

      // Reset form
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserName("");
      setIsAddingUser(false);
      setSuccess("Business user created successfully");

      // Refresh user list
      fetchSubUsers();
    } catch (err: any) {
      console.error("Error creating business user:", err);
      setError(err.message || "Failed to create business user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await deleteDoc(doc(db, "users", userId));
      setSubUsers(prev => prev.filter(user => user.uid !== userId));
      setSuccess("User deleted successfully");
    } catch (err) {
      console.error("Error deleting user:", err);
      setError("Failed to delete user");
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
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

      {/* Navigation */}
      <div className="md:hidden flex justify-between items-center p-4 relative z-20">
        <button
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="text-white hover:text-white/80 transition-colors duration-300"
        >
          <Menu size={28} />
        </button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex h-screen">
        <BusinessSidebar
          isNavOpen={isNavOpen}
          setIsNavOpen={setIsNavOpen}
          user={user || null}
          userProfile={userProfile}
          accessibleFestivalsCount={0}
        />
        
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 pt-32">
            <div className="flex justify-end mb-8">
              <button
                onClick={() => setIsAddingUser(true)}
                className="px-6 py-3 bg-white/5 border border-white/10 rounded-full
                         text-white font-['Space_Grotesk'] tracking-[0.2em]
                         transition-all duration-300 
                         hover:bg-white/10 hover:border-white/20
                         active:scale-95
                         flex items-center gap-2"
              >
                <Plus size={18} />
                ADD USER
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-500/5 border border-red-500/10 rounded-lg text-red-400 font-['Space_Grotesk']">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-emerald-400 font-['Space_Grotesk']">
                {success}
              </div>
            )}

            {isAddingUser && (
              <div className="mb-8 bg-white/5 rounded-lg border border-white/10 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-['Space_Grotesk'] tracking-wider text-white">
                    Add New User
                  </h2>
                  <button
                    onClick={() => setIsAddingUser(false)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full p-3 rounded-lg bg-white/5 border border-white/10 
                               text-white placeholder-white/40 font-['Space_Grotesk']
                               focus:outline-none focus:border-white/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full p-3 rounded-lg bg-white/5 border border-white/10 
                               text-white placeholder-white/40 font-['Space_Grotesk']
                               focus:outline-none focus:border-white/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full p-3 rounded-lg bg-white/5 border border-white/10 
                               text-white placeholder-white/40 font-['Space_Grotesk']
                               focus:outline-none focus:border-white/20"
                      required
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-white/5 border border-white/10 rounded-full
                             text-white font-['Space_Grotesk'] tracking-[0.2em]
                             transition-all duration-300 
                             hover:bg-white/10 hover:border-white/20
                             active:scale-95"
                  >
                    CREATE USER
                  </button>
                </form>
              </div>
            )}

            <div className="bg-white/5 rounded-lg border border-white/10 p-6">
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
                        Created
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-['Space_Grotesk'] text-white/60">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subUsers.map((subUser) => (
                      <tr key={subUser.uid} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-3 px-4 text-white/80 font-['Space_Grotesk']">
                          {subUser.displayName}
                        </td>
                        <td className="py-3 px-4 text-white/80 font-['Space_Grotesk']">
                          {subUser.email}
                        </td>
                        <td className="py-3 px-4 text-white/80 font-['Space_Grotesk']">
                          {subUser.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteUser(subUser.uid)}
                            className="text-white/60 hover:text-red-400 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {subUsers.length === 0 && (
                  <p className="text-center text-white/60 py-8 font-['Space_Grotesk']">
                    No users found
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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

export default UserManagement; 