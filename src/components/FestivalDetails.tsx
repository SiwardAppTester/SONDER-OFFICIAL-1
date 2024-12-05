import React, { useState, useEffect, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, storage, auth } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable, deleteObject } from "firebase/storage";
import { Plus, Share, Trash2, Upload, QrCode, Key } from "lucide-react";
import BusinessSidebar from "./BusinessSidebar";
import { getAuth } from "firebase/auth";
import { Html5Qrcode } from 'html5-qrcode';
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';

// Import interfaces from AddPost
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
  description: string;
  imageUrl?: string;
  categories?: Category[];
  accessCode?: string;
  categoryAccessCodes?: AccessCode[];
  qrCodes?: {
    id: string;
    code: string;
    linkedCategories: string[];
    imageUrl: string;
    name: string;
    createdAt: any;
  }[];
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

interface AccessCode {
  code: string;
  categoryIds: string[];
}

// Add the Loader component from SignIn
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

// Add the InnerSphere component from SignIn
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

const FestivalDetails: React.FC = () => {
  const { festivalId } = useParams();
  const navigate = useNavigate();
  const [festival, setFestival] = useState<Festival | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [categoryPosts, setCategoryPosts] = useState<Record<string, Post[]>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [activeMediaType, setActiveMediaType] = useState<"image" | "video">("image");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const auth = getAuth();
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);
  const [newAccessCode, setNewAccessCode] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCreatingAccessCode, setIsCreatingAccessCode] = useState(false);
  const [showCreateAccessCodeModal, setShowCreateAccessCodeModal] = useState(false);
  const [showAddQRModal, setShowAddQRModal] = useState(false);
  const [newQRCode, setNewQRCode] = useState({
    name: "",
    code: "",
    linkedCategories: [] as string[]
  });
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    if (festivalId) {
      fetchFestivalDetails();
    }
  }, [festivalId]);

  useEffect(() => {
    if (selectedCategory) {
      fetchCategoryPosts(selectedCategory);
    }
  }, [selectedCategory]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, []);

  const fetchFestivalDetails = async () => {
    try {
      const festivalDoc = await getDoc(doc(db, "festivals", festivalId!));
      if (festivalDoc.exists()) {
        setFestival({ id: festivalDoc.id, ...festivalDoc.data() } as Festival);
      } else {
        navigate('/add-post');
      }
    } catch (error) {
      console.error("Error fetching festival details:", error);
    }
  };

  const handleAddCategory = async () => {
    if (!festivalId || !newCategoryName.trim()) {
      alert("Please enter a category name");
      return;
    }

    try {
      const newCategory: Category = {
        id: crypto.randomUUID(),
        name: newCategoryName.trim(),
        mediaType: "both"
      };

      const festivalRef = doc(db, "festivals", festivalId);
      await updateDoc(festivalRef, {
        categories: arrayUnion(newCategory)
      });

      setFestival(prev => prev ? {
        ...prev,
        categories: [...(prev.categories || []), newCategory]
      } : null);
      
      setNewCategoryName("");
      setShowAddCategory(false);
    } catch (error) {
      console.error("Error adding category:", error);
      alert("Failed to add category. Please try again.");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!festivalId || !window.confirm("Are you sure you want to delete this category?")) {
      return;
    }

    try {
      const categoryToDelete = festival?.categories?.find(c => c.id === categoryId);
      if (!categoryToDelete) return;

      const festivalRef = doc(db, "festivals", festivalId);
      await updateDoc(festivalRef, {
        categories: arrayRemove(categoryToDelete)
      });

      setFestival(prev => prev ? {
        ...prev,
        categories: prev.categories?.filter(c => c.id !== categoryId)
      } : null);

      if (selectedCategory === categoryId) {
        setSelectedCategory("");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category. Please try again.");
    }
  };

  const fetchCategoryPosts = async (categoryId: string) => {
    try {
      const postsQuery = await getDocs(collection(db, "posts"));
      const posts = postsQuery.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Post))
        .filter(post => 
          post.festivalId === festivalId &&
          post.mediaFiles.some(media => media.categoryId === categoryId)
        );

      setCategoryPosts(prev => ({
        ...prev,
        [categoryId]: posts
      }));
    } catch (error) {
      console.error("Error fetching category posts:", error);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedCategory || !e.target.files?.length) return;

    setIsUploading(true);
    const files = Array.from(e.target.files);
    
    const newMediaFiles = files.map(file => ({
      file,
      type: file.type.startsWith('image/') ? 'image' as const : 'video' as const,
      progress: 0,
      categoryId: selectedCategory
    }));

    setMediaFiles(prev => [...prev, ...newMediaFiles]);

    for (let i = 0; i < newMediaFiles.length; i++) {
      const file = newMediaFiles[i];
      const storageRef = ref(storage, `posts/${auth.currentUser?.uid}/${Date.now()}_${file.file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file.file);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setMediaFiles(prev => prev.map((item, index) => 
            index === i ? { ...item, progress } : item
          ));
        },
        (error) => {
          console.error("Error uploading file:", error);
        },
        async () => {
          const url = await getDownloadURL(storageRef);
          const postData = {
            userId: auth.currentUser?.uid,
            festivalId,
            createdAt: serverTimestamp(),
            text: "",
            mediaFiles: [{
              url,
              type: file.type,
              categoryId: selectedCategory
            }]
          };

          await addDoc(collection(db, "posts"), postData);
          fetchCategoryPosts(selectedCategory);
          setIsUploading(false);
        }
      );
    }
  };

  const getFilteredPosts = (posts: Post[] | undefined, mediaType: "image" | "video") => {
    return posts?.filter(post => 
      post.mediaFiles.some(media => 
        media.type === mediaType && 
        media.categoryId === selectedCategory
      )
    ) || [];
  };

  const handleDeleteMedia = async (postId: string, mediaUrl: string) => {
    if (!window.confirm("Are you sure you want to delete this media?")) {
      return;
    }

    try {
      // Get the post reference
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
      } else {
        // Update the post with the remaining media
        await updateDoc(postRef, {
          mediaFiles: updatedMediaFiles
        });
      }

      // Refresh the category posts
      fetchCategoryPosts(selectedCategory);

    } catch (error) {
      console.error("Error deleting media:", error);
      alert("Failed to delete media. Please try again.");
    }
  };

  const handleCreateAccessCode = async () => {
    if (!newAccessCode.trim() || selectedCategories.length === 0) {
      alert("Please enter an access code and select at least one category");
      return;
    }

    try {
      const festivalRef = doc(db, "festivals", festivalId!);
      
      const newCode = {
        code: newAccessCode.trim(),
        categoryIds: selectedCategories,
        createdAt: new Date().toISOString()
      };

      // First get the current categoryAccessCodes array
      const festivalDoc = await getDoc(festivalRef);
      const currentCodes = festivalDoc.data()?.categoryAccessCodes || [];

      // Update with the new array
      await updateDoc(festivalRef, {
        categoryAccessCodes: [...currentCodes, newCode]
      });

      // Update local state
      setFestival(prev => prev ? {
        ...prev,
        categoryAccessCodes: [...(prev.categoryAccessCodes || []), newCode]
      } : null);

      // Reset form
      setNewAccessCode("");
      setSelectedCategories([]);
      setIsCreatingAccessCode(false);
    } catch (error) {
      console.error("Error creating access code:", error);
      alert("Failed to create access code. Please try again.");
    }
  };

  // Add this function to read QR code content
  const readQRCode = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (!event.target?.result) {
          reject(new Error("Failed to read file"));
          return;
        }
        
        try {
          // Create a temporary div for the QR scanner
          const tempDiv = document.createElement('div');
          tempDiv.id = 'temp-qr-reader';
          document.body.appendChild(tempDiv);

          const html5QrCode = new Html5Qrcode('temp-qr-reader');
          const qrCodeMessage = await html5QrCode.scanFile(file, true);
          
          // Clean up
          document.body.removeChild(tempDiv);
          await html5QrCode.clear();

          resolve(qrCodeMessage);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Modify handleQRFileUpload
  const handleQRFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    try {
      const file = e.target.files[0];
      const qrContent = await readQRCode(file);
      console.log("QR Content:", qrContent); // Add this for debugging
      
      setQrFile(file);
      
      // Update QR code state with the actual QR content
      setNewQRCode(prev => ({
        ...prev,
        code: qrContent, // Store the actual QR code content
      }));
      
      setQrError(null);
    } catch (error) {
      console.error("Error handling file upload:", error);
      setQrError("Invalid QR code image. Please try another image.");
    }
  };

  // Modify handleCreateQRCode
  const handleCreateQRCode = async () => {
    if (!newQRCode.name || !qrFile || !newQRCode.code || newQRCode.linkedCategories.length === 0) {
      alert("Please fill in all fields, upload a valid QR code, and select at least one category");
      return;
    }

    try {
      const festivalRef = doc(db, "festivals", festivalId!);
      
      // Upload the QR code image to storage
      const qrStorageRef = ref(storage, `qrcodes/${festivalId}/${Date.now()}_${qrFile.name}`);
      await uploadBytes(qrStorageRef, qrFile);
      const imageUrl = await getDownloadURL(qrStorageRef);
      
      const newQR = {
        id: crypto.randomUUID(),
        name: newQRCode.name,
        code: newQRCode.code, // The actual QR content
        linkedCategories: newQRCode.linkedCategories,
        createdAt: new Date().toISOString(),
        imageUrl: imageUrl // The URL of the uploaded image
      };

      // First get the current qrCodes array
      const festivalDoc = await getDoc(festivalRef);
      const currentQRCodes = festivalDoc.data()?.qrCodes || [];

      // Update with the new array
      await updateDoc(festivalRef, {
        qrCodes: [...currentQRCodes, newQR]
      });

      // Update local state
      setFestival(prev => prev ? {
        ...prev,
        qrCodes: [...(prev.qrCodes || []), newQR]
      } : null);

      // Reset form and close modal
      setNewQRCode({
        name: "",
        code: "",
        linkedCategories: []
      });
      setQrFile(null);
      setShowAddQRModal(false);
    } catch (error) {
      console.error("Error creating QR code:", error);
      alert("Failed to create QR code. Please try again.");
    }
  };

  // Add this function to handle festival image upload
  const handleFestivalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const file = e.target.files[0];
    const storageRef = ref(storage, `festivals/${festivalId}/cover_${Date.now()}`);
    
    try {
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);
      
      const festivalRef = doc(db, "festivals", festivalId!);
      await updateDoc(festivalRef, {
        imageUrl: imageUrl
      });
      
      setFestival(prev => prev ? {
        ...prev,
        imageUrl: imageUrl
      } : null);
    } catch (error) {
      console.error("Error uploading festival image:", error);
      alert("Failed to upload image. Please try again.");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Three.js Background */}
      <div className="absolute inset-0">
        <Canvas
          className="w-full h-full"
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={<Loader />}>
            <InnerSphere />
          </Suspense>
        </Canvas>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen">
        <BusinessSidebar
          isNavOpen={isNavOpen}
          setIsNavOpen={setIsNavOpen}
          user={auth.currentUser}
          userProfile={userProfile}
          accessibleFestivalsCount={1}
        />

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Updated Festival Header */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                         border border-white/20 p-8 mb-8">
            <div className="flex gap-8">
              {/* Festival Image Section */}
              <div className="relative group">
                <div className="w-[180px] h-[180px] rounded-xl overflow-hidden border border-white/20
                              shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                  {festival?.imageUrl ? (
                    <img
                      src={festival.imageUrl}
                      alt={festival.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <label
                        htmlFor="festival-image"
                        className="cursor-pointer text-white/40 hover:text-white/60 
                                 transition-colors text-center p-4"
                      >
                        <Upload size={24} className="mx-auto mb-2" />
                        <span className="text-sm font-['Space_Grotesk']">Add Festival Image</span>
                      </label>
                    </div>
                  )}
                </div>
                
                {/* Upload Input (hidden) */}
                <input
                  type="file"
                  id="festival-image"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFestivalImageUpload}
                />
                
                {/* Hover Overlay for Changing Image */}
                {festival?.imageUrl && (
                  <label
                    htmlFor="festival-image"
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100
                             transition-opacity flex items-center justify-center cursor-pointer
                             text-white/80 font-['Space_Grotesk'] text-sm rounded-xl"
                  >
                    Change Image
                  </label>
                )}
              </div>

              {/* Festival Info Section */}
              <div className="flex-grow">
                <h1 className="text-[40px] font-[500] tracking-[0.12em] text-white/95 font-['Outfit']
                              drop-shadow-[0_0_30px_rgba(255,255,255,0.25)]
                              transform transition-all duration-700 ease-out
                              hover:tracking-[0.2em] hover:drop-shadow-[0_0_40px_rgba(255,255,255,0.35)]">
                  {festival?.name}
                </h1>
                <p className="text-white/60 font-['Space_Grotesk'] mt-2 max-w-2xl">
                  {festival?.description}
                </p>
              </div>

              {/* Management Buttons Section */}
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setShowQRModal(true)}
                  className="p-3 bg-white/10 rounded-xl border border-white/20
                           hover:bg-white/20 transition-all duration-300
                           group"
                  title="QR Codes"
                >
                  <QrCode size={24} className="text-white group-hover:scale-110 transition-transform" />
                </button>
                <button
                  onClick={() => setShowAccessCodeModal(true)}
                  className="p-3 bg-white/10 rounded-xl border border-white/20
                           hover:bg-white/20 transition-all duration-300
                           group"
                  title="Access Codes"
                >
                  <Key size={24} className="text-white group-hover:scale-110 transition-transform" />
                </button>
                <button
                  onClick={() => navigate('/add-post')}
                  className="ml-3 px-6 py-2 text-white/80 hover:text-white font-['Space_Grotesk'] 
                           tracking-wider transition-colors border border-white/20 rounded-xl
                           hover:bg-white/10"
                >
                  Back to Festivals
                </button>
              </div>
            </div>
          </div>

          {/* Categories Section */}
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                         border border-white/20 p-8 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-['Space_Grotesk'] tracking-wider text-white/90">
                Categories
              </h2>
              <button
                onClick={() => setShowAddCategory(true)}
                className="px-6 py-2 bg-white/10 text-white rounded-full
                         border border-white/20 hover:bg-white/20
                         transition-all duration-300 flex items-center gap-2
                         font-['Space_Grotesk'] tracking-wider"
              >
                <Plus size={20} />
                Add Category
              </button>
            </div>

            <div className="flex flex-wrap gap-4">
              {festival?.categories?.map(category => (
                <div key={category.id} className="relative group">
                  <button
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-6 py-2 rounded-full transition-all duration-300
                              font-['Space_Grotesk'] tracking-wider
                              ${selectedCategory === category.id
                                ? "bg-white/20 text-white border-white/40"
                                : "bg-white/10 text-white/70 border-white/20"
                              } border hover:bg-white/30`}
                  >
                    {category.name}
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="absolute -top-1 -right-1 bg-white/10 text-red-400 
                             rounded-full p-1 opacity-0 group-hover:opacity-100 
                             transition-opacity hover:bg-white/20"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Media Upload Section */}
          {selectedCategory && (
            <div className="w-fit mx-auto backdrop-blur-xl bg-white/5 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.05)] 
                   border border-white/10 p-2 mb-4">
              <div className="relative">
                <input
                  type="file"
                  onChange={handleMediaUpload}
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  id="media-upload"
                  disabled={isUploading}
                />
                <label
                  htmlFor="media-upload"
                  className="flex items-center justify-center gap-2 cursor-pointer 
                           bg-white/5 hover:bg-white/10 rounded-lg border border-white/10
                           hover:border-white/20 transition-all duration-300 px-4 py-1.5
                           group w-[168px]"
                >
                  <Upload 
                    size={14} 
                    className="text-white/30 group-hover:text-white/50 transition-colors
                              group-hover:scale-110 transform duration-300" 
                  />
                  <span className="text-sm text-white/30 group-hover:text-white/50 transition-colors
                                font-['Space_Grotesk'] tracking-wider">
                    {isUploading ? "Uploading..." : "Upload Media"}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Media Type Toggle */}
          <div className="backdrop-blur-xl bg-white/10 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                  border border-white/20 p-2 mb-8 w-fit mx-auto">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveMediaType("image")}
                className={`w-[80px] px-4 py-1.5 rounded-lg transition-all duration-300
                          font-['Space_Grotesk'] text-sm tracking-wider
                          ${activeMediaType === "image"
                            ? "bg-white/20 text-white border-white/40"
                            : "bg-white/10 text-white/70 border-white/20"
                          } border hover:bg-white/30`}
              >
                Images
              </button>
              <button
                onClick={() => setActiveMediaType("video")}
                className={`w-[80px] px-4 py-1.5 rounded-lg transition-all duration-300
                          font-['Space_Grotesk'] text-sm tracking-wider
                          ${activeMediaType === "video"
                            ? "bg-white/20 text-white border-white/40"
                            : "bg-white/10 text-white/70 border-white/20"
                          } border hover:bg-white/30`}
              >
                Videos
              </button>
            </div>
          </div>

          {/* Content Display Grid */}
          {selectedCategory && (
            <>
              {/* Content Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {getFilteredPosts(categoryPosts[selectedCategory], activeMediaType)
                  .map(post => (
                    post.mediaFiles
                      .filter(media => media.type === activeMediaType)
                      .map((media, mediaIndex) => (
                        <div 
                          key={`${post.id}-${mediaIndex}`} 
                          className="aspect-[9/16] rounded-lg overflow-hidden 
                                   shadow-[0_0_30px_rgba(255,255,255,0.1)]
                                   group relative border border-white/20"
                        >
                          {media.type === 'video' ? (
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
                          <button
                            onClick={() => handleDeleteMedia(post.id, media.url)}
                            className="absolute top-2 right-2 bg-black/50 text-white/90 
                                     p-2 rounded-full opacity-0 group-hover:opacity-100 
                                     transition-opacity hover:bg-black/70"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                  ))}
              </div>

              {/* Empty State */}
              {getFilteredPosts(categoryPosts[selectedCategory], activeMediaType).length === 0 && (
                <div className="text-center py-12 text-white/60 font-['Space_Grotesk'] tracking-wider">
                  No {activeMediaType}s found in this category
                </div>
              )}
            </>
          )}

          {/* Modals - Update the styling for all modals similarly */}
          {/* ... (keep existing modal logic but update their styling to match) */}
        </div>
      </div>

      {/* QR Codes Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto
                         border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-['Space_Grotesk'] tracking-wider text-white/90">QR Codes</h2>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-white/60 hover:text-white/90 transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            {/* Add QR Code Button */}
            <button
              onClick={() => setShowAddQRModal(true)}
              className="w-full mb-6 flex items-center justify-center gap-2 px-6 py-4 
                        bg-white/10 border border-white/20 text-white rounded-xl 
                        hover:bg-white/20 transition-all duration-300
                        font-['Space_Grotesk'] tracking-wider"
            >
              <Plus size={20} />
              <span>Add QR Code</span>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {festival?.qrCodes?.map((qr) => (
                <div key={qr.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <img src={qr.imageUrl} alt={qr.name} className="w-full aspect-square object-contain mb-2" />
                  <h3 className="font-['Space_Grotesk'] text-white/90">{qr.name}</h3>
                  <p className="text-sm text-white/60 font-['Space_Grotesk']">
                    Linked Categories: {qr.linkedCategories.length}
                  </p>
                </div>
              ))}
            </div>
            {(!festival?.qrCodes || festival.qrCodes.length === 0) && (
              <p className="text-center text-white/60 py-8 font-['Space_Grotesk']">No QR codes yet</p>
            )}
          </div>
        </div>
      )}

      {/* Add QR Code Modal */}
      {showAddQRModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full mx-4
                         border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-['Space_Grotesk'] tracking-wider text-white/90">Create QR Code</h2>
              <button
                onClick={() => {
                  setShowAddQRModal(false);
                  setNewQRCode({ name: "", code: "", linkedCategories: [] });
                }}
                className="text-white/60 hover:text-white/90 transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-['Space_Grotesk'] text-white/80 mb-1">
                  QR Code Name
                </label>
                <input
                  type="text"
                  value={newQRCode.name}
                  onChange={(e) => setNewQRCode(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2.5 bg-white/10 border border-white/20 rounded-lg 
                           text-white placeholder-white/50 font-['Space_Grotesk']
                           focus:ring-2 focus:ring-white/30 focus:border-white/30 outline-none"
                  placeholder="Enter QR code name"
                />
              </div>

              <div>
                <label className="block text-sm font-['Space_Grotesk'] text-white/80 mb-1">
                  QR Code Image
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed 
                              border-white/30 rounded-lg hover:border-white/50 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-white/60" />
                    <div className="flex text-sm text-white/80">
                      <label
                        htmlFor="qr-upload"
                        className="relative cursor-pointer font-['Space_Grotesk'] hover:text-white/90"
                      >
                        <span>Upload a QR code</span>
                        <input
                          id="qr-upload"
                          name="qr-upload"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleQRFileUpload}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-white/60">PNG, JPG up to 10MB</p>
                  </div>
                </div>
                {qrFile && (
                  <div className="mt-2">
                    <img
                      src={URL.createObjectURL(qrFile)}
                      alt="QR code preview"
                      className="h-32 w-32 object-contain mx-auto"
                    />
                  </div>
                )}
                {qrError && (
                  <p className="mt-2 text-sm text-red-400">{qrError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-['Space_Grotesk'] text-white/80 mb-1">
                  Link Categories
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-white/5 p-3 rounded-lg border border-white/20">
                  {festival?.categories?.map(category => (
                    <label key={category.id} className="flex items-center gap-2 p-2 hover:bg-white/10 
                                          rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newQRCode.linkedCategories.includes(category.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewQRCode(prev => ({
                              ...prev,
                              linkedCategories: [...prev.linkedCategories, category.id]
                            }));
                          } else {
                            setNewQRCode(prev => ({
                              ...prev,
                              linkedCategories: prev.linkedCategories.filter(id => id !== category.id)
                            }));
                          }
                        }}
                        className="rounded text-purple-600 bg-white/10 border-white/20"
                      />
                      <span className="text-sm text-white/80">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddQRModal(false);
                    setNewQRCode({ name: "", code: "", linkedCategories: [] });
                  }}
                  className="flex-1 px-4 py-2.5 border border-white/20 text-white/80 rounded-lg 
                            hover:bg-white/10 transition-colors font-['Space_Grotesk']"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateQRCode}
                  className="flex-1 px-4 py-2.5 bg-white/10 text-white rounded-lg 
                            hover:bg-white/20 transition-colors flex items-center 
                            justify-center gap-2 font-['Space_Grotesk']"
                >
                  <Plus size={18} />
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full mx-4
                         border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-['Space_Grotesk'] tracking-wider text-white/90">Add New Category</h2>
              <button
                onClick={() => setShowAddCategory(false)}
                className="text-white/60 hover:text-white/90 transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-['Space_Grotesk'] text-white/80 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  className="w-full p-2.5 bg-white/10 border border-white/20 rounded-lg 
                           text-white placeholder-white/50 font-['Space_Grotesk']
                           focus:ring-2 focus:ring-white/30 focus:border-white/30 outline-none"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddCategory(false)}
                  className="flex-1 px-4 py-2.5 border border-white/20 text-white/80 rounded-lg 
                            hover:bg-white/10 transition-colors font-['Space_Grotesk']"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCategory}
                  className="flex-1 px-4 py-2.5 bg-white/10 text-white rounded-lg 
                            hover:bg-white/20 transition-colors flex items-center 
                            justify-center gap-2 font-['Space_Grotesk']"
                >
                  <Plus size={18} />
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Access Codes Modal */}
      {showAccessCodeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto
                         border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-['Space_Grotesk'] tracking-wider text-white/90">Access Codes</h2>
              <button
                onClick={() => setShowAccessCodeModal(false)}
                className="text-white/60 hover:text-white/90 transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            {/* Create Access Code Button */}
            <button
              onClick={() => setShowCreateAccessCodeModal(true)}
              className="w-full mb-6 flex items-center justify-center gap-2 px-6 py-4 
                        bg-white/10 border border-white/20 text-white rounded-xl 
                        hover:bg-white/20 transition-all duration-300
                        font-['Space_Grotesk'] tracking-wider"
            >
              <Plus size={20} />
              <span>Create Access Code</span>
            </button>

            <div className="space-y-4">
              {festival?.categoryAccessCodes?.map((accessCode, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-['Space_Grotesk'] text-white/90 text-lg mb-2">{accessCode.code}</p>
                      <div className="flex flex-wrap gap-2">
                        {accessCode.categoryIds.map(catId => {
                          const category = festival.categories?.find(c => c.id === catId);
                          return category ? (
                            <span key={catId} className="inline-flex items-center px-2.5 py-0.5 
                                                   rounded-full text-xs font-medium bg-white/10 
                                                   text-white/80 border border-white/20">
                              {category.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!festival?.categoryAccessCodes || festival.categoryAccessCodes.length === 0) && (
                <p className="text-center text-white/60 py-8 font-['Space_Grotesk']">
                  No access codes yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Access Code Modal */}
      {showCreateAccessCodeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full mx-4
                         border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-['Space_Grotesk'] tracking-wider text-white/90">Create Access Code</h2>
              <button
                onClick={() => {
                  setShowCreateAccessCodeModal(false);
                  setNewAccessCode("");
                  setSelectedCategories([]);
                }}
                className="text-white/60 hover:text-white/90 transition-colors text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-['Space_Grotesk'] text-white/80 mb-1">
                  Access Code
                </label>
                <input
                  type="text"
                  value={newAccessCode}
                  onChange={(e) => setNewAccessCode(e.target.value)}
                  className="w-full p-2.5 bg-white/10 border border-white/20 rounded-lg 
                           text-white placeholder-white/50 font-['Space_Grotesk']
                           focus:ring-2 focus:ring-white/30 focus:border-white/30 outline-none"
                  placeholder="Enter access code"
                />
              </div>

              <div>
                <label className="block text-sm font-['Space_Grotesk'] text-white/80 mb-1">
                  Link Categories
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-white/5 p-3 rounded-lg border border-white/20">
                  {festival?.categories?.map(category => (
                    <label key={category.id} className="flex items-center gap-2 p-2 hover:bg-white/10 
                                          rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCategories(prev => [...prev, category.id]);
                          } else {
                            setSelectedCategories(prev => 
                              prev.filter(id => id !== category.id)
                            );
                          }
                        }}
                        className="rounded text-purple-600 bg-white/10 border-white/20"
                      />
                      <span className="text-sm text-white/80">{category.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateAccessCodeModal(false);
                    setNewAccessCode("");
                    setSelectedCategories([]);
                  }}
                  className="flex-1 px-4 py-2.5 border border-white/20 text-white/80 rounded-lg 
                            hover:bg-white/10 transition-colors font-['Space_Grotesk']"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAccessCode}
                  className="flex-1 px-4 py-2.5 bg-white/10 text-white rounded-lg 
                            hover:bg-white/20 transition-colors flex items-center 
                            justify-center gap-2 font-['Space_Grotesk']"
                >
                  <Plus size={18} />
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FestivalDetails; 