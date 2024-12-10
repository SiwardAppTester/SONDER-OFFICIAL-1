import React, { useState, useEffect, Suspense } from "react";
import { collection, query, orderBy, startAt, endAt, getDocs, getDoc, doc, updateDoc, arrayRemove, arrayUnion } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Link } from "react-router-dom";
import { Menu, CheckCircle, Search as SearchIcon } from "lucide-react";
import Sidebar from "./Sidebar";
import { User as FirebaseUser } from "firebase/auth";
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import BusinessSidebar from "./BusinessSidebar";
import { useUserProfile } from '../contexts/UserProfileContext';

// Loader component for 3D scene
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

// Inner sphere component
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

interface UserResult {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isBusinessAccount?: boolean;
  username: string;
  followers?: string[];
}

interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
}

const Search: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const { userProfile } = useUserProfile();
  const isBusinessAccount = userProfile?.isBusinessAccount;
  const [following, setFollowing] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserProfile(userData as UserProfile);
          const festivals = userData.accessibleFestivals || [];
          setAccessibleFestivals(new Set(festivals));
        }
      } else {
        setUserProfile(null);
        setAccessibleFestivals(new Set());
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchTerm.trim() || searchTerm.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const searchTermLower = searchTerm.toLowerCase();
        const usersRef = collection(db, "users");
        const q = query(
          usersRef,
          orderBy("email"),
          startAt(searchTermLower),
          endAt(searchTermLower + '\uf8ff')
        );

        const querySnapshot = await getDocs(q);
        const users: UserResult[] = [];
        
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          if (userData.email?.toLowerCase() !== "admin@sonder.com") {
            users.push({
              uid: doc.id,
              email: userData.email,
              displayName: userData.displayName || 'Anonymous User',
              photoURL: userData.photoURL,
              isBusinessAccount: userData.isBusinessAccount || false,
              username: userData.username || userData.email.split('@')[0],
            });
          }
        });

        // Sort users: followed users first, then rest of the results
        const sortedUsers = users.sort((a, b) => {
          const aIsFollowed = following.has(a.uid);
          const bIsFollowed = following.has(b.uid);
          
          if (aIsFollowed && !bIsFollowed) return -1;
          if (!aIsFollowed && bIsFollowed) return 1;
          return 0;
        });

        setResults(sortedUsers);
      } catch (err) {
        console.error("Error searching users:", err);
        setError("Failed to search users. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, following]);

  useEffect(() => {
    const loadFollowingState = async () => {
      if (!auth.currentUser) return;
      
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setFollowing(new Set(userData.following || []));
      }
    };

    loadFollowingState();
  }, []);

  const handleFollowToggle = async (userId: string) => {
    if (!auth.currentUser) return;

    const currentUserId = auth.currentUser.uid;
    const userRef = doc(db, "users", currentUserId);
    const targetUserRef = doc(db, "users", userId);

    try {
      const isFollowing = following.has(userId);
      
      if (isFollowing) {
        // Unfollow logic
        await Promise.all([
          // Update current user's following
          updateDoc(userRef, {
            following: arrayRemove(userId)
          }),
          // Update target user's followers
          updateDoc(targetUserRef, {
            followers: arrayRemove(currentUserId)
          })
        ]);
        
        const newFollowing = new Set(following);
        newFollowing.delete(userId);
        setFollowing(newFollowing);
      } else {
        // Follow logic
        await Promise.all([
          // Update current user's following
          updateDoc(userRef, {
            following: arrayUnion(userId)
          }),
          // Update target user's followers
          updateDoc(targetUserRef, {
            followers: arrayUnion(currentUserId)
          })
        ]);
        
        const newFollowing = new Set(following);
        newFollowing.add(userId);
        setFollowing(newFollowing);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Conditionally render either BusinessSidebar or regular Sidebar */}
      {isBusinessAccount ? (
        <BusinessSidebar
          isNavOpen={isNavOpen}
          setIsNavOpen={setIsNavOpen}
          user={auth.currentUser}
          userProfile={userProfile}
          accessibleFestivalsCount={0}
        />
      ) : (
        <Sidebar
          isNavOpen={isNavOpen}
          setIsNavOpen={setIsNavOpen}
          user={auth.currentUser}
          accessibleFestivalsCount={0}
        />
      )}

      {/* Rest of your existing Search component JSX */}
      <div className="relative z-10 min-h-screen md:ml-0">
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
        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Search Content */}
          <div className="flex-1 p-4 pt-20">
            <div className="max-w-2xl mx-auto">
              {/* Search Input */}
              <div className="mb-8 transform hover:scale-105 transition-all duration-300">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Explore"
                    className="w-full px-6 py-4 rounded-full 
                             bg-white/10 text-white 
                             border border-white/20
                             backdrop-blur-xl
                             shadow-[0_0_20px_rgba(255,255,255,0.1)]
                             hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]
                             transition-all duration-300
                             text-lg focus:outline-none focus:ring-2 focus:ring-white/30
                             placeholder-white/50"
                    minLength={2}
                  />
                  <SearchIcon className="absolute right-6 top-1/2 transform -translate-y-1/2 text-white/70" size={24} />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-white/90 mb-4 text-center bg-white/10 backdrop-blur-xl rounded-lg p-3 border border-white/20">
                  {error}
                </div>
              )}

              {/* Results */}
              <div className="space-y-4">
                {results.length > 0 ? (
                  results.map((user) => (
                    <Link
                      to={`/profile/${user.uid}`}
                      key={user.uid}
                      className="block bg-white/10 backdrop-blur-xl py-4 px-6 rounded-2xl
                               border border-white/20
                               shadow-[0_0_20px_rgba(255,255,255,0.1)]
                               hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]
                               transform hover:scale-105 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName}
                            className="w-16 h-16 rounded-full ring-2 ring-white/20"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-white/20
                                        flex items-center justify-center text-white text-xl font-semibold">
                            {user.displayName[0]}
                          </div>
                        )}
                        <div className="flex-grow -my-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-lg text-white/90">
                              {user.displayName}
                            </p>
                            {user.isBusinessAccount && (
                              <CheckCircle 
                                size={20} 
                                className="text-white/70" 
                                fill="currentColor"
                                aria-label="Verified Business Account"
                              />
                            )}
                          </div>
                          <p className="text-white/50 text-sm -mt-0.5">@{user.username}</p>
                        </div>
                        {auth.currentUser && auth.currentUser.uid !== user.uid && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleFollowToggle(user.uid);
                            }}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300
                              ${following.has(user.uid)
                                ? 'bg-white/20 text-white hover:bg-white/30'
                                : 'bg-white/10 text-white hover:bg-white/20'
                              }`}
                          >
                            {following.has(user.uid) ? 'Unfollow' : 'Follow'}
                          </button>
                        )}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center text-white/60 text-lg py-8 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
                    {loading ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    ) : (
                      searchTerm ? "No users found" : ""
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Search; 