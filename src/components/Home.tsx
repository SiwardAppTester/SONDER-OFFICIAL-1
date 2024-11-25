import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

interface Post {
  id: string;
  text: string;
  mediaFiles: {
    url: string;
    type: "image" | "video";
  }[];
  userId: string;
  createdAt: any;
}

const Home: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      try {
        const newPosts = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            text: data.text || "",
            mediaFiles: data.mediaFiles || [],
            userId: data.userId || "",
            createdAt: data.createdAt,
          } as Post;
        });
        setPosts(newPosts);
        setLoadingError(null);
      } catch (error) {
        console.error("Error processing posts:", error);
        setLoadingError("Error loading posts");
      }
    }, (error) => {
      console.error("Error fetching posts:", error);
      setLoadingError("Error loading posts");
    });

    return () => unsubscribe();
  }, []);

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

  return (
    <div className="home p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Home Feed</h1>
      <div className="max-w-2xl mx-auto">
        {loadingError && (
          <div className="text-red-500 text-center mb-4">{loadingError}</div>
        )}
        {posts.map((post) => (
          <div
            key={post.id}
            className="post bg-white shadow-md rounded-lg p-4 mb-4"
          >
            <div className="media-container mb-4">
              {post.mediaFiles && post.mediaFiles.map((media, index) => (
                <div key={index} className="relative mb-2">
                  {media.type === 'video' ? (
                    <>
                      <video
                        src={media.url}
                        className="w-full max-h-96 object-contain rounded-lg"
                        controls
                        onError={(e) => {
                          console.error("Video failed to load:", media.url);
                          (e.target as HTMLVideoElement).style.display = 'none';
                        }}
                      />
                      <button
                        onClick={() => handleDownload(media.url, 'video', post.id)}
                        className="absolute bottom-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-lg opacity-80 hover:opacity-100 transition-opacity"
                      >
                        Download
                      </button>
                    </>
                  ) : (
                    <>
                      <img
                        src={media.url}
                        alt={`Post content ${index + 1}`}
                        className="w-full max-h-96 object-contain rounded-lg"
                        onError={(e) => {
                          console.error("Image failed to load:", media.url);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <button
                        onClick={() => handleDownload(media.url, 'image', post.id)}
                        className="absolute bottom-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-lg opacity-80 hover:opacity-100 transition-opacity"
                      >
                        Download
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <p className="text-gray-800">{post.text}</p>
          </div>
        ))}
        {posts.length === 0 && !loadingError && (
          <p className="text-center text-gray-500">No posts yet</p>
        )}
      </div>
    </div>
  );
};

export default Home;
