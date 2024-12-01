import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, where, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Menu, KeyRound, User, Sparkles, Search as SearchIcon, Star, Package, Download, Share } from "lucide-react";
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
  categoryAccessCodes?: AccessCode[];
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

interface AccessCode {
  code: string;
  categoryIds: string[];
  createdAt: any;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [accessibleCategories, setAccessibleCategories] = useState<Record<string, string[]>>({});

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

  useEffect(() => {
    const festivalId = location.state?.selectedFestivalId;
    if (festivalId) {
      setSelectedFestival(festivalId);
      setShowFestivalList(false);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const loadAccessibleCategories = async () => {
      if (!user) return;
      
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      if (userData?.accessibleFestivals) {
        const categoriesMap: Record<string, string[]> = {};
        userData.accessibleFestivals.forEach((access: { festivalId: string; categoryIds: string[] }) => {
          categoriesMap[access.festivalId] = access.categoryIds;
        });
        setAccessibleCategories(categoriesMap);
      }
    };

    loadAccessibleCategories();
  }, [user]);

  const handleDownload = async (url: string, mediaType: string, postId: string, festivalId: string, categoryId?: string, mediaIndex?: number) => {
    try {
      // Create download record with media index
      await addDoc(collection(db, "downloads"), {
        postId,
        mediaType,
        mediaIndex,
        downloadedAt: serverTimestamp(),
        userId: auth.currentUser?.uid,
        festivalId,
        categoryId,
        url
      });

      // Fetch the file
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Create download link
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `post_${postId}.${mediaType === 'image' ? 'jpg' : 'mp4'}`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error handling download:', error);
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
    
    const festival = festivals.find(f => {
      // Check main festival access code
      if (f.accessCode === generalAccessCode) return true;
      
      // Check category-specific access codes
      return f.categoryAccessCodes?.some(ac => ac.code === generalAccessCode);
    });
    
    if (festival) {
      try {
        let accessibleCategories: string[] = [];
        
        // If it's the main festival access code, include all categories
        if (festival.accessCode === generalAccessCode) {
          accessibleCategories = festival.categories?.map(c => c.id) || [];
        } else {
          // Find the matching category access code
          const matchingAccessCode = festival.categoryAccessCodes?.find(
            ac => ac.code === generalAccessCode
          );
          if (!matchingAccessCode) {
            throw new Error("Access code not found");
          }
          // Only include the categories specified in the access code
          accessibleCategories = matchingAccessCode.categoryIds;
        }

        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();
        
        // Get existing festival access if it exists
        const existingAccess = userData?.accessibleFestivals?.find(
          (af: { festivalId: string }) => af.festivalId === festival.id
        );

        if (existingAccess) {
          // Remove existing access
          await updateDoc(userRef, {
            accessibleFestivals: arrayRemove(existingAccess)
          });

          // Combine existing and new categories without duplicates
          const combinedCategories = Array.from(new Set([
            ...existingAccess.categoryIds,
            ...accessibleCategories
          ]));

          // Add updated access
          await updateDoc(userRef, {
            accessibleFestivals: arrayUnion({
              festivalId: festival.id,
              categoryIds: combinedCategories
            })
          });
        } else {
          // Add new festival access
          await updateDoc(userRef, {
            accessibleFestivals: arrayUnion({
              festivalId: festival.id,
              categoryIds: accessibleCategories
            })
          });
        }
        
        // Update local state
        setAccessibleFestivals(prev => new Set([...prev, festival.id]));
        setAccessibleCategories(prev => ({
          ...prev,
          [festival.id]: accessibleCategories
        }));
        
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

  const handleInstagramShare = async (url: string, type: string) => {
    try {
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        // For mobile devices
        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], `share.${type === 'video' ? 'mp4' : 'jpg'}`, { 
          type: type === 'video' ? 'video/mp4' : 'image/jpeg' 
        });

        const shareData = {
          files: [file],
          title: 'Share to Instagram',
        };

        if ('share' in navigator && navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
          } catch (error) {
            console.error('Error sharing:', error);
            alert("Please try sharing directly to Instagram");
          }
        } else {
          alert("Sharing is not supported on this device");
        }
      } else {
        alert("Instagram sharing is only available on mobile devices");
      }
    } catch (error) {
      console.error("Error sharing to Instagram:", error);
      alert("Failed to share to Instagram. Please try manually.");
    }
  };

  const filteredPosts = posts.filter(post => {
    // First check if this post belongs to the selected festival
    if (post.festivalId !== selectedFestival) return false;

    // Then check if user has access to this festival
    if (!accessibleFestivals.has(post.festivalId)) return false;

    // Get user's accessible categories for this festival
    const userAccessibleCategories = accessibleCategories[post.festivalId] || [];

    // Filter media files based on category access
    const hasAccessibleMedia = post.mediaFiles.some(media => {
      // If media has no category, treat it as accessible
      if (!media.categoryId) return true;
      
      // Check if user has access to this media's category
      return userAccessibleCategories.includes(media.categoryId);
    });

    return hasAccessibleMedia;
  }).map(post => ({
    ...post,
    // Filter out media files that user doesn't have access to
    mediaFiles: post.mediaFiles.filter(media => {
      if (!media.categoryId) return true;
      const userAccessibleCategories = accessibleCategories[post.festivalId] || [];
      return userAccessibleCategories.includes(media.categoryId);
    })
  }));

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
        
        {/* Only show Sparkles button when viewing festival content */}
        {selectedFestival && (
          <button
            onClick={() => {
              setSelectedFestival("");
              setShowFestivalList(true);
              setShowAccessInput(false);
            }}
            className="text-purple-600 hover:text-purple-700 transition-colors duration-300 p-2 rounded-full hover:bg-purple-50"
            aria-label="Return to festivals"
          >
            <Sparkles size={28} />
          </button>
        )}
      </div>

      <Sidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={auth.currentUser}
        userProfile={userProfile}
        setSelectedFestival={setSelectedFestival}
      />

      {!selectedFestival ? (
        <div className="max-w-5xl mx-auto px-4 mt-8 md:mt-16">
          {/* Header Section */}
          <div className="text-center mb-12 relative z-10">
            <h1 className="text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 mb-4">
              Your Festivals
            </h1>
            <p className="text-xl text-gray-600 font-light">
              Access or select a festival to view content
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 relative z-10">
            {/* Access New Festival Card */}
            <div className="bg-white rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.05)] 
                          transform transition-all duration-300 hover:shadow-[0_4px_25px_rgba(0,0,0,0.07)]">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <KeyRound className="text-purple-500" size={24} />
                Access New Festival
              </h2>
              <form onSubmit={handleAccessCodeSubmit} className="space-y-5">
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      value={generalAccessCode}
                      onChange={(e) => setGeneralAccessCode(e.target.value)}
                      placeholder="Enter access code"
                      className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-xl
                               text-gray-800 placeholder-gray-400
                               focus:outline-none focus:border-purple-300 focus:ring-2 focus:ring-purple-100
                               transition-all duration-300"
                    />
                  </div>
                  {generalAccessError && (
                    <p className="mt-2 text-red-500 text-sm flex items-center gap-1">
                      <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
                      {generalAccessError}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full bg-purple-600 text-white px-8 py-4 rounded-xl
                           font-medium text-lg
                           hover:bg-purple-700 active:bg-purple-800
                           transform transition-all duration-300
                           hover:shadow-[0_4px_20px_rgba(168,85,247,0.3)]
                           focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  Join Festival
                </button>
              </form>
            </div>

            {/* Your Accessible Festivals Card */}
            <div className="bg-white rounded-3xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.05)]
                          transform transition-all duration-300 hover:shadow-[0_4px_25px_rgba(0,0,0,0.07)]">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Star className="text-purple-500" size={24} />
                Your Accessible Festivals
              </h2>
              <div className="space-y-3">
                {festivals
                  .filter(festival => accessibleFestivals.has(festival.id))
                  .map((festival) => (
                    <button
                      key={festival.id}
                      onClick={() => {
                        setSelectedFestival(festival.id);
                        setShowFestivalList(false);
                        setIsNavOpen(false);
                      }}
                      className="w-full text-left p-5 rounded-xl bg-gray-50
                               border-2 border-transparent
                               hover:border-purple-200 hover:bg-purple-50
                               transition-all duration-300 group"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-700 
                                     transition-colors mb-1">
                            {festival.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 bg-purple-500 rounded-full"></span>
                            <p className="text-sm text-gray-500">
                              {festival.categories?.length || 0} Categories Available
                            </p>
                          </div>
                        </div>
                        <span className="text-purple-600 opacity-0 group-hover:opacity-100 
                                     transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                          View Content →
                        </span>
                      </div>
                    </button>
                  ))}
                
                {festivals.filter(festival => accessibleFestivals.has(festival.id)).length === 0 && (
                  <div className="text-center py-8 px-4 bg-gray-50 rounded-xl">
                    <div className="mb-3 text-gray-400">
                      <Package size={32} className="mx-auto" />
                    </div>
                    <p className="text-gray-600">
                      No festivals accessed yet
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Enter an access code to join your first festival
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Background Decorative Elements */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute w-[500px] h-[500px] bg-purple-100 rounded-full 
                          blur-3xl opacity-20 -top-40 -left-40 animate-pulse"></div>
            <div className="absolute w-[500px] h-[500px] bg-rose-100 rounded-full 
                          blur-3xl opacity-20 -bottom-40 -right-40 animate-pulse"
                 style={{ animationDelay: '1s' }}></div>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4">
          {/* Festival Name Display */}
          <div className="mb-12">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-8 
                          border border-gray-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 to-rose-50/50"></div>
              <div className="relative">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 text-center">
                  {festivals.find(f => f.id === selectedFestival)?.name}
                </h1>
                <div className="mt-2 text-center">
                  <span className="text-gray-500 text-sm">
                    View and filter your festival content below
                  </span>
                </div>
              </div>
            </div>
          </div>

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
            {filteredPosts.flatMap((post, postIndex) => 
              post.mediaFiles.map((media, mediaIndex) => (
                <div key={`${post.id}-${mediaIndex}`} className="relative group">
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
                      <div className="absolute bottom-2 right-2 flex gap-2">
                        <button
                          onClick={() => handleInstagramShare(media.url, media.type)}
                          className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-3 py-1 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity hover:from-purple-700 hover:to-pink-600"
                        >
                          <Share className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(media.url, media.type, post.id, post.festivalId, media.categoryId, mediaIndex)}
                          className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-[9/16] rounded-2xl overflow-hidden">
                      <img
                        src={media.url}
                        alt={`Post content ${mediaIndex + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error("Image failed to load:", media.url);
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute bottom-2 right-2 flex gap-2">
                        <button
                          onClick={() => handleInstagramShare(media.url, media.type)}
                          className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-3 py-1 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity hover:from-purple-700 hover:to-pink-600"
                        >
                          <Share className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(media.url, media.type, post.id, post.festivalId, media.categoryId, mediaIndex)}
                          className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
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
