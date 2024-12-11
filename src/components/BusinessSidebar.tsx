import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, MessageCircle, Home as HomeIcon, Search as SearchIcon, Calendar as CalendarIcon, Plus, Settings, ChevronDown, ChevronUp, Camera, Compass, LayoutDashboard } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { doc, updateDoc, getDoc, getDocs, query, where, collection } from "firebase/firestore";
import { db } from "../firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { useUserProfile } from '../contexts/UserProfileContext';
import { User } from 'firebase/auth';

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
  user: User | null;
  userProfile: any;
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
  userProfile: initialUserProfile,
  accessibleFestivalsCount,
}) => {
  const { userProfile, setUserProfile } = useUserProfile();
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
              } as UserDetails;
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
      setUserProfile(userProfile ? { ...userProfile, photoURL: downloadURL } : null);

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
      navigate("/signin");
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
      {/* Desktop Top Bar - Matching Screenshot */}
      <div className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-black shadow-lg z-50">
        <div className="container mx-auto px-4 flex items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link 
              to="/add-post" 
              className="text-2xl font-bold text-white hover:text-white/80 transition-colors duration-300"
            >
              SONDER
            </Link>
          </div>

          {/* Right Side Navigation */}
          <div className="flex items-center space-x-6">
            <Link to="/add-post" className="flex items-center space-x-2 p-2 rounded-lg
              text-white/80 hover:text-white transition-all duration-300 group">
              <HomeIcon size={18} className="group-hover:scale-110 transition-transform duration-300" />
            </Link>
            
            <Link to="/business-dashboard" className="flex items-center space-x-2 p-2 rounded-lg
              text-white/80 hover:text-white transition-all duration-300 group">
              <LayoutDashboard size={18} className="group-hover:scale-110 transition-transform duration-300" />
            </Link>
            
            <Link to="/business-calendar" className="flex items-center space-x-2 p-2 rounded-lg
              text-white/80 hover:text-white transition-all duration-300 group">
              <CalendarIcon size={18} className="group-hover:scale-110 transition-transform duration-300" />
            </Link>
            
            <Link to="/chat" className="flex items-center space-x-2 p-2 rounded-lg
              text-white/80 hover:text-white transition-all duration-300 group">
              <MessageCircle size={18} className="group-hover:scale-110 transition-transform duration-300" />
            </Link>
            
            <Link to="/search" className="flex items-center space-x-2 p-2 rounded-lg
              text-white/80 hover:text-white transition-all duration-300 group">
              <SearchIcon size={18} className="group-hover:scale-110 transition-transform duration-300" />
            </Link>
            
            <Link to="/discover" className="flex items-center space-x-2 p-2 rounded-lg
              text-white/80 hover:text-white transition-all duration-300 group">
              <Compass size={18} className="group-hover:scale-110 transition-transform duration-300" />
            </Link>

            {/* Profile Section */}
            {localPhotoURL ? (
              <img
                src={localPhotoURL}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => navigate('/business-settings')}
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center
                          text-sm font-medium text-white cursor-pointer hover:bg-white/20 transition-colors"
                onClick={() => navigate('/business-settings')}
              >
                {userProfile?.displayName?.[0] || user?.email?.[0] || '?'}
              </div>
            )}

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-white font-medium
                hover:bg-zinc-700 transition-all duration-300"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`md:hidden fixed top-0 left-0 h-full w-[280px] bg-black shadow-lg transform 
                      transition-transform duration-300 ease-in-out z-50 flex flex-col ${
        isNavOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header with close button */}
        <div className="p-4 flex justify-end items-center border-b border-white/10">
          <button
            onClick={() => setIsNavOpen(false)}
            className="relative group w-10 h-10 flex items-center justify-center 
                      bg-white/10 backdrop-blur-sm rounded-full
                      transition-all duration-300 transform
                      hover:scale-105 hover:bg-white/20"
          >
            <svg 
              className="w-5 h-5 text-white transition-transform duration-300 
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

        {/* Main Content - Fixed Height with Flex */}
        <div className="flex flex-col h-[calc(100%-73px)] justify-between px-4 py-6">
          {/* Top Section with Navigation */}
          <div>
            {/* Navigation Links */}
            <div className="space-y-2">
              {[
                { to: "/add-post", icon: HomeIcon, label: "Home" },
                { to: "/business-dashboard", icon: LayoutDashboard, label: "Dashboard" },
                { to: "/business-calendar", icon: CalendarIcon, label: "Calendar" },
                { to: "/chat", icon: MessageCircle, label: "Messages" },
                { to: "/search", icon: SearchIcon, label: "Search" },
                { to: "/discover", icon: Compass, label: "Discover" }
              ].map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setIsNavOpen(false)}
                  className="flex items-center space-x-3 p-4 rounded-xl
                    bg-white/10 backdrop-blur-sm hover:bg-white/20 
                    transition-all duration-300 group"
                >
                  <Icon size={20} className="text-white group-hover:scale-110 transition-transform duration-300" />
                  <span className="text-white/90 font-medium">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Sign Out Button - Always at Bottom */}
          <div className="pt-4">
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-3 rounded-xl bg-white/10 text-white/90 font-medium
                transition-all duration-300 hover:bg-white/20 active:scale-95
                border border-white/20"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isNavOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsNavOpen(false)}
        />
      )}

      {/* Spacer for Desktop */}
      <div className="hidden md:block h-16" />
    </>
  );
};

export default BusinessSidebar; 