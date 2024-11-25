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
        setProfileUser(userDoc.data() as UserProfile);
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
    const savedFestivals = localStorage.getItem('accessibleFestivals');
    if (savedFestivals) {
      setAccessibleFestivals(new Set(JSON.parse(savedFestivals)));
    }
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

  if (!profileUser) {
    return <div className="text-center p-4">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="text-gray-700 hover:text-gray-900"
            aria-label="Toggle navigation menu"
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
      />

      <div className="flex-1 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Profile Header */}
            <div className="flex flex-col items-center mb-6">
              {profileUser.photoURL ? (
                <img
                  src={profileUser.photoURL}
                  alt={profileUser.displayName}
                  className="w-24 h-24 rounded-full mb-4"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                  {profileUser.displayName?.[0] || profileUser.email[0]}
                </div>
              )}
              <h1 className="text-2xl font-bold mb-1">
                {profileUser.displayName || 'Anonymous User'}
              </h1>
              <p className="text-gray-600">{profileUser.email}</p>
              
              {/* Add follow button if not viewing own profile */}
              {currentUser && currentUser.uid !== userId && (
                <button
                  onClick={handleFollowToggle}
                  className={`mt-4 px-6 py-2 rounded-full font-semibold ${
                    isFollowing
                      ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-xl font-semibold">
                  {followersCount}
                </div>
                <div className="text-gray-600">Followers</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-xl font-semibold">
                  {profileUser.following?.length || 0}
                </div>
                <div className="text-gray-600">Following</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-xl font-semibold">
                  {accessibleFestivals.size}
                </div>
                <div className="text-gray-600">Festivals</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 