import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { Menu, MessageCircle, User, Home as HomeIcon, Search as SearchIcon } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import Sidebar from "./Sidebar";

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

interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
  accessibleFestivals?: string[];
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [selectedFestival, setSelectedFestival] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedMediaType, setSelectedMediaType] = useState<"all" | "image" | "video">("all");
  const [accessibleFestivals, setAccessibleFestivals] = useState<Set<string>>(new Set());
  const [showAccessInput, setShowAccessInput] = useState(true);
  const [generalAccessCode, setGeneralAccessCode] = useState("");
  const [generalAccessError, setGeneralAccessError] = useState<string | null>(null);
  const [showFestivalList, setShowFestivalList] = useState(true);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          setUserProfile(userData);
          setAccessibleFestivals(new Set(userData.accessibleFestivals || []));
        }
      }
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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleFestivalSelect = (festivalId: string) => {
    const festival = festivals.find(f => f.id === festivalId);
    if (!festival) return;

    if (!accessibleFestivals.has(festivalId)) {
      setSelectedFestival(festivalId);
      setShowAccessInput(true);
      setGeneralAccessCode("");
      setGeneralAccessError(null);
      return;
    }

    setSelectedFestival(festivalId);
    setSelectedCategory("");
  };

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const festival = festivals.find(f => f.accessCode === generalAccessCode);
    
    if (festival) {
      try {
        const newAccessibleFestivals = new Set(accessibleFestivals).add(festival.id);
        
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          accessibleFestivals: Array.from(newAccessibleFestivals)
        });
        
        setAccessibleFestivals(newAccessibleFestivals);
        setSelectedFestival(festival.id);
        setShowAccessInput(false);
        setShowFestivalList(false);
        setGeneralAccessError(null);
      } catch (error) {
        console.error("Error updating user's accessible festivals:", error);
        setGeneralAccessError("Error saving access. Please try again.");
      }
    } else {
      setGeneralAccessError("Invalid access code");
    }
  };

  const filteredPosts = posts.filter(post => {
    if (!accessibleFestivals.has(post.festivalId)) return false;
    
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
        <button
          onClick={() => {
            setShowFestivalList(true);
            setShowAccessInput(false);
          }}
          className="bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 transition-colors"
        >
          All Festivals
        </button>
      </div>

      <Sidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={user}
        userProfile={userProfile}
        accessibleFestivalsCount={userProfile?.accessibleFestivals?.length || 0}
        className="z-50"
      />

      {showAccessInput ? (
        <div className="max-w-md mx-auto mt-20 px-4">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-xl font-semibold mb-6 text-center">
              Enter Festival Access Code
            </h2>
            <form onSubmit={handleAccessCodeSubmit}>
              <input
                type="text"
                value={generalAccessCode}
                onChange={(e) => setGeneralAccessCode(e.target.value)}
                placeholder="Enter access code"
                className="w-full p-3 border rounded-lg mb-4"
              />
              {generalAccessError && (
                <p className="text-red-500 text-sm mb-4">{generalAccessError}</p>
              )}
              <button
                type="submit"
                className="w-full bg-purple-600 text-white px-6 py-3 rounded-full hover:bg-purple-700 transition-colors"
              >
                Hold to Join the Revolution
              </button>
            </form>
          </div>
          <p className="text-center text-gray-600 mt-8">
            Experience the moment. Cherish forever.
          </p>
        </div>
      ) : showFestivalList ? (
        <div className="max-w-4xl mx-auto px-4 mt-12 relative">
          {/* Animated background elements */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl opacity-20 -top-20 -left-20 animate-pulse"></div>
            <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl opacity-20 -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>

          <div className="text-center mb-16 relative z-10">
            <h1 className="text-6xl font-bold text-gray-900 mb-4">Your Festivals</h1>
            <p className="text-xl text-gray-600">Select a festival to view content</p>
          </div>

          <div className="grid gap-6 relative z-10">
            {festivals
              .filter(festival => accessibleFestivals.has(festival.id))
              .map((festival) => (
                <div
                  key={festival.id}
                  className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-xl 
                           transform hover:scale-[1.02] transition-all duration-300
                           border border-gray-100"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{festival.name}</h3>
                      <p className="text-gray-500">
                        {festival.categories?.length || 0} Categories Available
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFestival(festival.id);
                        setShowFestivalList(false);
                        setIsNavOpen(false);
                      }}
                      className="bg-purple-600 text-white px-8 py-3 rounded-full 
                               hover:bg-purple-700 transition-all duration-300
                               transform hover:scale-105 hover:shadow-lg
                               shadow-[0_0_20px_rgba(168,85,247,0.3)]
                               hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]"
                    >
                      View Content
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-12 relative z-10">
            <button
              onClick={() => {
                setShowAccessInput(true);
                setIsNavOpen(false);
              }}
              className="w-full px-8 py-4 rounded-full bg-purple-600 text-white text-xl 
                       font-semibold transition-all duration-300 
                       shadow-[0_0_20px_rgba(168,85,247,0.3)]
                       hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]
                       hover:bg-purple-700 transform hover:scale-[1.02]
                       relative overflow-hidden group"
            >
              <span className="relative z-10">Access Another Festival</span>
              <div 
                className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-500 
                         transition-opacity duration-300 opacity-0 group-hover:opacity-100"
              />
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4">
          {/* Filters Section */}
          <div className="mb-8 bg-white rounded-2xl shadow-md p-6">
            <div className="space-y-6">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Category
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory("")}
                    className={`px-6 py-2.5 rounded-full transition-all transform hover:scale-105 ${
                      selectedCategory === ""
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                        : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    All Categories
                  </button>
                  {festivals
                    .find(f => f.id === selectedFestival)
                    ?.categories?.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`px-6 py-2.5 rounded-full transition-all transform hover:scale-105 ${
                          selectedCategory === category.id
                            ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                            : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                </div>
              </div>

              {/* Media Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Media Type
                </label>
                <div className="inline-flex bg-gray-100 p-1 rounded-full">
                  {["all", "image", "video"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedMediaType(type as "all" | "image" | "video")}
                      className={`px-6 py-2 rounded-full transition-all duration-200 ${
                        selectedMediaType === type
                          ? "bg-purple-600 text-white shadow-lg transform scale-105"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Media Grid */}
          {loadingError && (
            <div className="text-red-500 text-center mb-4">{loadingError}</div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPosts.flatMap((post) => 
              post.mediaFiles.map((media, index) => (
                <div key={`${post.id}-${index}`} className="relative group">
                  {media.type === 'video' ? (
                    <div className="aspect-[9/16] rounded-2xl overflow-hidden">
                      <video
                        src={media.url}
                        className="w-full h-full object-cover"
                        controls
                        onError={(e) => {
                          console.error("Video failed to load:", media.url);
                          (e.target as HTMLVideoElement).style.display = 'none';
                        }}
                      />
                      <button
                        onClick={() => handleDownload(media.url, 'video', post.id)}
                        className="absolute bottom-2 right-2 bg-purple-600 text-white px-3 py-1 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Download
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-[9/16] rounded-2xl overflow-hidden">
                      <img
                        src={media.url}
                        alt={`Post content ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error("Image failed to load:", media.url);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <button
                        onClick={() => handleDownload(media.url, 'image', post.id)}
                        className="absolute bottom-2 right-2 bg-purple-600 text-white px-3 py-1 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Download
                      </button>
                    </div>
                  )}
                  {post.text && (
                    <p className="text-gray-800 mt-2 text-sm text-center">{post.text}</p>
                  )}
                </div>
              ))
            )}
          </div>
          
          {filteredPosts.length === 0 && !loadingError && (
            <div className="text-center text-gray-500 mt-12">
              <p className="text-xl">
                {posts.length === 0 ? "No posts yet" : "No posts match the selected filters"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
