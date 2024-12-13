import React, { Suspense, useEffect, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, PerspectiveCamera, Html, useProgress } from "@react-three/drei";
import * as THREE from 'three';
import BusinessSidebar from "./BusinessSidebar";
import { auth, db, storage } from "../firebase";
import { useUserProfile } from '../contexts/UserProfileContext';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, addDoc, collection, query, where, orderBy, onSnapshot, serverTimestamp, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable } from 'firebase/storage';
import { Plus, X, Upload, Share, Download, Trash2, ArrowLeft, Key, Menu } from 'lucide-react';

interface Festival {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  date: string;
  startTime: string;
  endTime: string;
  categories?: Category[];
  categoryAccessCodes?: {
    code: string;
    name: string;
    categoryIds: string[];
    createdAt: any;
  }[];
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
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white/90
                       animate-spin" />
        <div className="text-white/70 text-sm font-['Space_Grotesk'] tracking-wider">
          {progress.toFixed(0)}% loaded
        </div>
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
  const navigate = useNavigate();
  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);
  const [newAccessCode, setNewAccessCode] = useState({
    name: "",
    code: "",
    categoryIds: [] as string[]
  });
  const [showCreateAccessCode, setShowCreateAccessCode] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedFestival, setEditedFestival] = useState<{
    name: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    imageUrl: string;
  }>({ name: '', description: '', date: '', startTime: '', endTime: '', imageUrl: '' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{post: Post, mediaIndex: number} | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [toast]);

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
    if (event.target.files && event.target.files.length > 0) {
      // Convert FileList to Array to ensure we keep all files
      const filesArray = Array.from(event.target.files);
      setSelectedFiles(event.target.files);
      setShowUploadModal(true);
      setUploadCategory("");
    }
  };

  const handleConfirmUpload = () => {
    if (!uploadCategory || !selectedFiles) {
      setToast({
        message: "Please select a category for your upload",
        type: 'error'
      });
      return;
    }

    // Create a new FileList from the selected files
    const files = selectedFiles;
    handleUploadWithCategory(files);
    setShowUploadModal(false);
    setUploadCategory("");
    
    // Clear the file input for next upload
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadWithCategory = async (files: FileList) => {
    if (!files || !festival || !festivalId || !uploadCategory) {
      console.error("Missing required data for upload");
      return;
    }

    if (!auth.currentUser) {
      console.error("User not authenticated");
      return;
    }

    const userId = auth.currentUser.uid;
    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadPromises = [];
      const uploadedFiles = [];
      const totalFiles = files.length;

      // Create upload promises for all files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isVideo && !isImage) {
          console.error("Invalid file type:", file.type);
          continue;
        }

        const maxImageSize = 30 * 1024 * 1024;
        const maxVideoSize = 300 * 1024 * 1024;
        const maxSize = isVideo ? maxVideoSize : maxImageSize;

        if (file.size > maxSize) {
          setToast({
            message: `File too large: ${file.name}. Maximum size for ${isVideo ? 'videos is 300MB' : 'images is 30MB'}`,
            type: 'error'
          });
          continue;
        }

        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const filePath = `media/${userId}/${fileName}`;
        const fileRef = ref(storage, filePath);

        const uploadPromise = new Promise<{ url: string; type: "image" | "video" }>((resolve, reject) => {
          const uploadTask = uploadBytesResumable(fileRef, file);

          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              // Update progress for this specific file
              setToast({
                message: `Uploading ${i + 1}/${files.length} files: ${fileProgress.toFixed(1)}%`,
                type: 'success'
              });
            },
            (error) => {
              console.error("Upload error:", error);
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({
                  url: downloadURL,
                  type: isVideo ? "video" : "image"
                });
              } catch (error) {
                reject(error);
              }
            }
          );
        });

        uploadPromises.push(uploadPromise);
      }

      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);

      // Create the post with all uploaded files
      const postData = {
        text: "",
        mediaFiles: results.map(result => ({
          ...result,
          categoryId: uploadCategory
        })),
        userId: userId,
        createdAt: new Date().toISOString(),
        festivalId: festivalId
      };

      await addDoc(collection(db, "posts"), postData);

      setToast({
        message: `Successfully uploaded ${results.length} files`,
        type: 'success'
      });

    } catch (error) {
      console.error("Error in upload process:", error);
      setToast({
        message: "Error uploading files. Please try again.",
        type: 'error'
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setSelectedFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Helper function to format bytes into readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const handleDelete = async (post: Post, mediaIndex: number) => {
    setShowDeleteConfirm({ post, mediaIndex });
  };

  const handleConfirmDelete = async () => {
    if (!showDeleteConfirm || !auth.currentUser) {
      return;
    }

    const { post, mediaIndex } = showDeleteConfirm;
    const mediaFile = post.mediaFiles[mediaIndex];

    try {
      // Delete the specific file from Storage
      try {
        const fileUrl = new URL(mediaFile.url);
        const filePath = decodeURIComponent(fileUrl.pathname.split('/o/')[1].split('?')[0]);
        const fileRef = ref(storage, filePath);
        await deleteObject(fileRef);
      } catch (storageError) {
        console.error("Error deleting file from storage:", storageError);
      }

      // Update the post document to remove only the specific media file
      const updatedMediaFiles = post.mediaFiles.filter((_, index) => index !== mediaIndex);

      if (updatedMediaFiles.length === 0) {
        // If this was the last media file, delete the entire post
        await deleteDoc(doc(db, "posts", post.id));
        setPosts(prevPosts => prevPosts.filter(p => p.id !== post.id));
      } else {
        // Otherwise, update the post with the remaining media files
        await updateDoc(doc(db, "posts", post.id), {
          mediaFiles: updatedMediaFiles
        });
        
        // Update local state
        setPosts(prevPosts => prevPosts.map(p => {
          if (p.id === post.id) {
            return {
              ...p,
              mediaFiles: updatedMediaFiles
            };
          }
          return p;
        }));
      }

      setToast({
        message: "Content deleted successfully",
        type: 'success'
      });

    } catch (error) {
      console.error("Error deleting content:", error);
      setToast({
        message: "Failed to delete content. Please try again.",
        type: 'error'
      });
    } finally {
      setShowDeleteConfirm(null);
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

  const handleCreateAccessCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!festivalId) return;

    try {
      const festivalRef = doc(db, "festivals", festivalId);
      const accessCode = {
        name: newAccessCode.name,
        code: newAccessCode.code.toLowerCase().trim(),
        categoryIds: newAccessCode.categoryIds,
        createdAt: new Date().toISOString()
      };

      // Get current access codes
      const festivalDoc = await getDoc(festivalRef);
      const currentAccessCodes = festivalDoc.data()?.categoryAccessCodes || [];

      // Update with new array including the new access code
      await updateDoc(festivalRef, {
        categoryAccessCodes: [...currentAccessCodes, accessCode]
      });

      setShowAccessCodeModal(false);
      setNewAccessCode({ name: "", code: "", categoryIds: [] });
      
      // Update local state
      setFestival(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          categoryAccessCodes: [...(prev.categoryAccessCodes || []), accessCode]
        };
      });

    } catch (error) {
      console.error("Error creating access code:", error);
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

  const handleImageUpload = async (file: File) => {
    if (!festivalId) return;
    
    try {
      const imageRef = ref(storage, `festivals/${festivalId}/${file.name}`);
      await uploadBytes(imageRef, file);
      const imageUrl = await getDownloadURL(imageRef);
      return imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleSaveFestival = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!festivalId) return;

    try {
      await updateDoc(doc(db, "festivals", festivalId), {
        name: editedFestival.name,
        description: editedFestival.description,
        date: editedFestival.date,
        startTime: editedFestival.startTime,
        endTime: editedFestival.endTime,
        imageUrl: editedFestival.imageUrl,
      });

      // Update local state
      setFestival(prev => prev ? {
        ...prev,
        ...editedFestival
      } : null);

      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating festival:', error);
      alert('Failed to update festival details');
    }
  };

  const handleImageClick = () => {
    if (festival) {
      setEditedFestival({
        name: festival.name,
        description: festival.description,
        date: festival.date,
        startTime: festival.startTime || '',
        endTime: festival.endTime || '',
        imageUrl: festival.imageUrl,
      });
      setShowEditModal(true);
    }
  };

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

      {/* Add Mobile Navigation */}
      <div className="md:hidden flex justify-between items-center p-4 fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-sm">
        <button
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="text-white hover:text-white/80 transition-colors duration-300"
        >
          <Menu size={28} />
        </button>
        
        {/* Add Sonder text - only visible on mobile */}
        <h1 className="text-2xl font-bold text-white hover:text-white/80 transition-colors duration-300">
          SONDER
        </h1>
      </div>

      {/* Sidebar - Fixed position */}
      <BusinessSidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={auth.currentUser}
        userProfile={userProfile}
        accessibleFestivalsCount={0}
      />

      {/* Main Content - Add padding-top to account for fixed header on mobile */}
      <div className="relative z-10 min-h-screen pt-16 md:pt-20 px-4 sm:px-8 md:px-16 lg:px-32">
        {festival && (
          <div className="mb-12 grid grid-cols-1 gap-8 max-w-[1400px] mx-auto pb-24">
            {/* Festival Header */}
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl 
                          shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                          p-4 sm:p-8 border border-white/20">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
                {/* Left side with festival info */}
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div 
                    className="flex-shrink-0 cursor-pointer"
                    onClick={handleImageClick}
                  >
                    <img
                      src={festival.imageUrl}
                      alt={festival.name}
                      className="h-24 w-24 sm:h-32 sm:w-32 rounded-xl object-cover shadow-lg border border-white/10
                                hover:border-white/30 transition-all duration-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-['Space_Grotesk'] tracking-wide text-white/90">
                      {festival.name}
                    </h1>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-white/50 font-['Space_Grotesk']">
                      <span>
                        {new Date(festival.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <span>{festival.startTime} - {festival.endTime}</span>
                    </div>
                    <p className="text-white/60 text-sm font-['Space_Grotesk'] max-w-2xl">
                      {festival.description}
                    </p>
                  </div>
                </div>

                {/* Right side with buttons */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => navigate('/add-post')}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 
                              border border-white/20 hover:border-white/30
                              rounded-xl backdrop-blur-lg
                              transition-all duration-300 ease-in-out
                              text-white text-sm font-['Space_Grotesk'] tracking-wide
                              flex items-center justify-center
                              hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]
                              w-fit flex-shrink-0"
                  >
                    Back to Festivals
                  </button>

                  <button
                    onClick={() => setShowAccessCodeModal(true)}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 
                              border border-white/20 hover:border-white/30
                              rounded-xl backdrop-blur-lg
                              transition-all duration-300 ease-in-out
                              text-white text-sm font-['Space_Grotesk'] tracking-wide
                              flex items-center justify-center gap-2
                              hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]
                              w-fit flex-shrink-0"
                  >
                    <Key size={18} />
                    Access Codes
                  </button>

                  <button
                    onClick={() => setShowCategoryModal(true)}
                    className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 
                              border border-white/20 hover:border-white/30
                              rounded-xl backdrop-blur-lg
                              transition-all duration-300 ease-in-out
                              text-white text-sm font-['Space_Grotesk'] tracking-wide
                              flex items-center justify-center gap-2
                              hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]
                              w-fit flex-shrink-0"
                  >
                    <Plus size={18} />
                    Create Categories
                  </button>
                </div>
              </div>
            </div>

            {/* Categories Grid - Update grid columns for mobile */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 max-w-[1000px]">
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
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                ref={fileInputRef}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedCategory}
                className={`px-6 py-3 rounded-xl backdrop-blur-lg
                            transition-all duration-300 ease-in-out
                            text-white text-sm font-['Space_Grotesk'] tracking-wide
                            flex items-center justify-center gap-2
                            ${!selectedCategory 
                              ? 'bg-white/5 border border-white/10 text-white/50 cursor-not-allowed' 
                              : 'bg-white/10 border border-white/20 hover:bg-white/20 hover:border-white/30 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]'
                            }
                            ${uploading ? 'animate-bounce' : ''}`}
              >
                <Upload className={`w-4 h-4 ${uploading ? 'animate-bounce' : ''}`} />
                {uploading ? `Uploading ${uploadProgress.toFixed(0)}%` : 'Upload Files'}
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

            {/* Media Content Grid - Update grid columns and spacing for mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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
                            onClick={() => handleDelete(post, mediaIndex)}
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
                <div className="bg-[#1a1a1a] rounded-2xl p-4 sm:p-6 max-w-md w-full mx-4 
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

            {/* Access Code Modal */}
            {showAccessCodeModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-xl flex items-center justify-center z-50 p-4">
                <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-md w-full mx-4 
                              border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  {!showCreateAccessCode ? (
                    // Overview of existing access codes
                    <>
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-['Space_Grotesk'] text-white/90">Access Codes</h2>
                        <button
                          onClick={() => setShowAccessCodeModal(false)}
                          className="text-white/50 hover:text-white/90 transition-colors"
                        >
                          <X size={24} />
                        </button>
                      </div>

                      <div className="space-y-4 max-h-[60vh] overflow-y-auto mb-6">
                        {festival?.categoryAccessCodes && festival.categoryAccessCodes.length > 0 ? (
                          festival.categoryAccessCodes.map((accessCode, index) => (
                            <div 
                              key={index}
                              className="p-4 rounded-xl bg-white/5 border border-white/10
                                       hover:border-white/20 transition-all duration-300"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="text-white font-['Space_Grotesk']">{accessCode.name}</h3>
                                <span className="text-white/60 font-mono text-sm">{accessCode.code}</span>
                              </div>
                              <div className="text-white/50 text-sm font-['Space_Grotesk']">
                                Categories: {accessCode.categoryIds.map(catId => 
                                  festival.categories?.find(cat => cat.id === catId)?.name
                                ).filter(Boolean).join(", ")}
                              </div>
                              <div className="text-white/30 text-xs font-['Space_Grotesk'] mt-2">
                                Created: {new Date(accessCode.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-white/50 font-['Space_Grotesk']">No access codes created yet</p>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setShowCreateAccessCode(true)}
                        className="w-full px-6 py-3 rounded-xl bg-white/10
                                 border border-white/20 hover:border-white/30
                                 text-white font-['Space_Grotesk']
                                 hover:bg-white/20 transition-all duration-300
                                 flex items-center justify-center gap-2"
                      >
                        <Plus size={18} />
                        Create Access Code
                      </button>
                    </>
                  ) : (
                    // Create new access code form
                    <>
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-['Space_Grotesk'] text-white/90">Create Access Code</h2>
                        <button
                          onClick={() => setShowCreateAccessCode(false)}
                          className="text-white/50 hover:text-white/90 transition-colors"
                        >
                          <X size={24} />
                        </button>
                      </div>

                      <form onSubmit={handleCreateAccessCode} className="space-y-4">
                        <div>
                          <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                            Access Code Name
                          </label>
                          <input
                            type="text"
                            value={newAccessCode.name}
                            onChange={(e) => setNewAccessCode(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                                     text-white placeholder-white/30 font-['Space_Grotesk']
                                     focus:outline-none focus:border-white/30
                                     transition-all duration-300"
                            placeholder="Enter access code name"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                            Access Code
                          </label>
                          <input
                            type="text"
                            value={newAccessCode.code}
                            onChange={(e) => setNewAccessCode(prev => ({ ...prev, code: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                                     text-white placeholder-white/30 font-['Space_Grotesk']
                                     focus:outline-none focus:border-white/30
                                     transition-all duration-300"
                            placeholder="Enter access code"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                            Select Categories
                          </label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {festival?.categories?.map((category) => (
                              <label key={category.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={newAccessCode.categoryIds.includes(category.id)}
                                  onChange={(e) => {
                                    setNewAccessCode(prev => ({
                                      ...prev,
                                      categoryIds: e.target.checked
                                        ? [...prev.categoryIds, category.id]
                                        : prev.categoryIds.filter(id => id !== category.id)
                                    }));
                                  }}
                                  className="form-checkbox rounded bg-white/5 border-white/20 text-white/90"
                                />
                                <span className="text-white/70 font-['Space_Grotesk']">{category.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <button
                            type="button"
                            onClick={() => setShowCreateAccessCode(false)}
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
                            Create Access Code
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Edit Festival Modal */}
            {showEditModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-xl flex items-center justify-center z-50 p-4">
                <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-2xl w-full mx-4 
                                border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-['Space_Grotesk'] text-white/90">Edit Festival Details</h2>
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="text-white/50 hover:text-white/90 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveFestival} className="space-y-4">
                    {/* Festival Image */}
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-['Space_Grotesk'] text-white/60">
                        Festival Image
                      </label>
                      <div className="flex items-center gap-4">
                        <img
                          src={editedFestival.imageUrl}
                          alt="Festival"
                          className="h-24 w-24 rounded-xl object-cover border border-white/10"
                        />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const imageUrl = await handleImageUpload(file);
                                if (imageUrl) {
                                  setEditedFestival(prev => ({ ...prev, imageUrl }));
                                }
                              } catch (error) {
                                alert('Failed to upload image');
                              }
                            }
                          }}
                          className="text-sm text-white/70 file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0 file:text-sm
                                    file:bg-white/10 file:text-white/70
                                    hover:file:bg-white/20 file:transition-all
                                    file:cursor-pointer file:font-['Space_Grotesk']"
                        />
                      </div>
                    </div>

                    {/* Festival Name */}
                    <div>
                      <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                        Festival Name
                      </label>
                      <input
                        type="text"
                        value={editedFestival.name}
                        onChange={(e) => setEditedFestival(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                                  text-white placeholder-white/30 font-['Space_Grotesk']
                                  focus:outline-none focus:border-white/30
                                  transition-all duration-300"
                        required
                      />
                    </div>

                    {/* Festival Description */}
                    <div>
                      <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                        Description
                      </label>
                      <textarea
                        value={editedFestival.description}
                        onChange={(e) => setEditedFestival(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                                  text-white placeholder-white/30 font-['Space_Grotesk']
                                  focus:outline-none focus:border-white/30
                                  transition-all duration-300 min-h-[100px]"
                        required
                      />
                    </div>

                    {/* Date and Time */}
                    <div className="space-y-4">
                      {/* Date Input */}
                      <div>
                        <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                          Date
                        </label>
                        <input
                          type="date"
                          value={editedFestival.date}
                          onChange={(e) => setEditedFestival(prev => ({ ...prev, date: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                                    text-white placeholder-white/30 font-['Space_Grotesk']
                                    focus:outline-none focus:border-white/30
                                    transition-all duration-300"
                          required
                        />
                      </div>

                      {/* Time Inputs */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={editedFestival.startTime}
                            onChange={(e) => setEditedFestival(prev => ({ ...prev, startTime: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                                      text-white placeholder-white/30 font-['Space_Grotesk']
                                      focus:outline-none focus:border-white/30
                                      transition-all duration-300"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={editedFestival.endTime}
                            onChange={(e) => setEditedFestival(prev => ({ ...prev, endTime: e.target.value }))}
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
                                      text-white placeholder-white/30 font-['Space_Grotesk']
                                      focus:outline-none focus:border-white/30
                                      transition-all duration-300"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowEditModal(false)}
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
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-xl flex items-center justify-center z-50 p-4">
                <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-md w-full mx-4 
                                border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-['Space_Grotesk'] text-white/90">Select Upload Category</h2>
                    <button
                      onClick={() => {
                        setShowUploadModal(false);
                        setSelectedFiles(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-white/50 hover:text-white/90 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                        Selected Files
                      </label>
                      <div className="text-white/70 text-sm font-['Space_Grotesk']">
                        {selectedFiles ? `${selectedFiles.length} file(s) selected` : 'No files selected'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                        Choose Category
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {festival?.categories?.map((category) => (
                          <button
                            key={category.id}
                            onClick={() => setUploadCategory(category.id)}
                            className={`p-3 rounded-xl border text-sm font-['Space_Grotesk']
                                       transition-all duration-300
                                       ${uploadCategory === category.id
                                         ? 'bg-white/20 border-white/30 text-white'
                                         : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
                                       }`}
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => {
                          setShowUploadModal(false);
                          setSelectedFiles(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="flex-1 px-6 py-3 rounded-xl border border-white/10
                                  text-white/70 font-['Space_Grotesk']
                                  hover:bg-white/5 transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmUpload}
                        disabled={!uploadCategory}
                        className={`flex-1 px-6 py-3 rounded-xl
                                   font-['Space_Grotesk']
                                   transition-all duration-300
                                   ${!uploadCategory
                                     ? 'bg-white/5 border-white/10 text-white/50 cursor-not-allowed'
                                     : 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30'
                                   }`}
                      >
                        Upload to {festival?.categories?.find(c => c.id === uploadCategory)?.name}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-xl flex items-center justify-center z-50 p-4">
                <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-md w-full mx-4 
                                border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-['Space_Grotesk'] text-white/90">Delete Content</h2>
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="text-white/50 hover:text-white/90 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <p className="text-white/70 font-['Space_Grotesk']">
                      Are you sure you want to delete this content? This action cannot be undone.
                    </p>

                    {/* Preview of content to be deleted - show only the selected media */}
                    <div className="rounded-xl overflow-hidden border border-white/10">
                      <div className="aspect-video relative">
                        {showDeleteConfirm.post.mediaFiles[showDeleteConfirm.mediaIndex].type === "image" ? (
                          <img
                            src={showDeleteConfirm.post.mediaFiles[showDeleteConfirm.mediaIndex].url}
                            alt="Content to delete"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            src={showDeleteConfirm.post.mediaFiles[showDeleteConfirm.mediaIndex].url}
                            className="w-full h-full object-cover"
                            controls
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="flex-1 px-6 py-3 rounded-xl border border-white/10
                                  text-white/70 font-['Space_Grotesk']
                                  hover:bg-white/5 transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmDelete}
                        className="flex-1 px-6 py-3 rounded-xl bg-red-500/10
                                  border border-red-500/20 hover:border-red-500/30
                                  text-red-500 font-['Space_Grotesk']
                                  hover:bg-red-500/20 transition-all duration-300"
                      >
                        Delete
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
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10
                            shadow-[0_0_30px_rgba(255,255,255,0.1)] p-8">
              <div className="flex flex-col items-center gap-6">
                <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-white/90
                               animate-spin" />
                <div className="flex flex-col items-center gap-2">
                  <div className="text-xl font-['Space_Grotesk'] tracking-wider text-white/90">
                    Loading Festival
                  </div>
                  <div className="text-sm font-['Space_Grotesk'] text-white/50">
                    Please wait while we fetch the details...
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
            <div className={`px-6 py-3 rounded-full backdrop-blur-xl 
                            ${toast.type === 'success' 
                              ? 'bg-white/10 text-white border border-white/20' 
                              : 'bg-red-500/10 text-white border border-red-500/20'
                            } transition-all transform animate-fade-in-up 
                            font-['Space_Grotesk'] tracking-wider`}
            >
              <p className="text-center whitespace-nowrap">{toast.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FestivalManagement; 