import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, where, getDocs } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

interface Post {
  id: string;
  text: string;
  mediaFiles: {
    url: string;
    type: "image" | "video";
    categoryId?: string;
  }[];
  userId: string;
  createdAt: any;
  festivalId: string;
}

interface Festival {
  id: string;
  name: string;
  accessCode: string;
  categories?: Category[];
}

interface Category {
  id: string;
  name: string;
  mediaType: "both" | "image" | "video";
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [selectedFestival, setSelectedFestival] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedMediaType, setSelectedMediaType] = useState<"all" | "image" | "video">("all");

  useEffect(() => {
    const postsQuery = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        try {
          const newPosts = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              text: data.text || "",
              mediaFiles: data.mediaFiles || [],
              userId: data.userId || "",
              createdAt: data.createdAt,
              festivalId: data.festivalId,
            } as Post;
          });
          setPosts(newPosts);
          setLoadingError(null);
        } catch (error) {
          console.error("Error processing posts:", error);
          setLoadingError("Error loading posts");
        }
      },
      (error) => {
        console.error("Error fetching posts:", error);
        setLoadingError("Error loading posts");
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchFestivals = async () => {
      try {
        const festivalsSnapshot = await getDocs(collection(db, "festivals"));
        const festivalsData = festivalsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Festival[];
        setFestivals(festivalsData);
      } catch (error) {
        console.error("Error fetching festivals:", error);
      }
    };

    fetchFestivals();
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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (selectedFestival && post.festivalId !== selectedFestival) return false;
    
    if (selectedCategory || selectedMediaType !== "all") {
      return post.mediaFiles.some(media => {
        if (selectedCategory && media.categoryId !== selectedCategory) return false;
        if (selectedMediaType !== "all" && media.type !== selectedMediaType) return false;
        return true;
      });
    }
    
    return true;
  });

  return (
    <div className="home p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Home Feed</h1>
        <button
          onClick={handleSignOut}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>

      <div className="max-w-2xl mx-auto mb-6">
        <div className="flex flex-col gap-4 bg-white p-4 rounded-lg shadow-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Festival
            </label>
            <select
              value={selectedFestival}
              onChange={(e) => {
                setSelectedFestival(e.target.value);
                setSelectedCategory(""); // Reset category when festival changes
              }}
              className="w-full p-2 border rounded"
            >
              <option value="">All Festivals</option>
              {festivals.map((festival) => (
                <option key={festival.id} value={festival.id}>
                  {festival.name}
                </option>
              ))}
            </select>
          </div>

          {selectedFestival && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">All Categories</option>
                {festivals
                  .find(f => f.id === selectedFestival)
                  ?.categories?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Media Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMediaType("all")}
                className={`px-4 py-2 rounded ${
                  selectedMediaType === "all"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedMediaType("image")}
                className={`px-4 py-2 rounded ${
                  selectedMediaType === "image"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200"
                }`}
              >
                Images
              </button>
              <button
                onClick={() => setSelectedMediaType("video")}
                className={`px-4 py-2 rounded ${
                  selectedMediaType === "video"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200"
                }`}
              >
                Videos
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {loadingError && (
          <div className="text-red-500 text-center mb-4">{loadingError}</div>
        )}
        
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="post bg-white shadow-md rounded-lg p-4 mb-4"
          >
            <div className="mb-4">
              <div className="text-sm text-gray-500">
                Festival: {festivals.find(f => f.id === post.festivalId)?.name || 'Unknown Festival'}
              </div>
              {post.mediaFiles[0]?.categoryId && (
                <div className="text-sm text-gray-500">
                  Category: {
                    festivals
                      .find(f => f.id === post.festivalId)
                      ?.categories?.find(c => c.id === post.mediaFiles[0].categoryId)
                      ?.name || 'Unknown Category'
                  }
                </div>
              )}
            </div>
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
        {filteredPosts.length === 0 && !loadingError && (
          <p className="text-center text-gray-500">
            {posts.length === 0 ? "No posts yet" : "No posts match the selected filters"}
          </p>
        )}
      </div>
    </div>
  );
};

export default Home;
