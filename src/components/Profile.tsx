import React, { useState, useEffect, Suspense } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import { User as FirebaseUser } from "firebase/auth";
import { collection, query, where, orderBy, onSnapshot, getDocs } from "firebase/firestore";
import { Heart, MessageCircle } from "lucide-react";
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';

interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
  accessibleFestivals?: string[];
  fullName?: string;
  username?: string;
}

// Add Post interface
interface Post {
  id: string;
  text: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  createdAt: any;
  likes: string[];
  comments: Comment[];
  mediaFiles?: MediaFile[];
}

interface Comment {
  id: string;
  text: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  createdAt: any;
  likes: string[];
}

interface MediaFile {
  url: string;
  type: "image" | "video";
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

const Profile: React.FC = () => {
  const { userId } = useParams();
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [accessibleFestivals, setAccessibleFestivals] = useState<Set<string>>(new Set());
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeFestivalsCount, setActiveFestivalsCount] = useState(0);

  useEffect(() => {
    // Fetch the profile user's data
    const fetchProfileUser = async () => {
      if (!userId) return;
      
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        setProfileUser(userData);
        // Set accessible festivals from the profile user's data
        setAccessibleFestivals(new Set(userData.accessibleFestivals || []));
      }
    };

    fetchProfileUser();
  }, [userId]);

  useEffect(() => {
    // Set up auth listener for current user
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Check if current user is following the profile user
    if (currentUser && profileUser && profileUser.followers) {
      setIsFollowing(profileUser.followers.includes(currentUser.uid));
      setFollowersCount(profileUser.followers.length);
    }
  }, [currentUser, profileUser]);

  useEffect(() => {
    if (!userId) return;

    const postsQuery = query(
      collection(db, "discover_posts"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    const fetchActiveFestivals = async () => {
      if (!userId) return;
      
      try {
        // Get user's document to check accessibleFestivals
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          const accessibleFestivalIds = userData.accessibleFestivals || [];
          
          // Fetch all accessible festivals
          if (accessibleFestivalIds.length > 0) {
            const festivalsSnapshot = await getDocs(collection(db, "festivals"));
            
            const accessibleFestivals = festivalsSnapshot.docs
              .filter(doc => {
                // Only include festivals that are in the user's accessibleFestivals array
                return accessibleFestivalIds.includes(doc.id);
              })
              .map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  name: data.name || data.festivalName || 'Unnamed Festival'
                };
              });
            
            setActiveFestivalsCount(accessibleFestivals.length);
          } else {
            setActiveFestivalsCount(0);
          }
        }
      } catch (error) {
        console.error("Error fetching festivals count:", error);
      }
    };

    fetchActiveFestivals();
  }, [userId]);

  const handleFollowToggle = async () => {
    if (!currentUser || !profileUser || !userId) return;

    try {
      const profileUserRef = doc(db, "users", userId);
      const currentUserRef = doc(db, "users", currentUser.uid);

      if (isFollowing) {
        // Unfollow
        await updateDoc(profileUserRef, {
          followers: arrayRemove(currentUser.uid)
        });
        await updateDoc(currentUserRef, {
          following: arrayRemove(userId)
        });
        setFollowersCount(prev => prev - 1);
      } else {
        // Follow
        await updateDoc(profileUserRef, {
          followers: arrayUnion(currentUser.uid)
        });
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId)
        });
        setFollowersCount(prev => prev + 1);
      }

      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error("Error updating follow status:", error);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
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

      {/* Main Content */}
      <div className="relative z-10 min-h-screen">
        {/* Navigation */}
        <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/20 border-b border-white/10">
          <div className="flex justify-between items-center p-4 max-w-7xl mx-auto">
            <button
              onClick={() => setIsNavOpen(!isNavOpen)}
              className="text-white/90 hover:text-white transition-colors duration-300"
              aria-label="Toggle navigation menu"
            >
              <Menu size={28} />
            </button>
          </div>
        </div>

        <Sidebar
          isNavOpen={isNavOpen}
          setIsNavOpen={setIsNavOpen}
          user={currentUser}
          userProfile={userProfile}
          accessibleFestivalsCount={accessibleFestivals.size}
          className="z-50"
        />

        {!profileUser ? (
          <div className="text-center p-4 text-white/90 font-['Space_Grotesk']">Loading...</div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 pt-20 pb-12 relative z-10">
            {/* Profile Header Section */}
            <div className="mb-12 backdrop-blur-xl bg-white/5 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.3)] 
                            border border-white/10 overflow-hidden">
              {/* Background Pattern */}
              <div className="h-48 bg-gradient-to-b from-white/5 to-transparent 
                              relative overflow-hidden">
                <div className="absolute inset-0 backdrop-blur-3xl mix-blend-overlay opacity-30">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
                </div>
              </div>

              <div className="px-8 pb-8 -mt-24">
                <div className="flex flex-col items-center">
                  {/* Profile Image */}
                  <div className="relative mb-8">
                    {profileUser.photoURL ? (
                      <img
                        src={profileUser.photoURL}
                        alt={profileUser.fullName || profileUser.displayName}
                        className="w-36 h-36 rounded-xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] 
                                  object-cover transform hover:scale-105 transition-all duration-500
                                  backdrop-blur-sm"
                      />
                    ) : (
                      <div className="w-36 h-36 rounded-xl bg-white/5 backdrop-blur-sm
                                    flex items-center justify-center text-4xl font-bold text-white/80
                                    border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)]
                                    transform hover:scale-105 transition-all duration-500">
                        {profileUser.fullName?.[0] || profileUser.username?.[0] || '?'}
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="text-center mb-12">
                    <h1 className="text-4xl font-['Space_Grotesk'] tracking-[0.2em] text-white/90 mb-4">
                      {profileUser.fullName || 'Anonymous User'}
                    </h1>
                    <p className="text-xl text-white/50 font-['Space_Grotesk'] tracking-[0.15em]">
                      @{profileUser.username || 'anonymous'}
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className="w-full max-w-4xl mx-auto grid grid-cols-3 gap-2 mb-12">
                    {[
                      { label: 'FOLLOWERS', value: followersCount },
                      { label: 'FOLLOWING', value: profileUser.following?.length || 0 },
                      { label: 'FESTIVALS', value: activeFestivalsCount }
                    ].map((stat, index) => (
                      <div 
                        key={index} 
                        className="group relative backdrop-blur-sm"
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent 
                                      rounded-xl transition-all duration-500 opacity-0 
                                      group-hover:opacity-100" />
                        <div className="p-6 text-center relative border border-white/10 rounded-xl
                                      transition-all duration-500 hover:border-white/20">
                          <div className="text-3xl font-light text-white/90 mb-3 font-['Space_Grotesk']">
                            {stat.value}
                          </div>
                          <div className="text-sm text-white/50 font-['Space_Grotesk'] tracking-[0.2em]">
                            {stat.label}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Follow Button */}
                  {currentUser && currentUser.uid !== userId && (
                    <button
                      onClick={handleFollowToggle}
                      className={`relative overflow-hidden px-12 py-4 rounded-xl 
                                font-['Space_Grotesk'] tracking-[0.3em] text-lg
                                transition-all duration-500 border
                                ${isFollowing 
                                  ? 'border-white/20 text-white/70 hover:border-white/30' 
                                  : 'border-white/20 text-white/90 hover:border-white/30'
                                }
                                transform hover:scale-105 active:scale-95
                                backdrop-blur-sm bg-white/5
                                hover:bg-white/10`}
                    >
                      {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Posts Section */}
            <div className="space-y-6">
              <h2 className="text-2xl font-['Space_Grotesk'] tracking-[0.1em] text-white/90 mb-6 pl-2">
                Posts
              </h2>
              
              {posts.length === 0 ? (
                <div className="text-center py-12 backdrop-blur-xl bg-white/10 rounded-2xl 
                              shadow-[0_0_30px_rgba(255,255,255,0.1)] border border-white/20">
                  <p className="text-white/60 font-['Space_Grotesk'] tracking-wider">No posts yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {posts.map((post) => (
                    <div 
                      key={post.id} 
                      className="backdrop-blur-xl bg-white/10 rounded-2xl 
                                shadow-[0_0_30px_rgba(255,255,255,0.1)] border border-white/20 
                                p-4 transition-all duration-300 hover:border-white/30
                                flex flex-col h-full"
                    >
                      {/* Post Text - with text truncation */}
                      <p className="text-white/90 mb-3 font-['Space_Grotesk'] tracking-wide 
                                  line-clamp-3 text-sm">
                        {post.text}
                      </p>

                      {/* Media Grid - smaller and more compact */}
                      {post.mediaFiles && post.mediaFiles.length > 0 && (
                        <div className="grid gap-2 mb-3 grid-cols-2 flex-1">
                          {post.mediaFiles.slice(0, 4).map((media, index) => (
                            <div 
                              key={index} 
                              className="relative aspect-square rounded-lg overflow-hidden 
                                        border border-white/20"
                            >
                              {media.type === 'video' ? (
                                <video
                                  src={media.url}
                                  controls
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <img
                                  src={media.url}
                                  alt={`Post content ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                          ))}
                          {post.mediaFiles.length > 4 && (
                            <div className="absolute bottom-2 right-2 bg-black/50 text-white/90 
                                          text-xs px-2 py-1 rounded-full">
                              +{post.mediaFiles.length - 4}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Interaction Bar - more compact */}
                      <div className="flex items-center gap-4 text-white/60 text-sm mt-auto pt-2">
                        <div className="flex items-center gap-1.5 hover:text-white transition-colors 
                                      duration-300 cursor-pointer">
                          <Heart size={16} className={post.likes.includes(currentUser?.uid || '') 
                            ? "fill-white text-white" 
                            : ""} 
                          />
                          <span className="font-['Space_Grotesk']">{post.likes.length}</span>
                        </div>
                        <div className="flex items-center gap-1.5 hover:text-white transition-colors 
                                      duration-300 cursor-pointer">
                          <MessageCircle size={16} />
                          <span className="font-['Space_Grotesk']">{post.comments.length}</span>
                        </div>
                        <span className="text-xs ml-auto font-['Space_Grotesk']">
                          {post.createdAt?.toDate().toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile; 