import React, { Suspense, useEffect, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, PerspectiveCamera, Html, useProgress } from "@react-three/drei";
import * as THREE from 'three';
import Sidebar from "./Sidebar";
import { auth, db, storage } from "../firebase";
import { useUserProfile } from '../contexts/UserProfileContext';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, addDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Plus, X, Upload, Share, Download, Trash2 } from 'lucide-react';

interface Festival {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  date: string;
  time: string;
  categories?: Category[];
}

interface Category {
  id: string;
  name: string;
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

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="text-white text-xl">
        {progress.toFixed(0)}% loaded
      </div>
    </Html>
  )
}

function InnerSphere() {
  return (
    <>
      <Environment preset="sunset" />
      <PerspectiveCamera makeDefault position={[0, 0, 0]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      
      <mesh scale={[-15, -15, -15]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          side={THREE.BackSide}
          color="#1a1a1a"
          metalness={0.9}
          roughness={0.1}
          envMapIntensity={1}
        />
      </mesh>
    </>
  )
}

const FestivalManagement: React.FC = () => {
  const [isNavOpen, setIsNavOpen] = React.useState(false);
  const { userProfile } = useUserProfile();
  const { festivalId } = useParams();
  const [festival, setFestival] = useState<Festival | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedMediaType, setSelectedMediaType] = useState<"image" | "video">("image");
  const [newCategory, setNewCategory] = useState({
    name: ""
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  useEffect(() => {
    const fetchFestival = async () => {
      if (!festivalId) return;

      try {
        const festivalDoc = await getDoc(doc(db, "festivals", festivalId));
        if (festivalDoc.exists()) {
          const festivalData = {
            id: festivalDoc.id,
            ...festivalDoc.data()
          } as Festival;
          setFestival(festivalData);
          
          // Automatically select the first category if available
          if (festivalData.categories && festivalData.categories.length > 0) {
            setSelectedCategory(festivalData.categories[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching festival:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFestival();
  }, [festivalId]);

  useEffect(() => {
    if (!festivalId) return;

    const postsQuery = query(
      collection(db, "posts"),
      where("festivalId", "==", festivalId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      try {
        const newPosts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];
        console.log("Fetched posts:", newPosts); // Debug log
        setPosts(newPosts);
      } catch (error) {
        console.error("Error processing posts:", error);
      }
    });

    return () => unsubscribe();
  }, [festivalId]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log("Auth state changed:", user?.uid); // Debug log
      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!festival || !festivalId) return;

    try {
      const newCategoryData = {
        id: crypto.randomUUID(),
        name: newCategory.name
      };

      const festivalRef = doc(db, "festivals", festivalId);
      await updateDoc(festivalRef, {
        categories: arrayUnion(newCategoryData)
      });

      // Update local state
      setFestival(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: [...(prev.categories || []), newCategoryData]
        };
      });

      // Reset form and close modal
      setNewCategory({ name: "" });
      setShowCategoryModal(false);
    } catch (error) {
      console.error("Error creating category:", error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCategory) {
      alert("Please select a category first");
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (event.target.files && event.target.files.length > 0) {
      setSelectedFiles(event.target.files);
      handleUploadWithCategory(event.target.files);
    }
  };

  const handleUploadWithCategory = async (files: FileList) => {
    if (!files || !festival || !festivalId || !selectedCategory) {
      console.error("Missing required data for upload");
      return;
    }

    // Check if user is authenticated
    if (!auth.currentUser) {
      console.error("User not authenticated");
      return;
    }

    const userId = auth.currentUser.uid;
    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isVideo && !isImage) {
          console.error("Invalid file type:", file.type);
          continue;
        }

        // Different size limits for images and videos
        const maxImageSize = 10 * 1024 * 1024; // 10MB for images
        const maxVideoSize = 100 * 1024 * 1024; // 100MB for videos
        const maxSize = isVideo ? maxVideoSize : maxImageSize;

        if (file.size > maxSize) {
          alert(`File too large: ${file.name}. Maximum size for ${isVideo ? 'videos' : 'images'} is ${maxSize / (1024 * 1024)}MB`);
          continue;
        }

        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const filePath = `media/${userId}/${fileName}`;
        const fileRef = ref(storage, filePath);

        try {
          const snapshot = await uploadBytes(fileRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);

          // Add post to Firestore with category
          const postData = {
            text: "",
            mediaFiles: [{
              url: downloadURL,
              type: isVideo ? "video" : "image",
              categoryId: selectedCategory
            }],
            userId: userId,
            createdAt: new Date().toISOString(),
            festivalId: festivalId
          };

          await addDoc(collection(db, "posts"), postData);
          setUploadProgress(((i + 1) / files.length) * 100);
        } catch (uploadError: any) {
          console.error("Error in upload process:", uploadError);
          continue;
        }
      }
    } catch (error: any) {
      console.error("Error in main upload process:", error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setSelectedFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (url: string, mediaType: string, postId: string, festivalId: string, categoryId?: string, mediaIndex?: number) => {
    try {
      // Create download record
      if (auth.currentUser) {
        await addDoc(collection(db, "downloads"), {
          postId,
          mediaType,
          mediaIndex: mediaIndex || 0,
          downloadedAt: serverTimestamp(),
          userId: auth.currentUser.uid,
          festivalId,
          categoryId,
          url
        });
      }

      // Start the download
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create and trigger download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `media_${postId}_${mediaIndex || 0}.${mediaType === 'video' ? 'mp4' : 'jpg'}`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading media:', error);
      alert('Failed to download media. Please try again.');
    }
  };

  const handleInstagramShare = async (url: string, type: string, postId: string, festivalId: string, categoryId?: string, mediaIndex: number = 0) => {
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
            
            // Add share record to Firestore
            if (auth.currentUser) {
              await addDoc(collection(db, 'messages'), {
                type: 'shared_post',
                postId: postId,
                mediaIndex: mediaIndex,
                senderId: auth.currentUser.uid,
                receiverId: 'instagram',
                festivalId: festivalId,
                categoryId: categoryId,
                timestamp: serverTimestamp(),
                platform: 'instagram'
              });
            }
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

  const handleDelete = async (post: Post, mediaFile: { url: string; type: string }, mediaIndex: number) => {
    if (!window.confirm('Are you sure you want to delete this content? This action cannot be undone.')) {
      return;
    }

    try {
      // Get the storage reference from the URL
      const storageRef = ref(storage, mediaFile.url);
      
      // Delete the file from Firebase Storage
      await deleteObject(storageRef);

      // If this is the only media file in the post, delete the entire post
      if (post.mediaFiles.length === 1) {
        await deleteDoc(doc(db, "posts", post.id));
      } else {
        // Otherwise, remove just this media file from the post
        const updatedMediaFiles = post.mediaFiles.filter((_, index) => index !== mediaIndex);
        await updateDoc(doc(db, "posts", post.id), {
          mediaFiles: updatedMediaFiles
        });
      }

      console.log('Content deleted successfully');
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Failed to delete content. Please try again.');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      if (!festival || !festivalId) return;

      // Get all posts with media in this category
      const postsSnapshot = await getDocs(
        query(collection(db, "posts"), where("festivalId", "==", festivalId))
      );

      // Delete all media files from storage and posts from Firestore
      const batch = writeBatch(db);
      for (const postDoc of postsSnapshot.docs) {
        const post = postDoc.data() as Post;
        const mediaFilesInCategory = post.mediaFiles.filter(media => media.categoryId === categoryId);
        
        // Delete media files from storage
        for (const media of mediaFilesInCategory) {
          const storageRef = ref(storage, media.url);
          try {
            await deleteObject(storageRef);
          } catch (error) {
            console.error('Error deleting media file:', error);
          }
        }

        // If all media files in the post are in this category, delete the post
        if (post.mediaFiles.every(media => media.categoryId === categoryId)) {
          batch.delete(postDoc.ref);
        } else {
          // Otherwise, update the post to remove media files from this category
          const updatedMediaFiles = post.mediaFiles.filter(media => media.categoryId !== categoryId);
          batch.update(postDoc.ref, { mediaFiles: updatedMediaFiles });
        }
      }

      // Update festival document to remove the category
      const updatedCategories = festival.categories?.filter(cat => cat.id !== categoryId) || [];
      batch.update(doc(db, "festivals", festivalId), {
        categories: updatedCategories
      });

      await batch.commit();

      // Update local state
      setFestival(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: prev.categories?.filter(cat => cat.id !== categoryId)
        };
      });

      // Reset selected category if it was the deleted one
      if (selectedCategory === categoryId) {
        setSelectedCategory("");
      }

      setShowDeleteModal(null);
      console.log('Category and associated content deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category. Please try again.');
    }
  };

  // Filter posts based on selected media type AND selected category
  const filteredPosts = posts.filter(post => 
    post.mediaFiles.some(media => 
      media.type === selectedMediaType && 
      media.categoryId === selectedCategory
    )
  );

  console.log("Filtered posts:", filteredPosts); // Debug log
  console.log("Selected media type:", selectedMediaType); // Debug log

  // Don't render until auth state is checked
  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white/50 text-sm font-['Space_Grotesk']">
          Checking authentication...
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!auth.currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white/50 text-sm font-['Space_Grotesk']">
          Please sign in to access this page
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-y-auto bg-black">
      {/* Three.js Background - Fixed position */}
      <div className="fixed inset-0">
        <Canvas
          className="w-full h-full"
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={<Loader />}>
            <InnerSphere />
          </Suspense>
        </Canvas>
      </div>

      {/* Sidebar - Fixed position */}
      <Sidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={auth.currentUser}
        userProfile={userProfile}
        accessibleFestivalsCount={0}
      />

      {/* Main Content - Scrollable */}
      <div className="relative z-10 min-h-screen pt-24 px-8 md:px-16 lg:px-32">
        {festival && (
          <div className="mb-12 grid grid-cols-1 gap-8 max-w-[1400px] mx-auto pb-24">
            {/* Festival Header */}
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl 
                          shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                          p-8 border border-white/20">
              <div className="flex flex-col md:flex-row items-start gap-6">
                {/* Left side with festival info */}
                <div className="flex-1 flex items-center gap-6">
                  <div className="flex-shrink-0">
                    <img
                      src={festival.imageUrl}
                      alt={festival.name}
                      className="h-32 w-32 rounded-xl object-cover shadow-lg border border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-['Space_Grotesk'] tracking-wide text-white/90">
                      {festival.name}
                    </h1>
                    <div className="flex items-center gap-3 text-sm text-white/50 font-['Space_Grotesk']">
                      <span>
                        {new Date(festival.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      <span>•</span>
                      <span>{festival.time}</span>
                    </div>
                    <p className="text-white/60 text-sm font-['Space_Grotesk'] max-w-2xl">
                      {festival.description}
                    </p>
                  </div>
                </div>

                {/* Right side with create button */}
                <div className="flex-shrink-0">
                  <button
                    onClick={() => setShowCategoryModal(true)}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 
                             border border-white/20 hover:border-white/30
                             rounded-xl backdrop-blur-lg
                             transition-all duration-300 ease-in-out
                             text-white text-sm font-['Space_Grotesk'] tracking-wide
                             flex items-center justify-center gap-2
                             hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                  >
                    <Plus size={18} />
                    Create Categories
                  </button>
                </div>
              </div>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-w-[1000px]">
              {festival.categories?.map((category) => (
                <div
                  key={category.id}
                  className="relative group"
                >
                  <button
                    onClick={() => setSelectedCategory(category.id)}
                    className={`backdrop-blur-xl rounded-xl p-3 text-center w-full
                             transition-all duration-300 group
                             ${selectedCategory === category.id 
                               ? 'bg-white/20 border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.1)]' 
                               : 'bg-white/5 border-white/10 hover:bg-white/10'
                             }
                             border hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]`}
                  >
                    <h3 className={`text-sm font-['Space_Grotesk'] transition-all duration-300
                                  ${selectedCategory === category.id 
                                    ? 'text-white' 
                                    : 'text-white/70 group-hover:text-white/90'
                                  }`}>
                      {category.name}
                    </h3>
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(category.id)}
                    className="absolute -top-1 -right-1 p-1.5 rounded-full 
                             bg-red-500/20 opacity-0 group-hover:opacity-100
                             transition-all duration-300
                             hover:bg-red-500/40 border border-red-500/40
                             hover:border-red-500/60"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>

            {/* Upload Content Button and File Input */}
            <div className="flex justify-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,video/*"
                multiple
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="group px-8 py-4 bg-white/10 hover:bg-white/20 
                         border border-white/20 hover:border-white/30
                         rounded-xl backdrop-blur-lg
                         transition-all duration-300 ease-in-out
                         text-white font-['Space_Grotesk'] tracking-wider
                         flex items-center gap-3
                         hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className={`w-5 h-5 transition-transform group-hover:scale-110 
                                ${uploading ? 'animate-bounce' : ''}`} />
                {uploading ? `Uploading ${uploadProgress.toFixed(0)}%` : 'Upload Content'}
              </button>
            </div>

            {/* Media Type Toggle */}
            <div className="flex justify-center">
              <div className="inline-flex bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setSelectedMediaType("image")}
                  className={`px-8 py-3 rounded-lg font-['Space_Grotesk'] text-sm
                           transition-all duration-300 ${
                    selectedMediaType === "image"
                      ? "bg-white/10 text-white shadow-lg border border-white/20"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  Images
                </button>
                <button
                  onClick={() => setSelectedMediaType("video")}
                  className={`px-8 py-3 rounded-lg font-['Space_Grotesk'] text-sm
                           transition-all duration-300 ${
                    selectedMediaType === "video"
                      ? "bg-white/10 text-white shadow-lg border border-white/20"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  Videos
                </button>
              </div>
            </div>

            {/* Media Content Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {selectedCategory ? (
                filteredPosts.length > 0 ? (
                  filteredPosts.map((post) => (
                    post.mediaFiles.map((media, mediaIndex) => (
                      <div
                        key={`${post.id}-${mediaIndex}`}
                        className="aspect-[9/16] rounded-xl overflow-hidden 
                                 backdrop-blur-xl bg-white/5 border border-white/10
                                 group hover:border-white/20 transition-all duration-300
                                 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]
                                 relative"
                      >
                        {media.type === "video" ? (
                          <video
                            src={media.url}
                            className="w-full h-full object-cover"
                            controls
                          />
                        ) : (
                          <img
                            src={media.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute top-2 right-2">
                          <button
                            onClick={() => handleDelete(post, media, mediaIndex)}
                            className="bg-red-500/20 text-white p-2 rounded-full opacity-0 
                                     group-hover:opacity-100 transition-all duration-300
                                     hover:bg-red-500/40 border border-red-500/40
                                     hover:border-red-500/60"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="absolute bottom-2 right-2 flex gap-2">
                          <button
                            onClick={() => handleInstagramShare(
                              media.url, 
                              media.type, 
                              post.id, 
                              post.festivalId, 
                              media.categoryId, 
                              mediaIndex
                            )}
                            className="bg-white/10 text-white p-2 rounded-full opacity-0 
                                     group-hover:opacity-100 transition-all duration-300
                                     hover:bg-white/20 border border-white/20"
                          >
                            <Share className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(
                              media.url, 
                              media.type, 
                              post.id, 
                              post.festivalId, 
                              media.categoryId, 
                              mediaIndex
                            )}
                            className="bg-white/10 text-white p-2 rounded-full opacity-0 
                                     group-hover:opacity-100 transition-all duration-300
                                     hover:bg-white/20 border border-white/20"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <p className="text-white/50 font-['Space_Grotesk']">
                      No {selectedMediaType}s in this category yet
                    </p>
                  </div>
                )
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-white/50 font-['Space_Grotesk']">
                    Select a category to view content
                  </p>
                </div>
              )}
            </div>

            {/* Create Category Modal */}
            {showCategoryModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-xl flex items-center justify-center z-50 p-4">
                <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-md w-full mx-4 
                              border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-['Space_Grotesk'] text-white/90">Create New Category</h2>
                    <button
                      onClick={() => setShowCategoryModal(false)}
                      className="text-white/50 hover:text-white/90 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateCategory} className="space-y-4">
                    <div>
                      <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                        Category Name
                      </label>
                      <input
                        type="text"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                                 text-white placeholder-white/30 font-['Space_Grotesk']
                                 focus:outline-none focus:border-white/30
                                 transition-all duration-300"
                        placeholder="Enter category name"
                        required
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCategoryModal(false)}
                        className="flex-1 px-6 py-3 rounded-xl border border-white/10
                                 text-white/70 font-['Space_Grotesk']
                                 hover:bg-white/5 transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-6 py-3 rounded-xl bg-white/10
                                 border border-white/20 hover:border-white/30
                                 text-white font-['Space_Grotesk']
                                 hover:bg-white/20 transition-all duration-300"
                      >
                        Create Category
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-xl flex items-center justify-center z-50 p-4">
                <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-md w-full mx-4 
                              border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-['Space_Grotesk'] text-white/90">Delete Category</h2>
                    <button
                      onClick={() => setShowDeleteModal(null)}
                      className="text-white/50 hover:text-white/90 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <p className="text-white/70 font-['Space_Grotesk']">
                      Are you sure you want to delete this category? This will permanently remove all content within this category.
                    </p>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setShowDeleteModal(null)}
                        className="flex-1 px-6 py-3 rounded-xl border border-white/10
                                 text-white/70 font-['Space_Grotesk']
                                 hover:bg-white/5 transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(showDeleteModal)}
                        className="flex-1 px-6 py-3 rounded-xl bg-red-500/10
                                 border border-red-500/20 hover:border-red-500/30
                                 text-red-500 font-['Space_Grotesk']
                                 hover:bg-red-500/20 transition-all duration-300"
                      >
                        Delete Category
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-white/50 text-sm font-['Space_Grotesk']">
              Loading festival details...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FestivalManagement; 