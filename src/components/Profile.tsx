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
import StatsDropdown from './StatsDropdown';

interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
  accessibleFestivals?: string[];
  fullName?: string;
  username?: string;
  userType?: 'regular' | 'business';
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

interface StatItem {
  id: string;
  name: string;
  photoURL?: string;
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
  const [activeDropdown, setActiveDropdown] = useState<'followers' | 'following' | 'festivals' | null>(null);
  const [followersList, setFollowersList] = useState<StatItem[]>([]);
  const [followingList, setFollowingList] = useState<StatItem[]>([]);
  const [festivalsList, setFestivalsList] = useState<StatItem[]>([]);

  useEffect(() => {
    // Fetch the profile user's data
    const fetchProfileUser = async () => {
      if (!userId) return;
      
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        
        // Check if this user has any posts but no userType set
        const postsSnapshot = await getDocs(query(
          collection(db, "discover_posts"),
          where("userId", "==", userId)
        ));
        
        if (postsSnapshot.size > 0 && !userData.userType) {
          // If user has posts but no userType, they should be a business account
          const updatedUserData = {
            ...userData,
            userType: 'business' as const
          };
          await updateDoc(doc(db, "users", userId), {
            userType: 'business'
          });
          setProfileUser(updatedUserData);
        } else {
          setProfileUser(userData);
        }
        
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

    console.log("Fetching posts for user:", userId);
    console.log("User type:", profileUser?.userType);

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
      console.log("Fetched posts:", postsData);
      setPosts(postsData);
    });

    return () => unsubscribe();
  }, [userId, profileUser?.userType]);

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

  useEffect(() => {
    const fetchFollowersAndFollowing = async () => {
      if (!profileUser) return;

      // Fetch followers
      if (profileUser.followers) {
        const followersData = await Promise.all(
          profileUser.followers.map(async (uid) => {
            const userDoc = await getDoc(doc(db, "users", uid));
            const userData = userDoc.data() as UserProfile;
            return {
              id: uid,
              name: userData.fullName || userData.displayName || 'Anonymous User',
              photoURL: userData.photoURL
            };
          })
        );
        setFollowersList(followersData);
      }

      // Fetch following
      if (profileUser.following) {
        const followingData = await Promise.all(
          profileUser.following.map(async (uid) => {
            const userDoc = await getDoc(doc(db, "users", uid));
            const userData = userDoc.data() as UserProfile;
            return {
              id: uid,
              name: userData.fullName || userData.displayName || 'Anonymous User',
              photoURL: userData.photoURL
            };
          })
        );
        setFollowingList(followingData);
      }
    };

    fetchFollowersAndFollowing();
  }, [profileUser]);

  useEffect(() => {
    const fetchFestivals = async () => {
      if (!profileUser?.accessibleFestivals) return;

      const festivalsData = await Promise.all(
        profileUser.accessibleFestivals.map(async (festivalId) => {
          const festivalDoc = await getDoc(doc(db, "festivals", festivalId));
          const festivalData = festivalDoc.data();
          return {
            id: festivalId,
            name: festivalData?.name || festivalData?.festivalName || 'Unnamed Festival',
            photoURL: festivalData?.photoURL
          };
        })
      );
      setFestivalsList(festivalsData);
    };

    fetchFestivals();
  }, [profileUser]);

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

  const setAsBusinessAccount = async () => {
    if (!userId) return;
    
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        userType: 'business'
      });
      console.log("Successfully set as business account");
      // Refresh the profile data
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        setProfileUser({ ...userDoc.data() as UserProfile });
      }
    } catch (error) {
      console.error("Error setting business account:", error);
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
        <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-black/10 border-b border-white/5">
          <div className="flex justify-between items-center p-3 max-w-2xl mx-auto">
            <button
              onClick={() => setIsNavOpen(!isNavOpen)}
              className="text-white/70 hover:text-white transition-colors duration-300"
            >
              <Menu size={24} />
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
          <div className="max-w-2xl mx-auto px-4 pt-16 pb-8 relative z-10">
            {/* Profile Header Section */}
            <div className="mb-8 backdrop-blur-xl bg-white/5 rounded-xl shadow-lg border border-white/10 overflow-hidden">
              {/* Background Pattern */}
              <div className="h-32 bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden">
                <div className="absolute inset-0 backdrop-blur-3xl mix-blend-overlay opacity-30">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
                </div>
              </div>

              <div className="px-6 pb-6 -mt-16">
                <div className="flex flex-col items-center">
                  {/* Profile Image */}
                  <div className="relative mb-6">
                    {profileUser.photoURL ? (
                      <img
                        src={profileUser.photoURL}
                        alt={profileUser.fullName || profileUser.displayName}
                        className="w-24 h-24 rounded-lg border border-white/10 shadow-lg 
                                object-cover transform hover:scale-105 transition-all duration-500
                                backdrop-blur-sm"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-white/5 backdrop-blur-sm
                                  flex items-center justify-center text-2xl font-bold text-white/80
                                  border border-white/10 shadow-lg
                                  transform hover:scale-105 transition-all duration-500">
                        {profileUser.fullName?.[0] || profileUser.username?.[0] || '?'}
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-['Space_Grotesk'] tracking-[0.15em] text-white/90 mb-2">
                      {profileUser.fullName || 'Anonymous User'}
                    </h1>
                    <p className="text-sm text-white/50 font-['Space_Grotesk'] tracking-[0.1em]">
                      @{profileUser.username || 'anonymous'}
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className="w-full grid grid-cols-3 gap-2 mb-8">
                    {[
                      { label: 'FOLLOWERS', value: followersCount, onClick: () => setActiveDropdown('followers') },
                      { label: 'FOLLOWING', value: profileUser.following?.length || 0, onClick: () => setActiveDropdown('following') },
                      { label: 'FESTIVALS', value: activeFestivalsCount, onClick: () => setActiveDropdown('festivals') }
                    ].map((stat, index) => (
                      <div key={index} className="group relative backdrop-blur-sm">
                        <button
                          onClick={stat.onClick}
                          className="w-full p-3 text-center relative border border-white/10 rounded-lg
                                    transition-all duration-500 hover:border-white/20"
                        >
                          <div className="text-xl font-light text-white/90 mb-1 font-['Space_Grotesk']">
                            {stat.value}
                          </div>
                          <div className="text-xs text-white/50 font-['Space_Grotesk'] tracking-[0.1em]">
                            {stat.label}
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add the StatsDropdown components */}
                  <StatsDropdown
                    isOpen={activeDropdown === 'followers'}
                    onClose={() => setActiveDropdown(null)}
                    items={followersList}
                    title="Followers"
                  />
                  <StatsDropdown
                    isOpen={activeDropdown === 'following'}
                    onClose={() => setActiveDropdown(null)}
                    items={followingList}
                    title="Following"
                  />
                  <StatsDropdown
                    isOpen={activeDropdown === 'festivals'}
                    onClose={() => setActiveDropdown(null)}
                    items={festivalsList}
                    title="Festivals"
                  />

                  {/* Follow Button */}
                  {currentUser && currentUser.uid !== userId && (
                    <button
                      onClick={handleFollowToggle}
                      className={`px-8 py-2 rounded-lg 
                                font-['Space_Grotesk'] tracking-[0.2em] text-sm
                                transition-all duration-500 border
                                ${isFollowing 
                                  ? 'border-white/20 text-white/70' 
                                  : 'border-white/20 text-white/90'
                                }
                                transform hover:scale-105 active:scale-95
                                backdrop-blur-sm bg-white/5
                                hover:bg-white/10`}
                    >
                      {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                    </button>
                  )}

                  {currentUser && currentUser.uid === userId && !profileUser?.userType && (
                    <button
                      onClick={setAsBusinessAccount}
                      className="px-8 py-2 mt-4 rounded-lg 
                                font-['Space_Grotesk'] tracking-[0.2em] text-sm
                                transition-all duration-500 border border-white/20 
                                text-white/90 transform hover:scale-105 active:scale-95
                                backdrop-blur-sm bg-white/5 hover:bg-white/10"
                    >
                      BECOME A BUSINESS ACCOUNT
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Posts Section - Only shown for business accounts */}
            {(profileUser?.userType === 'business') ? (
              <div className="space-y-4">
                <h2 className="text-xl font-['Space_Grotesk'] tracking-[0.1em] text-white/90 mb-4 pl-2">
                  Posts ({posts.length})
                </h2>
                
                {posts.length === 0 ? (
                  <div className="text-center py-8 backdrop-blur-xl bg-white/10 rounded-xl 
                                shadow-lg border border-white/20">
                    <p className="text-white/60 font-['Space_Grotesk'] tracking-wider text-sm">
                      No posts yet
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {posts.map((post) => (
                      <div 
                        key={post.id} 
                        className="backdrop-blur-xl bg-white/10 rounded-2xl 
                                  shadow-[0_0_30px_rgba(255,255,255,0.1)] border border-white/20 
                                  p-4 transition-all duration-300 hover:border-white/30
                                  flex flex-col h-full"
                      >
                        {/* Post Text */}
                        <p className="text-white/90 mb-3 font-['Space_Grotesk'] tracking-wide 
                                    line-clamp-3 text-sm">
                          {post.text}
                        </p>

                        {/* Media Grid */}
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

                        {/* Interaction Bar */}
                        <div className="flex items-center gap-4 text-white/60 text-sm mt-auto pt-2">
                          <div className="flex items-center gap-1.5 hover:text-white transition-colors 
                                        duration-300 cursor-pointer">
                            <Heart 
                              size={16} 
                              className={post.likes.includes(currentUser?.uid || '') 
                                ? "fill-white text-white" 
                                : ""
                              } 
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
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile; 