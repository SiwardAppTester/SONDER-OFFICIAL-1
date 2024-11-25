import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, MessageCircle, Home as HomeIcon, Search as SearchIcon, Calendar as CalendarIcon, Camera } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { signOut, updateProfile } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
  accessibleFestivals?: string[];
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

  useEffect(() => {
    setLocalPhotoURL(userProfile?.photoURL);
  }, [userProfile?.photoURL]);

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

  return (
    <>
      {/* Navigation Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
          isNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button */}
        <div className="p-4 flex justify-end">
          <button
            onClick={() => setIsNavOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        {/* Main content area */}
        <div className="flex-1 px-4">
          {/* User Profile Section */}
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="flex flex-col items-center mb-4">
              <div className="relative">
                {localPhotoURL ? (
                  <img
                    src={localPhotoURL}
                    alt="Profile"
                    className="w-16 h-16 rounded-full mb-2"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-2">
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
              <span className="text-sm text-gray-600 mb-2">
                {userProfile?.displayName || user?.email}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <div className="bg-gray-50 p-2 rounded">
                <div className="font-semibold">
                  {userProfile?.followers?.length || 0}
                </div>
                <div className="text-xs text-gray-500">Followers</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="font-semibold">
                  {userProfile?.following?.length || 0}
                </div>
                <div className="text-xs text-gray-500">Following</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="font-semibold">
                  {accessibleFestivalsCount}
                </div>
                <div className="text-xs text-gray-500">Festivals</div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
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

        {/* Sign Out Button - Positioned at bottom */}
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