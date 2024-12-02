import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, getDoc, updateDoc, arrayUnion, arrayRemove, query, where, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable, deleteObject } from "firebase/storage";
import { db, storage, auth } from "../firebase";
import { signOut } from "firebase/auth";
import BusinessSidebar from "./BusinessSidebar";
import { Menu, Plus, Share, Key, Trash2 } from "lucide-react";

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

interface AccessCode {
  code: string;
  name: string;
  categoryIds: string[];
  createdAt: any;
}

interface Festival {
  id: string;
  name: string;
  description: string;
  categoryAccessCodes?: AccessCode[];
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

interface Toast {
  message: string;
  type: 'success' | 'error';
}

const AddPost: React.FC = () => {
  const [text, setText] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [selectedFestival, setSelectedFestival] = useState<string>("");
  const [newFestivalName, setNewFestivalName] = useState("");
  const [newFestivalDescription, setNewFestivalDescription] = useState("");
  const [showAddFestival, setShowAddFestival] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [activeCategoryMedia, setActiveCategoryMedia] = useState<Record<string, "image" | "video">>({});
  const [categoryPosts, setCategoryPosts] = useState<Record<string, Post[]>>({});
  const navigate = useNavigate();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showAddAccessCode, setShowAddAccessCode] = useState(false);
  const [newAccessCode, setNewAccessCode] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [showManageAccessCodes, setShowManageAccessCodes] = useState(false);
  const [newAccessCodeName, setNewAccessCodeName] = useState("");

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
        description: doc.data().description,
        categoryAccessCodes: doc.data().categoryAccessCodes,
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

