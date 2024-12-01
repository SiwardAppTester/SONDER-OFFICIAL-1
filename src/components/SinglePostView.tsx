import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Post } from '../types';

interface SinglePostViewProps {
  postId: string;
}

const SinglePostView: React.FC<SinglePostViewProps> = ({ postId }) => {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const postDoc = await getDoc(doc(db, "discover_posts", postId));
        if (postDoc.exists()) {
          setPost({ id: postDoc.id, ...postDoc.data() } as Post);
        }
      } catch (error) {
        console.error("Error fetching post:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!post) {
    return <div className="text-center text-gray-500">Post not found</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      {/* Post Header */}
      <div className="flex items-center mb-4">
        {post.userPhotoURL ? (
          <img
            src={post.userPhotoURL}
            alt={post.userDisplayName}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-purple-600 font-medium">
              {post.userDisplayName[0].toUpperCase()}
            </span>
          </div>
        )}
        <div className="ml-3">
          <p className="font-medium">{post.userDisplayName}</p>
          <p className="text-sm text-gray-500">
            {post.createdAt?.toDate().toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Post Content */}
      <p className="text-gray-800 mb-4">{post.text}</p>

      {/* Media Content */}
      {post.mediaFiles && post.mediaFiles.length > 0 && (
        <div className="mb-4 grid gap-2 grid-cols-2">
          {post.mediaFiles.map((media, index) => (
            <div key={index} className="relative rounded-lg overflow-hidden">
              {media.type === 'image' ? (
                <img
                  src={media.url}
                  alt="Post content"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={media.url}
                  controls
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SinglePostView; 