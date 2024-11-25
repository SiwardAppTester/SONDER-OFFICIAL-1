import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

interface Post {
  id: string;
  text: string;
  mediaUrl: string;
  mediaType: "image" | "video" | null;
}

interface ProfileData {
  displayName: string;
  email: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
}

const Profile: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { userId } = useParams();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        navigate('/signin');
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const targetUserId = userId || user.uid;
    const userRef = doc(db, "users", targetUserId);

    // Fetch user profile data
    const fetchProfileData = async () => {
      try {
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as ProfileData;
          setProfileData({
            displayName: data.displayName || 'Anonymous User',
            email: data.email || '',
            photoURL: data.photoURL,
            followers: data.followers || [],
            following: data.following || [],
          });
          // Check if current user is following this profile
          if (userId && user) {
            const currentUserDoc = await getDoc(doc(db, "users", user.uid));
            const currentUserData = currentUserDoc.data();
            setIsFollowing(currentUserData?.following?.includes(userId) || false);
          }
        } else {
          setProfileData(null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setProfileData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();

    // Fetch user's posts
    const postsQuery = query(
      collection(db, "posts"),
      where("userId", "==", targetUserId),
      orderBy("createdAt", "desc")
    );

    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      const newPosts = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text || "",
          mediaUrl: data.mediaFiles?.[0]?.url || "",
          mediaType: data.mediaFiles?.[0]?.type || null,
          ...data,
        };
      }) as Post[];
      setPosts(newPosts);
    });

    return () => unsubscribePosts();
  }, [user, userId]);

  const handleFollowToggle = async () => {
    if (!user || !profileData || !userId) return;

    const currentUserRef = doc(db, "users", user.uid);
    const targetUserRef = doc(db, "users", userId);

    try {
      if (isFollowing) {
        // Unfollow
        await updateDoc(currentUserRef, {
          following: arrayRemove(userId)
        });
        await updateDoc(targetUserRef, {
          followers: arrayRemove(user.uid)
        });
      } else {
        // Follow
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId)
        });
        await updateDoc(targetUserRef, {
          followers: arrayUnion(user.uid)
        });
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error("Error updating follow status:", error);
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

  const handleDownload = (url: string, mediaType: string, postId: string) => {
    try {
      // Fetch the file first
      fetch(url)
        .then(response => response.blob())
        .then(blob => {
          // Create a blob URL
          const blobUrl = window.URL.createObjectURL(blob);
          
          // Create an anchor element
          const link = document.createElement('a');
          
          // Set the href to the blob URL
          link.href = blobUrl;
          
          // Set download attribute with filename
          const extension = mediaType === 'image' ? 'jpg' : 'mp4';
          link.download = `post_${postId}.${extension}`;
          
          // Append to document, click, and cleanup
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Cleanup blob URL
          window.URL.revokeObjectURL(blobUrl);
        });
    } catch (error) {
      console.error('Error initiating download:', error);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (!profileData) {
    return <div className="p-4 text-center">User not found</div>;
  }

  const isOwnProfile = !userId || userId === user?.uid;

  return (
    <div className="profile p-4">
      <div className="profile-header mb-6 text-center">
        {profileData.photoURL ? (
          <img
            src={profileData.photoURL}
            alt={profileData.displayName}
            className="w-24 h-24 rounded-full mx-auto mb-4"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 mx-auto mb-4 flex items-center justify-center">
            {profileData.displayName ? profileData.displayName[0] : '?'}
          </div>
        )}
        <h2 className="text-2xl font-bold mb-2">{profileData.displayName || 'Anonymous User'}</h2>
        <p className="text-gray-600 mb-4">{profileData.email}</p>
        
        <div className="stats flex justify-center gap-6 mb-4">
          <div className="text-center">
            <div className="font-bold">{profileData.followers?.length || 0}</div>
            <div className="text-gray-600">Followers</div>
          </div>
          <div className="text-center">
            <div className="font-bold">{profileData.following?.length || 0}</div>
            <div className="text-gray-600">Following</div>
          </div>
        </div>

        {!isOwnProfile && user && (
          <button
            onClick={handleFollowToggle}
            className={`px-4 py-2 rounded-full ${
              isFollowing
                ? "bg-gray-200 text-gray-800"
                : "bg-blue-500 text-white"
            }`}
          >
            {isFollowing ? "Unfollow" : "Follow"}
          </button>
        )}

        {isOwnProfile && (
          <button
            onClick={handleSignOut}
            className="bg-red-500 text-white px-4 py-2 rounded mb-4"
          >
            Sign Out
          </button>
        )}
      </div>

      <div className="mx-auto max-w-2xl">
        <h3 className="text-xl font-semibold mb-2">
          {isOwnProfile ? "Your Posts" : `${profileData.displayName}'s Posts`}
        </h3>
        {posts.map((post) => (
          <div
            key={post.id}
            className="post bg-white shadow-md rounded-lg p-4 mb-4"
          >
            <div className="media-container mb-4 relative">
              {post.mediaUrl && post.mediaType === 'image' && (
                <>
                  <img
                    src={post.mediaUrl}
                    alt="Post"
                    className="w-full max-h-96 object-contain rounded-lg"
                  />
                  {isOwnProfile && (
                    <button
                      onClick={() => handleDownload(post.mediaUrl, 'image', post.id)}
                      className="absolute bottom-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-lg opacity-80 hover:opacity-100 transition-opacity"
                    >
                      Download
                    </button>
                  )}
                </>
              )}
              {post.mediaUrl && post.mediaType === 'video' && (
                <>
                  <video
                    src={post.mediaUrl}
                    className="w-full max-h-96 object-contain rounded-lg"
                    controls
                  />
                  {isOwnProfile && (
                    <button
                      onClick={() => handleDownload(post.mediaUrl, 'video', post.id)}
                      className="absolute bottom-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-lg opacity-80 hover:opacity-100 transition-opacity"
                    >
                      Download
                    </button>
                  )}
                </>
              )}
            </div>
            <p className="text-gray-800">{post.text}</p>
          </div>
        ))}
        {posts.length === 0 && (
          <p className="text-center text-gray-500">No posts yet</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
