import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, auth } from "../firebase";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import { User as FirebaseUser } from "firebase/auth";

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

const Profile: React.FC = () => {
  const { userId } = useParams();
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [accessibleFestivals, setAccessibleFestivals] = useState<Set<string>>(new Set());
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

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
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-rose-100">
      {/* Navigation */}
      <div className="flex justify-between items-center p-4">
        <button
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="text-purple-600 hover:text-purple-700 transition-colors duration-300"
          aria-label="Toggle navigation menu"
        >
          <Menu size={28} />
        </button>
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
        <div className="text-center p-4">Loading...</div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 mt-8 md:mt-12 relative">
          {/* Animated background elements */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute w-64 md:w-96 h-64 md:h-96 bg-white rounded-full blur-3xl opacity-20 -top-20 -left-20 animate-pulse"></div>
            <div className="absolute w-64 md:w-96 h-64 md:h-96 bg-white rounded-full blur-3xl opacity-20 -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>

          {/* Profile Card */}
          <div className="bg-white/80 backdrop-blur-sm p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100 relative z-10">
            <div className="flex flex-col items-center">
              {profileUser.photoURL ? (
                <img
                  src={profileUser.photoURL}
                  alt={profileUser.fullName || profileUser.displayName}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full mb-4 md:mb-6 border-4 border-purple-100 shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-purple-100 flex items-center justify-center mb-4 md:mb-6 text-2xl md:text-3xl font-bold text-purple-600">
                  {profileUser.fullName?.[0] || profileUser.username?.[0] || '?'}
                </div>
              )}

              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2 text-center">
                {profileUser.fullName || 'Anonymous User'}
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-4 md:mb-6 text-center">@{profileUser.username || 'anonymous'}</p>

              {/* Follow Button */}
              {currentUser && currentUser.uid !== userId && (
                <button
                  onClick={handleFollowToggle}
                  className={`w-full md:w-auto px-6 md:px-8 py-2.5 md:py-3 rounded-full text-base md:text-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                    isFollowing
                      ? 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200'
                  }`}
                >
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 md:gap-6 mt-8 md:mt-12">
              {[
                { label: 'Followers', value: followersCount },
                { label: 'Following', value: profileUser.following?.length || 0 },
                { label: 'Festivals', value: profileUser?.accessibleFestivals?.length || 0 }
              ].map((stat, index) => (
                <div key={index} className="bg-white/90 p-4 md:p-6 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]">
                  <div className="text-xl md:text-3xl font-bold text-purple-600 mb-1 md:mb-2 text-center">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 font-medium text-sm md:text-base text-center">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile; 