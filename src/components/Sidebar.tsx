import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, MessageCircle, Home as HomeIcon, Search as SearchIcon, Calendar as CalendarIcon, Camera, ChevronDown, ChevronUp } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { signOut, updateProfile } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

interface Festival {
  id: string;
  name: string;
}

interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
  accessibleFestivals?: string[];
}

interface UserDetails {
  id: string;
  username: string;
  displayName?: string;
  photoURL?: string;
}

interface SidebarProps {
  isNavOpen: boolean;
  setIsNavOpen: (isOpen: boolean) => void;
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  accessibleFestivalsCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({
  isNavOpen,
  setIsNavOpen,
  user,
  userProfile,
  accessibleFestivalsCount,
}) => {
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [localPhotoURL, setLocalPhotoURL] = useState<string | undefined>(userProfile?.photoURL);
  const [openDropdown, setOpenDropdown] = useState<'followers' | 'following' | 'festivals' | null>(null);
  const [festivalDetails, setFestivalDetails] = useState<Festival[]>([]);
  const [followersDetails, setFollowersDetails] = useState<UserDetails[]>([]);
  const [followingDetails, setFollowingDetails] = useState<UserDetails[]>([]);

  useEffect(() => {
    setLocalPhotoURL(userProfile?.photoURL);
  }, [userProfile?.photoURL]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.stats-grid')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchFestivalDetails = async () => {
      if (!userProfile?.accessibleFestivals?.length) return;
      
      try {
        const festivals = await Promise.all(
          userProfile.accessibleFestivals.map(async (festivalId) => {
            const festivalDoc = await getDoc(doc(db, "festivals", festivalId));
            if (festivalDoc.exists()) {
              return {
                id: festivalDoc.id,
                name: festivalDoc.data().name || 'Unnamed Festival'
              };
            }
            return null;
          })
        );
        
        setFestivalDetails(festivals.filter((f): f is Festival => f !== null));
      } catch (error) {
        console.error("Error fetching festival details:", error);
      }
    };

    fetchFestivalDetails();
  }, [userProfile?.accessibleFestivals]);

  useEffect(() => {
    const fetchUserDetails = async (userIds: string[], setDetails: (users: UserDetails[]) => void) => {
      if (!userIds.length) return;
      
      try {
        const users = await Promise.all(
          userIds.map(async (userId) => {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return {
                id: userDoc.id,
                username: userData.username || 'anonymous',
                displayName: userData.displayName,
                photoURL: userData.photoURL
              };
            }
            return null;
          })
        );
        
        setDetails(users.filter((u): u is UserDetails => u !== null));
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    };

    if (userProfile?.followers) {
      fetchUserDetails(userProfile.followers, setFollowersDetails);
    }
    if (userProfile?.following) {
      fetchUserDetails(userProfile.following, setFollowingDetails);
    }
  }, [userProfile?.followers, userProfile?.following]);

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `profile_images/${user.uid}`);
      
      // Upload image
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update user profile in Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        photoURL: downloadURL
      });

      // Update local state immediately
      setLocalPhotoURL(downloadURL);

      // Also update Firebase Auth user profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: downloadURL
        });
      }

    } catch (error) {
      console.error("Error updating profile image:", error);
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

  const toggleDropdown = (dropdown: 'followers' | 'following' | 'festivals') => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  return (
    <>
      <div className={`fixed top-0 left-0 h-full w-72 bg-gradient-to-b from-rose-50 to-rose-100 shadow-lg transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
        isNavOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Close button with modern styling */}
        <div className="p-4 flex justify-end">
          <button
            onClick={() => setIsNavOpen(false)}
            className="relative group w-12 h-12 flex items-center justify-center 
                      bg-white/50 backdrop-blur-sm rounded-xl
                      transition-all duration-300 transform
                      hover:scale-105 hover:bg-white/70
                      hover:shadow-lg hover:shadow-purple-500/20"
          >
            <svg 
              className="w-6 h-6 text-purple-600 transition-transform duration-300 
                        group-hover:rotate-180" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Profile Section with new styling */}
        <div className="px-4 -mt-2">
          <div className="flex flex-col items-center mb-4">
            <div className="relative transform hover:scale-105 transition-all duration-300">
              {localPhotoURL ? (
                <img
                  src={localPhotoURL}
                  alt="Profile"
                  className="w-20 h-20 rounded-full mb-2 shadow-lg hover:shadow-purple-500/50 transition-shadow duration-300"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white shadow-lg hover:shadow-purple-500/50 transition-shadow duration-300 flex items-center justify-center mb-2">
                  {userProfile?.displayName?.[0] || user?.email?.[0] || '?'}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-0 bg-purple-600 rounded-full p-2 hover:bg-purple-700 transition-colors shadow-lg"
                aria-label="Change profile picture"
              >
                <Camera size={16} className="text-white" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            <span className="text-gray-800 font-medium">
              {userProfile?.displayName || user?.email}
            </span>
          </div>

          {/* Stats Grid with new styling */}
          <div className="grid grid-cols-3 gap-4 text-center mb-6 stats-grid">
            {[
              { label: 'Followers', count: userProfile?.followers?.length || 0, type: 'followers' as const },
              { label: 'Following', count: userProfile?.following?.length || 0, type: 'following' as const },
              { label: 'Festivals', count: accessibleFestivalsCount, type: 'festivals' as const }
            ].map(({ label, count, type }) => (
              <div 
                key={type}
                className={`bg-white/80 backdrop-blur-sm p-3 rounded-xl cursor-pointer transition-all duration-300 
                  ${openDropdown === type ? 'shadow-purple-500/30 scale-105' : 'hover:scale-105 shadow-lg'}
                  transform hover:shadow-purple-500/30`}
                onClick={() => toggleDropdown(type)}
              >
                <div className="font-semibold flex items-center justify-center gap-1.5 text-gray-800">
                  {count}
                  {openDropdown === type ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
                <div className="text-sm text-gray-600">{label}</div>
              </div>
            ))}
          </div>

          {/* Dropdown Content with new styling */}
          {openDropdown && (
            <div className="h-48 border-y border-white/50 bg-white/30 backdrop-blur-sm rounded-lg mb-4">
              {openDropdown === 'followers' && followersDetails.length > 0 && (
                <div className="h-full overflow-y-auto py-2">
                  {followersDetails.map((follower) => (
                    <Link
                      key={follower.id}
                      to={`/profile/${follower.id}`}
                      className="block py-2 px-2 hover:bg-blue-50 text-sm text-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        {follower.photoURL ? (
                          <img 
                            src={follower.photoURL} 
                            alt={follower.username} 
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                            {follower.username[0].toUpperCase()}
                          </div>
                        )}
                        <span>@{follower.username}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {openDropdown === 'following' && followingDetails.length > 0 && (
                <div className="h-full overflow-y-auto py-2">
                  {followingDetails.map((following) => (
                    <Link
                      key={following.id}
                      to={`/profile/${following.id}`}
                      className="block py-2 px-2 hover:bg-blue-50 text-sm text-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        {following.photoURL ? (
                          <img 
                            src={following.photoURL} 
                            alt={following.username} 
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                            {following.username[0].toUpperCase()}
                          </div>
                        )}
                        <span>@{following.username}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {openDropdown === 'festivals' && festivalDetails.length > 0 && (
                <div className="h-full overflow-y-auto py-2">
                  {festivalDetails.map((festival) => (
                    <Link
                      key={festival.id}
                      to={`/festival/${festival.id}`}
                      className="block py-2 px-2 hover:bg-blue-50 text-sm text-gray-700"
                    >
                      {festival.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Links with new styling */}
        <div className="flex-1 px-4 pt-4">
          <div className="space-y-3">
            {[
              { to: "/", icon: HomeIcon, label: "Home" },
              { to: "/search", icon: SearchIcon, label: "Search" },
              { to: "/chat", icon: MessageCircle, label: "Messages" },
              { to: "/calendar", icon: CalendarIcon, label: "Calendar" }
            ].map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center space-x-4 p-4 bg-white/50 backdrop-blur-sm rounded-xl
                  hover:bg-white/70 transition-all duration-300 transform hover:scale-105
                  hover:shadow-lg hover:shadow-purple-500/20"
              >
                <Icon size={22} className="text-purple-600" />
                <span className="text-gray-800 font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Sign Out Button with new styling */}
        <div className="p-4">
          <button
            onClick={handleSignOut}
            className="w-full px-8 py-4 rounded-full bg-purple-600 text-white font-semibold
              transition-all duration-300 transform hover:scale-105
              shadow-[0_0_20px_rgba(168,85,247,0.5)]
              hover:shadow-[0_0_30px_rgba(168,85,247,0.8)]"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Overlay with blur effect */}
      {isNavOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={() => setIsNavOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar; 