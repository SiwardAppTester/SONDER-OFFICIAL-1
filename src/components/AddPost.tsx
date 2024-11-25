import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, getDoc, updateDoc, arrayUnion, arrayRemove, query, where, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { db, storage, auth } from "../firebase";
import { signOut } from "firebase/auth";
import BusinessSidebar from "./BusinessSidebar";
import { Menu, Plus } from "lucide-react";

interface MediaFile {
  file: File;
  type: "image" | "video";
  progress: number;
  url?: string;
  categoryId?: string;
}

interface Category {
  id: string;
  name: string;
  mediaType: "both" | "image" | "video";
  mediaFiles?: {
    images: MediaFile[];
    videos: MediaFile[];
  };
}

interface Festival {
  id: string;
  name: string;
  accessCode: string;
  categories?: Category[];
}

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

interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
}

const AddPost: React.FC = () => {
  const [text, setText] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [selectedFestival, setSelectedFestival] = useState<string>("");
  const [newFestivalName, setNewFestivalName] = useState("");
  const [newFestivalAccessCode, setNewFestivalAccessCode] = useState("");
  const [showAddFestival, setShowAddFestival] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [activeCategoryMedia, setActiveCategoryMedia] = useState<Record<string, "image" | "video">>({});
  const [categoryPosts, setCategoryPosts] = useState<Record<string, Post[]>>({});
  const navigate = useNavigate();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchFestivals();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchCategoryPosts(selectedCategory);
    }
  }, [selectedCategory, selectedFestival]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, []);

  const fetchFestivals = async () => {
    try {
      const festivalsSnapshot = await getDocs(collection(db, "festivals"));
      const festivalsData = festivalsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        accessCode: doc.data().accessCode,
        categories: doc.data().categories
      }));
      setFestivals(festivalsData);
    } catch (error) {
      console.error("Error fetching festivals:", error);
    }
  };

  const handleAddFestival = async () => {
    if (!newFestivalName.trim()) {
      alert("Please enter a festival name");
      return;
    }
    if (!newFestivalAccessCode.trim()) {
      alert("Please enter an access code");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "festivals"), {
        name: newFestivalName.trim(),
        accessCode: newFestivalAccessCode.trim(),
        createdAt: serverTimestamp(),
        categories: []
      });
      
      const newFestival = { 
        id: docRef.id, 
        name: newFestivalName.trim(),
        accessCode: newFestivalAccessCode.trim(),
        categories: []
      };
      
      setFestivals(prev => [...prev, newFestival]);
      setSelectedFestival(docRef.id);
      setNewFestivalName("");
      setNewFestivalAccessCode("");
      setShowAddFestival(false);

      const festivalDoc = await getDoc(doc(db, "festivals", docRef.id));
      if (!festivalDoc.exists()) {
        throw new Error("Festival was not saved properly");
      }

    } catch (error) {
      console.error("Error adding festival:", error);
      alert("Failed to create festival. Please try again.");
    }
  };

  const handleAddCategory = async () => {
    if (!selectedFestival) {
      alert("Please select a festival first");
      return;
    }
    if (!newCategoryName.trim()) {
      alert("Please enter a category name");
      return;
    }

    try {
      const newCategoryId = crypto.randomUUID();
      const newCategory = {
        id: newCategoryId,
        name: newCategoryName.trim(),
        mediaType: "both"
      };

      const festivalRef = doc(db, "festivals", selectedFestival);
      await updateDoc(festivalRef, {
        categories: arrayUnion(newCategory)
      });

      setFestivals(prev => prev.map(festival => 
        festival.id === selectedFestival
          ? { ...festival, categories: [...(festival.categories || []), newCategory] }
          : festival
      ));
      
      // Initialize the media toggle state for the new category
      setActiveCategoryMedia(prev => ({
        ...prev,
        [newCategoryId]: "image" // Default to image view
      }));
      
      setNewCategoryName("");
      setShowAddCategory(false);
    } catch (error) {
      console.error("Error adding category:", error);
      alert("Failed to add category. Please try again.");
    }
  };

  const handleToggleMediaType = async (categoryId: string, currentType: "both" | "image" | "video") => {
    if (!selectedFestival) return;

    try {
      const festivalRef = doc(db, "festivals", selectedFestival);
      const festival = festivals.find(f => f.id === selectedFestival);
      if (!festival?.categories) return;

      const categoryToUpdate = festival.categories.find(c => c.id === categoryId);
      if (!categoryToUpdate) return;

      const newType = currentType === "both" ? "image" : 
                     currentType === "image" ? "video" : "both";

      const updatedCategory = { ...categoryToUpdate, mediaType: newType };

      await updateDoc(festivalRef, {
        categories: arrayRemove(categoryToUpdate)
      });
      await updateDoc(festivalRef, {
        categories: arrayUnion(updatedCategory)
      });

      setFestivals(prev => prev.map(festival => 
        festival.id === selectedFestival
          ? { 
              ...festival, 
              categories: festival.categories?.map(c => 
                c.id === categoryId ? updatedCategory : c
              )
            }
          : festival
      ));
    } catch (error) {
      console.error("Error updating category media type:", error);
      alert("Failed to update category media type. Please try again.");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!selectedFestival) return;
    
    if (!window.confirm("Are you sure you want to delete this category?")) {
      return;
    }

    try {
      const festivalRef = doc(db, "festivals", selectedFestival);
      const festival = festivals.find(f => f.id === selectedFestival);
      if (!festival?.categories) return;

      const categoryToDelete = festival.categories.find(c => c.id === categoryId);
      if (!categoryToDelete) return;

      await updateDoc(festivalRef, {
        categories: arrayRemove(categoryToDelete)
      });

      setFestivals(prev => prev.map(festival => 
        festival.id === selectedFestival
          ? { 
              ...festival, 
              categories: festival.categories?.filter(c => c.id !== categoryId) 
            }
          : festival
      ));

      if (selectedCategory === categoryId) {
        setSelectedCategory("");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category. Please try again.");
    }
  };

  const handleDeleteFestival = async (festivalId: string) => {
    if (!window.confirm("Are you sure you want to delete this festival?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "festivals", festivalId));
      setFestivals(prev => prev.filter(festival => festival.id !== festivalId));
      if (selectedFestival === festivalId) {
        setSelectedFestival("");
      }
    } catch (error) {
      console.error("Error deleting festival:", error);
      alert("Failed to delete festival. Please try again.");
    }
  };

  const uploadFile = async (file: File, type: "image" | "video", index: number) => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const mediaRef = ref(storage, `posts/${user.uid}/${Date.now()}_${type}`);
    const uploadTask = uploadBytesResumable(mediaRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setMediaFiles(prev => prev.map((item, i) => 
          i === index ? { ...item, progress } : item
        ));
      },
      (error) => {
        console.error("Error uploading file:", error);
      },
      async () => {
        const url = await getDownloadURL(mediaRef);
        setMediaFiles(prev => prev.map((item, i) => 
          i === index ? { ...item, url } : item
        ));
        
        // Check if all files are uploaded
        setMediaFiles(prev => {
          const allUploaded = prev.every(file => file.url);
          if (allUploaded) {
            setIsUploading(false);
          }
          return prev;
        });
      }
    );
  };

  const handleMediaChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    categoryId?: string,
  ) => {
    if (e.target.files) {
      setIsUploading(true);
      const newFiles = Array.from(e.target.files)
        .filter(file => {
          const isImage = file.type.startsWith('image/');
          const isVideo = file.type.startsWith('video/');
          
          // If category is selected, filter based on active media type
          if (selectedCategory) {
            const activeType = activeCategoryMedia[selectedCategory];
            if (activeType === "image") return isImage;
            if (activeType === "video") return isVideo;
          }
          
          return isImage || isVideo;
        })
        .map(file => ({
          file,
          type: file.type.startsWith('image/') ? 'image' : 'video' as "image" | "video",
          progress: 0,
          categoryId: selectedCategory || undefined
        }));

      if (newFiles.length === 0) {
        alert("No valid files selected");
        return;
      }

      const currentLength = mediaFiles.length;
      setMediaFiles(prev => [...prev, ...newFiles]);

      newFiles.forEach((file, index) => {
        uploadFile(file.file, file.type, currentLength + index);
      });
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getAuth();
    const user = auth.currentUser;

    // Check if a festival is selected
    if (!selectedFestival) {
      alert("Please select a festival before posting");
      return;
    }

    // Check if user exists
    if (!user) {
      alert("You must be logged in to post");
      return;
    }

    // Check if there's either text or media content
    if (!text.trim() && mediaFiles.length === 0) {
      alert("Please add some content to your post");
      return;
    }

    // Add media type validation
    if (selectedCategory) {
      const festival = festivals.find(f => f.id === selectedFestival);
      const category = festival?.categories?.find(c => c.id === selectedCategory);
      
      if (category && category.mediaType !== "both") {
        const hasInvalidMedia = mediaFiles.some(file => {
          if (category.mediaType === "image" && file.type === "video") return true;
          if (category.mediaType === "video" && file.type === "image") return true;
          return false;
        });

        if (hasInvalidMedia) {
          alert(`This category only accepts ${category.mediaType}s`);
          return;
        }
      }
    }

    try {
      const postData = {
        text,
        userId: user.uid,
        createdAt: serverTimestamp(),
        festivalId: selectedFestival,
        mediaFiles: mediaFiles
          .filter(media => media.url) // Only include fully uploaded files
          .map(media => ({
            url: media.url,
            type: media.type,
            categoryId: selectedCategory || null
          }))
      };

      await addDoc(collection(db, "posts"), postData);

      // Clear the form instead of navigating
      setText("");
      setMediaFiles([]);
      // Optionally show a success message
      alert("Post created successfully!");
      
      // Refresh the category posts to show the new content
      if (selectedCategory) {
        fetchCategoryPosts(selectedCategory);
      }

    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post. Please try again.");
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

  const fetchCategoryPosts = async (categoryId: string) => {
    try {
      console.log('Fetching posts for category:', categoryId);
      const postsQuery = query(
        collection(db, "posts"),
        where("festivalId", "==", selectedFestival),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(postsQuery);
      console.log('Found posts:', snapshot.docs.length);
      const posts = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Post))
        .filter(post => 
          post.mediaFiles.some(media => media.categoryId === categoryId)
        );
      console.log('Filtered posts:', posts.length);

      setCategoryPosts(prev => ({
        ...prev,
        [categoryId]: posts
      }));
    } catch (error) {
      console.error("Error fetching category posts:", error);
    }
  };

  // First, let's add a helper function to filter posts by media type
  const getFilteredPosts = (categoryId: string, mediaType: "image" | "video") => {
    return categoryPosts[categoryId]?.filter(post => 
      post.mediaFiles.some(media => 
        media.categoryId === categoryId && media.type === mediaType
      )
    ) || [];
  };

  return (
    <div className="add-post p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
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

        <BusinessSidebar
          isNavOpen={isNavOpen}
          setIsNavOpen={setIsNavOpen}
          user={auth.currentUser}
          userProfile={userProfile}
          accessibleFestivalsCount={festivals.length}
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                {festivals.map((festival) => (
                  <button
                    key={festival.id}
                    type="button"
                    onClick={() => setSelectedFestival(festival.id)}
                    className={`px-4 py-2 rounded-full transition-colors ${
                      selectedFestival === festival.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {festival.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowAddFestival(!showAddFestival)}
                  className="px-4 py-2 rounded-full bg-gray-100 text-blue-500 hover:bg-gray-200 flex items-center gap-1"
                >
                  <Plus size={16} />
                  New Festival
                </button>
              </div>

              {showAddFestival && (
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newFestivalName}
                      onChange={(e) => setNewFestivalName(e.target.value)}
                      placeholder="Enter festival name"
                      className="w-full p-2 border rounded"
                    />
                    <input
                      type="text"
                      value={newFestivalAccessCode}
                      onChange={(e) => setNewFestivalAccessCode(e.target.value)}
                      placeholder="Enter access code"
                      className="w-full p-2 border rounded"
                    />
                    <button
                      type="button"
                      onClick={handleAddFestival}
                      className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                      Add Festival
                    </button>
                  </div>
                  
                  {/* Display existing festivals with delete option */}
                  <div className="mt-4 space-y-2">
                    {festivals.map((festival) => (
                      <div
                        key={festival.id}
                        className="flex justify-between items-center p-2 bg-white rounded shadow"
                      >
                        <div>
                          <span className="block">{festival.name}</span>
                          <span className="text-sm text-gray-500">
                            Access Code: {festival.accessCode}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteFestival(festival.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedFestival && (
              <div className="flex flex-wrap gap-2 items-center">
                {festivals
                  .find(f => f.id === selectedFestival)
                  ?.categories?.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2 rounded-full transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="px-4 py-2 rounded-full bg-gray-100 text-blue-500 hover:bg-gray-200 flex items-center gap-1"
                >
                  <Plus size={16} />
                  New Category
                </button>
              </div>
            )}
          </div>

          {selectedCategory && (
            <div className="flex flex-col items-center justify-center">
              <div className="flex justify-center">
                <div className="bg-gray-100 rounded-lg p-1 inline-flex">
                  <button
                    type="button"
                    onClick={() => setActiveCategoryMedia(prev => ({
                      ...prev,
                      [selectedCategory]: "image"
                    }))}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeCategoryMedia[selectedCategory] !== "video"
                        ? "bg-white shadow text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Images
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategoryMedia(prev => ({
                      ...prev,
                      [selectedCategory]: "video"
                    }))}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeCategoryMedia[selectedCategory] === "video"
                        ? "bg-white shadow text-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Videos
                  </button>
                </div>
              </div>

              {/* Display current media type */}
              <div className="text-center mt-2 text-sm text-gray-600">
                Currently uploading: {activeCategoryMedia[selectedCategory] === "video" ? "Videos" : "Images"}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full p-4 border rounded-lg resize-none"
              rows={4}
            />

            <input
              type="file"
              onChange={handleMediaChange}
              accept={
                selectedCategory
                  ? festivals
                      .find(f => f.id === selectedFestival)
                      ?.categories?.find(c => c.id === selectedCategory)
                      ?.mediaType === "image"
                    ? "image/*"
                    : festivals
                        .find(f => f.id === selectedFestival)
                        ?.categories?.find(c => c.id === selectedCategory)
                        ?.mediaType === "video"
                      ? "video/*"
                      : "image/*,video/*"
                  : "image/*,video/*"
              }
              className="w-full p-2 border rounded-lg"
              multiple
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {mediaFiles.map((media, index) => (
                <div key={index} className="relative w-full">
                  {media.type === 'video' ? (
                    <video
                      src={URL.createObjectURL(media.file)}
                      className="w-full aspect-[9/16] object-cover rounded-lg"
                      controls
                    />
                  ) : (
                    <img
                      src={URL.createObjectURL(media.file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full aspect-[9/16] object-cover rounded-lg"
                    />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                    {media.url ? "Upload complete" : `Uploading: ${media.progress.toFixed(0)}%`}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className={`w-full px-6 py-3 rounded-lg ${
                isUploading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isUploading ? 'Uploading...' : 'Post'}
            </button>
          </div>

          {selectedCategory && (
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-6">Existing Content in Category</h3>
              
              {activeCategoryMedia[selectedCategory] !== "video" ? (
                <div className="space-y-6">
                  <h4 className="text-lg font-medium">Images</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    {getFilteredPosts(selectedCategory, "image").map(post => (
                      post.mediaFiles
                        .filter(media => media.type === "image" && media.categoryId === selectedCategory)
                        .map((media, mediaIndex) => (
                          <div key={`${post.id}-${mediaIndex}`} className="relative w-full">
                            <img
                              src={media.url}
                              alt={`Post content ${mediaIndex + 1}`}
                              className="w-full aspect-[9/16] object-cover rounded-lg"
                            />
                            {post.text && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2">
                                {post.text}
                              </div>
                            )}
                          </div>
                        ))
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <h4 className="text-lg font-medium">Videos</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    {getFilteredPosts(selectedCategory, "video").map(post => (
                      post.mediaFiles
                        .filter(media => media.type === "video" && media.categoryId === selectedCategory)
                        .map((media, mediaIndex) => (
                          <div key={`${post.id}-${mediaIndex}`} className="relative w-full">
                            <video
                              src={media.url}
                              className="w-full aspect-[9/16] object-cover rounded-lg"
                              controls
                            />
                            {post.text && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2">
                                {post.text}
                              </div>
                            )}
                          </div>
                        ))
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AddPost;
