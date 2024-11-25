import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { Link, useNavigate } from "react-router-dom";

interface Post {
  id: string;
  text: string;
  mediaUrl: string;
  mediaType: "image" | "video" | null;
}

const Profile: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const postsQuery = query(
          collection(db, "posts"),
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc"),
        );

        const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
          const newPosts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Post[];
          setPosts(newPosts);
        });

        return () => unsubscribePosts();
      } else {
        setPosts([]);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!user) {
    return (
      <div className="profile p-4">
        <h2 className="text-2xl font-bold mb-4 text-center">Profile</h2>
        <p>Please sign in to view your profile.</p>
        <Link
          to="/signin"
          className="bg-blue-500 text-white px-4 py-2 rounded mt-4 inline-block"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="profile p-4">
      <h2 className="text-2xl font-bold mb-4 text-center">Your Profile</h2>
      <div className="mx-auto max-w-2xl">
        <button
          onClick={handleSignOut}
          className="bg-red-500 text-white px-4 py-2 rounded mb-4"
        >
          Sign Out
        </button>
        <h3 className="text-xl font-semibold mb-2">Your Posts</h3>
        {posts.map((post) => (
          <div
            key={post.id}
            className="post bg-white shadow-md rounded-lg p-4 mb-4"
          >
            <div className="media-container mb-4">
              {post.mediaUrl && post.mediaType === 'image' && (
                <img
                  src={post.mediaUrl}
                  alt="Post"
                  className="w-full max-h-96 object-contain rounded-lg"
                />
              )}
              {post.mediaUrl && post.mediaType === 'video' && (
                <video
                  src={post.mediaUrl}
                  className="w-full max-h-96 object-contain rounded-lg"
                  controls
                />
              )}
            </div>
            <p className="text-gray-800">{post.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Profile;
