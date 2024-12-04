import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, MessageCircle, Home as HomeIcon, Search as SearchIcon, Calendar as CalendarIcon, Plus, Settings, ChevronDown, ChevronUp, Camera } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, getDoc, getDocs, query, where, collection } from "firebase/firestore";
import { db } from "../firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";

interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
  accessibleFestivals?: string[];
}

interface BusinessSidebarProps {
  isNavOpen: boolean;
  setIsNavOpen: (isOpen: boolean) => void;
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  accessibleFestivalsCount: number;
}

interface Festival {
  id: string;
  name: string;
  festivalName?: string;
  active?: boolean;
}

interface UserDetails {
  id: string;
  username: string;
  displayName?: string;
  photoURL?: string;
}

const BusinessSidebar: React.FC<BusinessSidebarProps> = ({
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
      const isToggleButton = target.closest('.stats-grid-item');
      const isInsideSidebar = target.closest('.business-sidebar');
      
      if (isInsideSidebar || target.closest('.dropdown-content') || isToggleButton) {
        return;
      }
      
      setOpenDropdown(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const fetchFestivalDetails = async () => {
      if (!user?.uid) return;
      
      try {
        const [userIdSnapshot, ownerIdSnapshot] = await Promise.all([
          getDocs(
            query(
              collection(db, "festivals"),
              where("userId", "==", user.uid),
              where("active", "==", true)
            )
          ),
          getDocs(
            query(
              collection(db, "festivals"),
              where("ownerId", "==", user.uid),
              where("active", "==", true)
            )
          )
        ]);
        
        const festivals = [...userIdSnapshot.docs, ...ownerIdSnapshot.docs]
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.festivalName || data.name || 'Unnamed Festival',
              active: data.active
            };
          })
          .filter((festival, index, self) => 
            index === self.findIndex(f => f.id === festival.id) && 
            festival.name !== 'Unnamed Festival' &&
            festival.active === true
          );
        
        setFestivalDetails(festivals);
      } catch (error) {
        console.error("Error fetching festival details:", error);
      }
    };

    fetchFestivalDetails();
  }, [user?.uid]);

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
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        photoURL: downloadURL
      });

      setLocalPhotoURL(downloadURL);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          photoURL: downloadURL
        });
      }
    } catch (error) {
      console.error("Error updating profile image:", error);
    }
  };

  const toggleDropdown = (dropdown: 'followers' | 'following' | 'festivals') => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    if (isNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isNavOpen]);

  return (
    <>
      {/* Desktop Top Bar */}
      <div className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-rose-50 to-rose-100 shadow-lg z-50">
        <div className="container mx-auto px-4 flex items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-4">
            <span className="text-xl font-bold text-purple-600">Business Dashboard</span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            {[
              { to: "/add-post", icon: Plus, label: "Create Post" },
              { to: "/discover", icon: SearchIcon, label: "Discover" },
              { to: "/business-dashboard", icon: HomeIcon, label: "Dashboard" },
              { to: "/chat", icon: MessageCircle, label: "Messages" },
              { to: "/business-calendar", icon: CalendarIcon, label: "Calendar" }
            ].map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center space-x-2 p-2 rounded-lg
                  hover:bg-white/70 transition-all duration-300 group"
              >
                <Icon size={18} className="text-purple-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-gray-800 font-medium">{label}</span>
              </Link>
            ))}
          </div>

          {/* Profile Section */}
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <div 
                className="cursor-pointer flex items-center space-x-2"
                onClick={() => toggleDropdown('followers')}
              >
                {localPhotoURL ? (
                  <img
                    src={localPhotoURL}
                    alt="Profile"
                    className="w-10 h-10 rounded-full shadow-lg hover:shadow-purple-500/50 
                             transition-all duration-300 object-cover border-2 border-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white shadow-lg hover:shadow-purple-500/50 
                                transition-all duration-300 flex items-center justify-center
                                text-xl font-semibold text-purple-600">
                    {userProfile?.displayName?.[0] || user?.email?.[0] || '?'}
                  </div>
                )}
                <span className="text-gray-800 font-medium">
                  {userProfile?.displayName || 'Business Account'}
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold
                transition-all duration-300 hover:bg-purple-700 active:scale-95"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar - keeping the existing sidebar code but only showing on mobile */}
      <div className={`md:hidden business-sidebar fixed top-0 left-0 h-full w-80 bg-gradient-to-b from-rose-50 to-rose-100 shadow-lg transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
        isNavOpen ? 'translate-x-0' : '-translate-x-full'
      } overflow-y-auto overflow-x-hidden`}>
        {/* Close button */}
        <div className="p-3 flex justify-end">
          <button
            onClick={() => setIsNavOpen(false)}
            className="relative group w-10 h-10 flex items-center justify-center 
                      bg-white/60 backdrop-blur-sm rounded-xl
                      transition-all duration-300 transform
                      hover:scale-105 hover:bg-white/80
                      hover:shadow-lg hover:shadow-purple-500/20"
          >
            <svg 
              className="w-5 h-5 text-purple-600 transition-transform duration-300 
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

        {/* Enhanced Profile Section */}
        <div className="px-6 -mt-2">
          <div className="flex flex-col items-center mb-6">
            <div className="relative transform hover:scale-105 transition-all duration-300">
              {localPhotoURL ? (
                <img
                  src={localPhotoURL}
                  alt="Profile"
                  className="w-24 h-24 rounded-full mb-3 shadow-lg hover:shadow-purple-500/50 
                           transition-all duration-300 object-cover border-2 border-white"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white shadow-lg hover:shadow-purple-500/50 
                              transition-all duration-300 flex items-center justify-center mb-3
                              text-2xl font-semibold text-purple-600">
                  {userProfile?.displayName?.[0] || user?.email?.[0] || '?'}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-3 right-0 bg-purple-600 rounded-full p-2 
                         hover:bg-purple-700 transition-colors shadow-lg
                         hover:scale-110 transform duration-300"
                aria-label="Change profile picture"
              >
                <Camera size={14} className="text-white" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            <span className="text-gray-800 font-semibold text-lg">
              {userProfile?.displayName || 'Business Account'}
            </span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 text-center mb-4 stats-grid px-4">
            {[
              { label: 'Followers', count: userProfile?.followers?.length || 0, type: 'followers' as const },
              { label: 'Following', count: userProfile?.following?.length || 0, type: 'following' as const },
              { label: 'Festivals', count: accessibleFestivalsCount, type: 'festivals' as const }
            ].map(({ label, count, type }) => (
              <div 
                key={type}
                className={`stats-grid-item bg-white/80 backdrop-blur-sm p-2 rounded-lg cursor-pointer
                  transition-all duration-300 border border-transparent
                  ${openDropdown === type 
                    ? 'shadow-md shadow-purple-500/20 scale-105 border-purple-200' 
                    : 'hover:scale-105 hover:shadow-md hover:shadow-purple-500/10'}
                  transform`}
                onClick={() => toggleDropdown(type)}
              >
                <div className="flex flex-col items-center">
                  <span className="text-base font-bold text-gray-800">{count}</span>
                  <span className="text-xs text-gray-600 font-medium">{label}</span>
                  <div className="mt-0.5">
                    {openDropdown === type 
                      ? <ChevronUp size={12} className="text-purple-500" /> 
                      : <ChevronDown size={12} className="text-purple-500" />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Enhanced Dropdown Content */}
          {openDropdown && (
            <div 
              className="dropdown-content h-28 border border-purple-100 bg-white/40 backdrop-blur-sm 
                        rounded-xl mb-4 shadow-inner overflow-hidden"
            >
              <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-purple-200 
                            scrollbar-track-transparent py-2">
                {openDropdown === 'followers' && followersDetails.length > 0 && (
                  <div className="h-full overflow-y-auto py-1 px-2">
                    {followersDetails.map((follower) => (
                      <Link
                        key={follower.id}
                        to={`/profile/${follower.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(null);
                          setIsNavOpen(false);
                        }}
                        className="block py-2 px-2 hover:bg-white/80 text-sm text-gray-700 rounded-lg 
                                  transition-all duration-300 group
                                  hover:shadow-sm border border-purple-100/50
                                  bg-white/40 overflow-hidden cursor-pointer"
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
                  <div className="h-full overflow-y-auto py-1 px-2">
                    {followingDetails.map((following) => (
                      <Link
                        key={following.id}
                        to={`/profile/${following.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(null);
                          setIsNavOpen(false);
                        }}
                        className="block py-2 px-2 hover:bg-white/80 text-sm text-gray-700 rounded-lg 
                                  transition-all duration-300 group
                                  hover:shadow-sm border border-purple-100/50
                                  bg-white/40 overflow-hidden cursor-pointer"
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
                  <div className="h-full overflow-y-auto py-1 px-2">
                    {festivalDetails.map((festival) => (
                      <Link
                        key={festival.id}
                        to={`/festival/${festival.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(null);
                          setIsNavOpen(false);
                        }}
                        className="block py-2 px-2 hover:bg-white/80 text-sm text-gray-700 rounded-lg 
                                  transition-all duration-300 group
                                  hover:shadow-sm border border-purple-100/50
                                  bg-white/40 overflow-hidden cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span>{festival.name}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {isNavOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsNavOpen(false)}
        />
      )}

      {/* Spacer for content below the fixed top bar on desktop */}
      <div className="hidden md:block h-16" />
    </>
  );
};

export default BusinessSidebar; 