    try {
      const docRef = await addDoc(collection(db, "festivals"), {
        name: newFestivalName.trim(),
        description: newFestivalDescription.trim(),
        createdAt: serverTimestamp(),
        categoryAccessCodes: [],
        categories: []
      });
      
      const newFestival = { 
        id: docRef.id, 
        name: newFestivalName.trim(),
        description: newFestivalDescription.trim(),
        categoryAccessCodes: [],
        categories: []
      };
      
      setFestivals(prev => [...prev, newFestival]);
      setSelectedFestival(docRef.id);
      setNewFestivalName("");
      setNewFestivalDescription("");
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

    const mediaRef = ref(storage, `posts/${user.uid}/${Date.now()}_${file.name}`);
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
        alert(`Error uploading file: ${file.name}`);
      },
      async () => {
        try {
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
        } catch (error) {
          console.error("Error getting download URL:", error);
          alert(`Error getting download URL for file: ${file.name}`);
        }
      }
    );
  };

  const handleMediaChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!selectedFestival) {
      alert("Please select a festival first");
      return;
    }

    if (!selectedCategory) {
      alert("Please select a category before uploading media");
      return;
    }

    // Validate that the selected category belongs to the selected festival
    const festival = festivals.find(f => f.id === selectedFestival);
    const categoryBelongsToFestival = festival?.categories?.some(
      c => c.id === selectedCategory
    );

    if (!categoryBelongsToFestival) {
      alert("This category does not belong to the selected festival");
      setSelectedCategory(""); // Reset the category selection
      return;
    }

    if (!festival?.categories?.length) {
      alert("Please create a category in this festival first");
      return;
    }

    if (e.target.files) {
      setIsUploading(true);
      const newFiles = Array.from(e.target.files)
        .filter(file => {
          const isImage = file.type.startsWith('image/');
          const isVideo = file.type.startsWith('video/');
          
          // Filter based on category's media type
          const category = festivals
            .find(f => f.id === selectedFestival)
            ?.categories?.find(c => c.id === selectedCategory);
          
          if (category) {
            if (category.mediaType === "image") return isImage;
            if (category.mediaType === "video") return isVideo;
          }
          
          return isImage || isVideo;
        })
        .map(file => ({
          file,
          type: file.type.startsWith('image/') ? 'image' : 'video' as "image" | "video",
          progress: 0,
          categoryId: selectedCategory
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

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000); // Hide after 3 seconds
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getAuth();
    const user = auth.currentUser;

    if (!selectedFestival) {
      alert("Please select a festival first");
      return;
    }

    if (!selectedCategory) {
      alert("Please select a category before posting");
      return;
    }

    // Validate that the selected category belongs to the selected festival
    const festival = festivals.find(f => f.id === selectedFestival);
    const categoryBelongsToFestival = festival?.categories?.some(
      c => c.id === selectedCategory
    );

    if (!categoryBelongsToFestival) {
      alert("This category does not belong to the selected festival");
      setSelectedCategory(""); // Reset the category selection
      return;
    }

    if (!festival?.categories?.length) {
      alert("Please create a category in this festival first");
      return;
    }

    if (!user) {
      alert("You must be logged in to post");
      return;
    }

    if (mediaFiles.length === 0) {
      alert("Please add some media content to your post");
      return;
    }

    // Check if all files are uploaded
    const allFilesUploaded = mediaFiles.every(file => file.url);
    if (!allFilesUploaded) {
      alert("Please wait for all files to finish uploading");
      return;
    }

    try {
      const postData = {
        userId: user.uid,
        text: text.trim(),
        createdAt: serverTimestamp(),
        festivalId: selectedFestival,
        mediaFiles: mediaFiles.map(media => ({
          url: media.url,
          type: media.type,
          categoryId: selectedCategory
        }))
      };

      await addDoc(collection(db, "posts"), postData);

      // Clear the form
      setText("");
      setMediaFiles([]);
      
      // Show styled toast instead of alert
      showToast("Content posted successfully! ✨", "success");
      
      // Refresh the category posts to show the new content
      if (selectedCategory) {
        fetchCategoryPosts(selectedCategory);
      }

    } catch (error) {
      console.error("Error creating post:", error);
      showToast("Failed to create post. Please try again.", "error");
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

  const handleFestivalSelect = (festivalId: string) => {
    setSelectedFestival(festivalId);
    
    // Get the selected festival's categories
    const festival = festivals.find(f => f.id === festivalId);
    const firstCategory = festival?.categories?.[0];
    
    // If there's at least one category, select it automatically
    if (firstCategory) {
      setSelectedCategory(firstCategory.id);
      // Also set the default media type view for this category
      setActiveCategoryMedia(prev => ({
        ...prev,
        [firstCategory.id]: "image" // Default to image view
      }));
    } else {
      setSelectedCategory(""); // Clear selection if no categories exist
    }
  };

  // Add this new function to handle post media deletion
  const handleDeletePostMedia = async (postId: string, mediaUrl: string, event: React.MouseEvent) => {
    // Prevent event from bubbling up to parent elements
    event.preventDefault();
    event.stopPropagation();
    
    if (!window.confirm("Are you sure you want to delete this media?")) {
      return;
    }

    try {
      // Get the current post
      const postRef = doc(db, "posts", postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        console.error("Post not found");
        return;
      }

      const post = postDoc.data() as Post;
      
      // Filter out the media to be deleted
      const updatedMediaFiles = post.mediaFiles.filter(media => media.url !== mediaUrl);

      // Delete the file from Firebase Storage
      try {
        const storageRef = ref(storage, mediaUrl);
        await deleteObject(storageRef);
      } catch (error) {
        console.error("Error deleting file from storage:", error);
      }

      if (updatedMediaFiles.length === 0) {
        // If no media left, delete the entire post
        await deleteDoc(postRef);
        
        // Update local state to remove the post
        setCategoryPosts(prev => ({
          ...prev,
          [selectedCategory]: prev[selectedCategory]?.filter(p => p.id !== postId) || []
        }));
      } else {
        // Update the post with the remaining media
        await updateDoc(postRef, {
          mediaFiles: updatedMediaFiles
        });
        
        // Update local state
        setCategoryPosts(prev => ({
          ...prev,
          [selectedCategory]: prev[selectedCategory]?.map(p => 
            p.id === postId 
              ? { ...p, mediaFiles: updatedMediaFiles }
              : p
          ) || []
        }));
      }

    } catch (error) {
      console.error("Error deleting media:", error);
      alert("Failed to delete media. Please try again.");
    }
  };

  // Add a helper function to check if all files are uploaded
  const areAllFilesUploaded = () => {
    return mediaFiles.length > 0 && mediaFiles.every(file => file.url);
  };

  const handleInstagramShare = async (media: MediaFile) => {
    try {
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        // For mobile devices
        const file = media.url ? await fetch(media.url).then(r => r.blob()) : media.file;
        const shareData = {
          files: [file],
          title: 'Share to Instagram',
        };

        if ('share' in navigator && navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            
            // Add share record to Firestore
            if (auth.currentUser && postId) {
              await addDoc(collection(db, 'messages'), {
                type: 'shared_post',
                postId: postId,
                mediaIndex: mediaFiles.findIndex(m => m.url === media.url),
                senderId: auth.currentUser.uid,
                receiverId: 'instagram',
                festivalId: selectedFestival,
                categoryId: media.categoryId,
                timestamp: serverTimestamp(),
                platform: 'instagram'
              });
            }
          } catch (error) {
            console.error('Error sharing:', error);
            showToast("Please try sharing directly to Instagram", "error");
          }
        } else {
          showToast("Sharing is not supported on this device", "error");
        }
      } else {
        showToast("Instagram sharing is only available on mobile devices", "error");
      }
    } catch (error) {
      console.error("Error sharing to Instagram:", error);
      showToast("Failed to share to Instagram. Please try manually.", "error");
    }
  };

  const handleAddAccessCode = async () => {
    if (!selectedFestival) {
      alert("Please select a festival first");
      return;
    }
    if (!newAccessCode.trim()) {
      alert("Please enter an access code");
      return;
    }
    if (!newAccessCodeName.trim()) {
      alert("Please enter a name for the access code");
      return;
    }
    if (selectedCategoryIds.length === 0) {
      alert("Please select at least one category");
      return;
    }

    try {
      // Check if access code already exists
      const festivalsSnapshot = await getDocs(collection(db, "festivals"));
      const accessCodeExists = festivalsSnapshot.docs.some(doc => {
        const festival = doc.data();
        return festival.categoryAccessCodes?.some(
          (ac: AccessCode) => ac.code === newAccessCode.trim()
        ) || festival.accessCode === newAccessCode.trim();
      });

      if (accessCodeExists) {
        alert("This access code is already in use. Please choose a different one.");
        return;
      }

      const festivalRef = doc(db, "festivals", selectedFestival);
      const newCategoryAccessCode: AccessCode = {
        code: newAccessCode.trim(),
        name: newAccessCodeName.trim(),
        categoryIds: selectedCategoryIds,
        createdAt: new Date().toISOString()
      };

      await updateDoc(festivalRef, {
        categoryAccessCodes: arrayUnion(newCategoryAccessCode)
      });

      // Update local state
      setFestivals(prev => prev.map(festival => 
        festival.id === selectedFestival
          ? {
              ...festival,
              categoryAccessCodes: [
                ...(festival.categoryAccessCodes || []),
                newCategoryAccessCode
              ]
            }
          : festival
      ));

      setNewAccessCode("");
      setNewAccessCodeName("");
      setSelectedCategoryIds([]);
      setShowAddAccessCode(false);
      showToast("Access code created successfully! ✨", "success");

    } catch (error) {
      console.error("Error adding access code:", error);
      showToast("Failed to create access code. Please try again.", "error");
    }
  };

  const handleDeleteAccessCode = async (code: string) => {
    if (!selectedFestival) return;
    
    if (!window.confirm("Are you sure you want to delete this access code?")) {
      return;
    }

    try {
      const festivalRef = doc(db, "festivals", selectedFestival);
      const festival = festivals.find(f => f.id === selectedFestival);
      if (!festival?.categoryAccessCodes) return;

      const accessCodeToDelete = festival.categoryAccessCodes.find(ac => ac.code === code);
      if (!accessCodeToDelete) return;

      await updateDoc(festivalRef, {
        categoryAccessCodes: arrayRemove(accessCodeToDelete)
      });

      setFestivals(prev => prev.map(festival => 
        festival.id === selectedFestival
          ? { 
              ...festival, 
              categoryAccessCodes: festival.categoryAccessCodes?.filter(ac => ac.code !== code)
            }
          : festival
      ));
    } catch (error) {
      console.error("Error deleting access code:", error);
      alert("Failed to delete access code. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-rose-100">
      {/* Navigation */}
      <div className="flex justify-between items-center p-4">
        <button
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="text-purple-600 hover:text-purple-700 transition-colors duration-300"
        >
          <Menu size={28} />
        </button>
      </div>

      <BusinessSidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={auth.currentUser}
        userProfile={userProfile}
        accessibleFestivalsCount={festivals.length}
      />

      <div className="max-w-6xl mx-auto px-4">
        {/* Combined Festival and Category Selection */}
        <div className="mb-12">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-8 
                        border border-gray-100 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 to-rose-50/50"></div>
            <div className="relative">
              {/* Festivals Section */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Festivals</h2>
                  <div className="flex gap-2">
                    {selectedFestival && (
                      <button
                        type="button"
                        onClick={() => setShowManageAccessCodes(true)}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2"
                      >
                        <Key size={16} />
                        Manage Access Codes
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAddFestival(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-all transform hover:scale-105 shadow-lg shadow-purple-200 flex items-center gap-2"
                    >
                      <Plus size={16} />
                      New Festival
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {festivals.map((festival) => (
                    <div key={festival.id} className="relative group">
                      <button
                        onClick={() => handleFestivalSelect(festival.id)}
                        className={`px-4 py-2 rounded-full transition-all transform hover:scale-105 ${
                          selectedFestival === festival.id
                            ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                            : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        {festival.name}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFestival(festival.id);
                        }}
                        className="absolute -top-1 -right-1 bg-white text-gray-400 hover:text-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 border border-gray-200 shadow-sm"
                        aria-label="Delete festival"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clean Purple Divider */}
              <div className="w-full flex items-center gap-4 py-2">
                <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-purple-300 to-transparent"></div>
              </div>

              {/* Categories Section */}
              {selectedFestival && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Categories</h2>
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(true)}
                      className="px-4 py-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-1 transition-all transform hover:scale-105 shadow-lg shadow-purple-200"
                    >
                      <Plus size={16} />
                      New Category
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {festivals
                      .find(f => f.id === selectedFestival)
                      ?.categories?.map((category) => (
                        <div key={category.id} className="relative group">
                          <button
                            onClick={() => setSelectedCategory(category.id)}
                            className={`px-4 py-2 rounded-full transition-all transform hover:scale-105 ${
                              selectedCategory === category.id
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                                : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                            }`}
                          >
                            {category.name}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(category.id);
                            }}
                            className="absolute -top-1 -right-1 bg-white text-gray-400 hover:text-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 border border-gray-200 shadow-sm"
                            aria-label="Delete category"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Festival Modal */}
        {showAddFestival && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative">
              <button
                onClick={() => setShowAddFestival(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
              <h2 className="text-xl font-semibold mb-6">Create New Festival</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newFestivalName}
                  onChange={(e) => setNewFestivalName(e.target.value)}
                  placeholder="Enter festival name"
                  className="w-full p-3 border rounded-lg"
                />
                <textarea
                  value={newFestivalDescription}
                  onChange={(e) => setNewFestivalDescription(e.target.value)}
                  placeholder="Enter festival description"
                  className="w-full p-3 border rounded-lg min-h-[100px] resize-y"
                />
                <button
                  type="button"
                  onClick={handleAddFestival}
                  className="w-full bg-purple-600 text-white px-6 py-3 rounded-full hover:bg-purple-700 transition-all transform hover:scale-105 shadow-lg shadow-purple-200"
                >
                  Create Festival
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Category Modal */}
        {showAddCategory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative">
              <button
                onClick={() => setShowAddCategory(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
              <h2 className="text-xl font-semibold mb-6">Create New Category</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  className="w-full p-3 border rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="w-full bg-purple-600 text-white px-6 py-3 rounded-full hover:bg-purple-700 transition-all transform hover:scale-105 shadow-lg shadow-purple-200"
                >
                  Create Category
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Media Upload Section */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-8 mb-8">
          {/* Media Type Toggle Buttons */}
          {selectedCategory && (
            <div className="flex justify-center gap-2 mb-6">
              <button
                type="button"
                onClick={() => setActiveCategoryMedia(prev => ({
                  ...prev,
                  [selectedCategory]: "image"
                }))}
                className={`px-6 py-2.5 rounded-full transition-all transform hover:scale-105 ${
                  activeCategoryMedia[selectedCategory] !== "video"
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                    : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
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
                className={`px-6 py-2.5 rounded-full transition-all transform hover:scale-105 ${
                  activeCategoryMedia[selectedCategory] === "video"
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                    : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                Videos
              </button>
            </div>
          )}

          {/* File Upload Area */}
          <div className="w-full">
            {!selectedFestival || !festivals.find(f => f.id === selectedFestival)?.categories?.length || !selectedCategory ? (
              <div className="w-full h-[100px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50">
                <span className="text-sm text-gray-500">
                  {!selectedFestival 
                    ? "Please select a festival first" 
                    : !festivals.find(f => f.id === selectedFestival)?.categories?.length
                      ? "Please create a category in this festival first"
                      : "Please select a category first"}
                </span>
              </div>
            ) : (
              <div className="relative w-full h-[100px] border-2 border-dashed border-purple-300 rounded-lg flex flex-col items-center justify-center hover:border-purple-500 transition-colors cursor-pointer bg-gray-50">
                <input
                  type="file"
                  onChange={handleMediaChange}
                  accept={
                    festivals
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
                  }
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  multiple
                />
                <Plus size={24} className="text-purple-400 mb-2" />
                <span className="text-sm text-purple-600">Add Media</span>
              </div>
            )}
          </div>

          {/* Submit Button - Moved here */}
          {selectedCategory && mediaFiles.length > 0 && (
            <div className="mt-6">
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={!areAllFilesUploaded()}
                className={`w-full px-6 py-3 rounded-full transition-all transform hover:scale-105 ${
                  !areAllFilesUploaded()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200'
                }`}
              >
                {!areAllFilesUploaded() 
                  ? 'Waiting for Upload to Complete...'
                  : 'Post Content'}
              </button>
            </div>
          )}

          {/* Media Previews */}
          {mediaFiles.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <div className="flex gap-4">
                {mediaFiles.map((media, index) => (
                  <div key={index} className="w-[200px] flex-shrink-0">
                    <div className="relative w-full aspect-[9/16]">
                      {media.type === 'video' ? (
                        <video
                          src={URL.createObjectURL(media.file)}
                          className="w-full h-full object-cover rounded-lg"
                          controls
                        />
                      ) : (
                        <img
                          src={URL.createObjectURL(media.file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2">
                        {media.url ? "Upload complete" : `Uploading: ${media.progress.toFixed(0)}%`}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInstagramShare(media)}
                        className="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white p-2 rounded-full hover:from-purple-700 hover:to-pink-600 transition-all"
                        title="Share to Instagram"
                      >
                        <Share size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Display Grid */}
        {selectedCategory && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {getFilteredPosts(selectedCategory, activeCategoryMedia[selectedCategory] === "video" ? "video" : "image")
              .map(post => (
                post.mediaFiles
                  .filter(media => 
                    media.type === (activeCategoryMedia[selectedCategory] === "video" ? "video" : "image") && 
                    media.categoryId === selectedCategory
                  )
                  .map((media, mediaIndex) => (
                    <div key={`${post.id}-${mediaIndex}`} className="relative group">
                      <div className="aspect-[9/16] rounded-2xl overflow-hidden">
                        {media.type === 'video' ? (
                          <video
                            src={media.url}
                            className="w-full h-full object-cover"
                            controls
                          />
                        ) : (
                          <img
                            src={media.url}
                            alt={`Post content ${mediaIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <button
                          onClick={(e) => handleDeletePostMedia(post.id, media.url, e)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      {post.text && (
                        <p className="text-gray-800 mt-2 text-sm text-center">{post.text}</p>
                      )}
                    </div>
                  ))
              ))
            }
          </div>
        )}

        {/* Access Code Modal */}
        {showAddAccessCode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative">
              <button
                onClick={() => setShowAddAccessCode(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
              <h2 className="text-xl font-semibold mb-6">Create Category Access Code</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newAccessCodeName}
                  onChange={(e) => setNewAccessCodeName(e.target.value)}
                  placeholder="Enter access code name"
                  className="w-full p-3 border rounded-lg"
                />
                <input
                  type="text"
                  value={newAccessCode}
                  onChange={(e) => setNewAccessCode(e.target.value)}
                  placeholder="Enter access code"
                  className="w-full p-3 border rounded-lg"
                />
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Select Categories for Access:
                  </label>
                  <div className="space-y-2">
                    {festivals
                      .find(f => f.id === selectedFestival)
                      ?.categories?.map(category => (
                        <label key={category.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedCategoryIds.includes(category.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategoryIds(prev => [...prev, category.id]);
                              } else {
                                setSelectedCategoryIds(prev => 
                                  prev.filter(id => id !== category.id)
                                );
                              }
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span>{category.name}</span>
                        </label>
                      ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddAccessCode}
                  className="w-full bg-purple-600 text-white px-6 py-3 rounded-full hover:bg-purple-700 transition-all transform hover:scale-105 shadow-lg shadow-purple-200"
                >
                  Create Access Code
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Access Codes Modal */}
        {showManageAccessCodes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative">
              <button
                onClick={() => setShowManageAccessCodes(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
              <h2 className="text-xl font-semibold mb-6">Manage Access Codes</h2>
              <div className="space-y-4">
                {festivals
                  .find(f => f.id === selectedFestival)
                  ?.categoryAccessCodes?.map(accessCode => (
                    <div key={accessCode.code} className="p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="font-medium text-lg">{accessCode.name}</span>
                          <div className="flex items-center space-x-2">
                            <Key size={14} className="text-gray-400" />
                            <span className="text-sm text-gray-500">{accessCode.code}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAccessCode(accessCode.code)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      
                      <div className="pt-2 border-t border-gray-200">
                        <span className="text-xs font-medium text-gray-600 block mb-2">
                          Categories:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {accessCode.categoryIds.map(categoryId => {
                            const category = festivals
                              .find(f => f.id === selectedFestival)
                              ?.categories?.find(c => c.id === categoryId);
                            
                            return category ? (
                              <span
                                key={categoryId}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                              >
                                {category.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                }
                <button
                  type="button"
                  onClick={() => {
                    setShowManageAccessCodes(false);
                    setShowAddAccessCode(true);
                  }}
                  className="w-full bg-purple-600 text-white px-6 py-3 rounded-full hover:bg-purple-700 transition-all transform hover:scale-105 shadow-lg shadow-purple-200 flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Add Access Code
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add this toast component near the end of the JSX, but before the closing div */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`px-6 py-3 rounded-full shadow-lg ${
            toast.type === 'success' 
              ? 'bg-purple-600 text-white shadow-purple-200' 
              : 'bg-red-500 text-white shadow-red-200'
          } transition-all transform animate-fade-in-up`}>
            <p className="text-center">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddPost;
