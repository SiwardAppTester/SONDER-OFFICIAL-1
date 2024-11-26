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
      <div className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
        isNavOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Close button */}
        <div className="p-1 flex justify-end">
          <button
            onClick={() => setIsNavOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        {/* Profile Section */}
        <div className="px-4 -mt-2">
          <div className="flex flex-col items-center mb-2">
            <div className="relative">
              {localPhotoURL ? (
                <img
                  src={localPhotoURL}
                  alt="Profile"
                  className="w-14 h-14 rounded-full mb-1"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center mb-1">
                  {userProfile?.displayName?.[0] || user?.email?.[0] || '?'}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-0 bg-gray-800 rounded-full p-1 hover:bg-gray-700 transition-colors"
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
            <span className="text-sm text-gray-600 mb-1">
              {userProfile?.displayName || user?.email}
            </span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 text-center mb-2 stats-grid">
            <div 
              className={`bg-gray-50 p-2 rounded cursor-pointer transition-colors ${
                openDropdown === 'followers' ? 'bg-blue-50' : 'hover:bg-gray-100'
              }`}
              onClick={() => toggleDropdown('followers')}
            >
              <div className="font-semibold flex items-center justify-center gap-1">
                {userProfile?.followers?.length || 0}
                {openDropdown === 'followers' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
              <div className="text-xs text-gray-500">Followers</div>
            </div>

            <div 
              className={`bg-gray-50 p-2 rounded cursor-pointer transition-colors ${
                openDropdown === 'following' ? 'bg-blue-50' : 'hover:bg-gray-100'
              }`}
              onClick={() => toggleDropdown('following')}
            >
              <div className="font-semibold flex items-center justify-center gap-1">
                {userProfile?.following?.length || 0}
                {openDropdown === 'following' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
              <div className="text-xs text-gray-500">Following</div>
            </div>

            <div 
              className={`bg-gray-50 p-2 rounded cursor-pointer transition-colors ${
                openDropdown === 'festivals' ? 'bg-blue-50' : 'hover:bg-gray-100'
              }`}
              onClick={() => toggleDropdown('festivals')}
            >
              <div className="font-semibold flex items-center justify-center gap-1">
                {accessibleFestivalsCount}
                {openDropdown === 'festivals' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
              <div className="text-xs text-gray-500">Festivals</div>
            </div>
          </div>

          {/* Dropdown Content - Only visible when a dropdown is open */}
          {openDropdown && (
            <div className="h-48 border-y border-gray-200">
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

        {/* Navigation Links - Pushed down */}
        <div className="flex-1 px-4 pt-4">
          <div className="space-y-2">
            <Link
              to="/"
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg w-full"
            >
              <HomeIcon size={20} className="text-gray-600" />
              <span className="text-gray-600">Home</span>
            </Link>
            
            <Link
              to="/search"
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg w-full"
            >
              <SearchIcon size={20} className="text-gray-600" />
              <span className="text-gray-600">Search</span>
            </Link>

            <Link
              to="/chat"
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg w-full"
            >
              <MessageCircle size={20} className="text-gray-600" />
              <span className="text-gray-600">Messages</span>
            </Link>

            <Link
              to="/calendar"
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg w-full"
            >
              <CalendarIcon size={20} className="text-gray-600" />
              <span className="text-gray-600">Calendar</span>
            </Link>
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isNavOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsNavOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar; 