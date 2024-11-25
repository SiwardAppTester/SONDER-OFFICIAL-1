import React from "react";
import { Link } from "react-router-dom";
import { Menu, MessageCircle, Home as HomeIcon, Search as SearchIcon, Calendar as CalendarIcon, Plus, Settings } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
}

interface BusinessSidebarProps {
  isNavOpen: boolean;
  setIsNavOpen: (isOpen: boolean) => void;
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  accessibleFestivalsCount: number;
}

const BusinessSidebar: React.FC<BusinessSidebarProps> = ({
  isNavOpen,
  setIsNavOpen,
  user,
  userProfile,
  accessibleFestivalsCount,
}) => {
  const navigate = useNavigate();

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
          {/* Business Profile Section */}
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="flex flex-col items-center mb-4">
              {userProfile?.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt="Business Profile"
                  className="w-16 h-16 rounded-full mb-2"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-2">
                  {userProfile?.displayName?.[0] || user?.email?.[0] || '?'}
                </div>
              )}
              <span className="font-semibold text-gray-800">
                {userProfile?.displayName || 'Business Account'}
              </span>
              <span className="text-sm text-gray-600 mb-2">
                {user?.email}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center mb-4">
              <div className="bg-gray-50 p-2 rounded">
                <div className="font-semibold">
                  {accessibleFestivalsCount}
                </div>
                <div className="text-xs text-gray-500">Active Festivals</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="font-semibold">
                  {userProfile?.followers?.length || 0}
                </div>
                <div className="text-xs text-gray-500">Followers</div>
              </div>
            </div>
          </div>

          {/* Business Navigation Links */}
          <div className="space-y-2">
            <Link
              to="/add-post"
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg w-full"
            >
              <Plus size={20} className="text-gray-600" />
              <span className="text-gray-600">Create Post</span>
            </Link>

            <Link
              to="/business-dashboard"
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg w-full"
            >
              <HomeIcon size={20} className="text-gray-600" />
              <span className="text-gray-600">Dashboard</span>
            </Link>
            
            <Link
              to="/chat"
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg w-full"
            >
              <MessageCircle size={20} className="text-gray-600" />
              <span className="text-gray-600">Messages</span>
            </Link>

            <Link
              to="/business-calendar"
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg w-full"
            >
              <CalendarIcon size={20} className="text-gray-600" />
              <span className="text-gray-600">Calendar</span>
            </Link>

            <Link
              to="/business-settings"
              className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg w-full"
            >
              <Settings size={20} className="text-gray-600" />
              <span className="text-gray-600">Settings</span>
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

export default BusinessSidebar; 