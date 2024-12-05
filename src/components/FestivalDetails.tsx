import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, storage, auth } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable, deleteObject } from "firebase/storage";
import { Plus, Share, Trash2, Upload, QrCode, Key } from "lucide-react";
import BusinessSidebar from "./BusinessSidebar";
import { getAuth } from "firebase/auth";

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

  return (
    <>
      <BusinessSidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={auth.currentUser}
        userProfile={userProfile}
        accessibleFestivalsCount={1} // You can adjust this as needed
      />

      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-rose-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Festival Header */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-8 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">{festival?.name}</h1>
                <p className="text-gray-600">{festival?.description}</p>
              </div>
              <button
                onClick={() => navigate('/add-post')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Back to Festivals
              </button>
            </div>
          </div>

          {/* Management Buttons */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-8 mb-8">
            <div className="flex gap-4">
              <button
                onClick={() => setShowQRModal(true)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <QrCode size={20} className="text-purple-600" />
                <span className="font-medium">QR Codes</span>
              </button>
              <button
                onClick={() => setShowAccessCodeModal(true)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <Key size={20} className="text-purple-600" />
                <span className="font-medium">Access Codes</span>
              </button>
              <button
                onClick={() => navigate(`/festival/${festivalId}/add-qr`)}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
              >
                <Plus size={20} />
                <span className="font-medium">Add QR Code</span>
              </button>
            </div>
          </div>

          {/* QR Codes Modal */}
          {showQRModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">QR Codes</h2>
                  <button
                    onClick={() => setShowQRModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {festival?.qrCodes?.map((qr) => (
                    <div key={qr.id} className="bg-gray-50 rounded-lg p-4">
                      <img src={qr.imageUrl} alt={qr.name} className="w-full aspect-square object-contain mb-2" />
                      <h3 className="font-medium">{qr.name}</h3>
                      <p className="text-sm text-gray-600">
                        Linked Categories: {qr.linkedCategories.length}
                      </p>
                    </div>
                  ))}
                </div>
                {(!festival?.qrCodes || festival.qrCodes.length === 0) && (
                  <p className="text-center text-gray-500 py-8">No QR codes yet</p>
                )}
              </div>
            </div>
          )}

          {/* Access Codes Modal */}
          {showAccessCodeModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Access Codes</h2>
                  <button
                    onClick={() => setShowAccessCodeModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>

                {/* Create Access Code Button */}
                <button
                  onClick={() => setShowCreateAccessCodeModal(true)}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 
                            transition-colors mb-6 flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Create Access Code
                </button>

                <div className="space-y-6">
                  {/* Category Access Codes */}
                  <div>
                    <h3 className="font-medium mb-3 text-gray-900">Category Access Codes</h3>
                    <div className="space-y-3">
                      {festival?.categoryAccessCodes?.map((ac, index) => (
                        <div key={index} className="bg-white p-4 rounded-xl border border-gray-200">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{ac.code}</p>
                              <div className="mt-2 space-y-1">
                                <p className="text-sm text-gray-500">Linked Categories:</p>
                                <div className="flex flex-wrap gap-2">
                                  {ac.categoryIds.map(catId => {
                                    const category = festival.categories?.find(c => c.id === catId);
                                    return category ? (
                                      <span key={catId} className="inline-flex items-center px-2.5 py-0.5 
                                                         rounded-full text-xs font-medium bg-purple-100 
                                                         text-purple-800">
                                        {category.name}
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!festival?.categoryAccessCodes || festival.categoryAccessCodes.length === 0) && (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                          No category access codes
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create Access Code Modal */}
          {showCreateAccessCodeModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">Create Access Code</h2>
                  <button
                    onClick={() => {
                      setShowCreateAccessCodeModal(false);
                      setNewAccessCode("");
                      setSelectedCategories([]);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Access Code
                    </label>
                    <input
                      type="text"
                      value={newAccessCode}
                      onChange={(e) => setNewAccessCode(e.target.value)}
                      className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 
                                focus:border-purple-500 outline-none transition-all"
                      placeholder="Enter access code"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link Categories
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto bg-white p-3 rounded-lg border">
                      {festival?.categories?.map(category => (
                        <label key={category.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 
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
                            className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                          />
                          <span className="text-sm text-gray-700">{category.name}</span>
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
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg 
                                hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        await handleCreateAccessCode();
                        setShowCreateAccessCodeModal(false);
                      }}
                      className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg 
                                hover:bg-purple-700 transition-colors flex items-center 
                                justify-center gap-2"
                    >
                      <Plus size={18} />
                      Create
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Categories Section */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-8 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Categories</h2>
              <button
                onClick={() => setShowAddCategory(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-all flex items-center gap-2"
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
                    className={`px-4 py-2 rounded-full transition-all ${
                      selectedCategory === category.id
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    {category.name}
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="absolute -top-1 -right-1 bg-white text-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Media Upload Section */}
          {selectedCategory && (
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-8 mb-8">
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
                  className="w-full h-32 border-2 border-dashed border-purple-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition-colors"
                >
                  <Upload size={24} className="text-purple-400 mb-2" />
                  <span className="text-sm text-purple-600">
                    {isUploading ? "Uploading..." : "Upload Media"}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Content Display Grid */}
          {selectedCategory && (
            <>
              {/* Media Type Toggle */}
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 mb-8">
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setActiveMediaType("image")}
                    className={`px-6 py-2.5 rounded-full transition-all transform hover:scale-105 ${
                      activeMediaType === "image"
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                        : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    Images
                  </button>
                  <button
                    onClick={() => setActiveMediaType("video")}
                    className={`px-6 py-2.5 rounded-full transition-all transform hover:scale-105 ${
                      activeMediaType === "video"
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                        : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    Videos
                  </button>
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {getFilteredPosts(categoryPosts[selectedCategory], activeMediaType)
                  .map(post => (
                    post.mediaFiles
                      .filter(media => media.type === activeMediaType)
                      .map((media, mediaIndex) => (
                        <div 
                          key={`${post.id}-${mediaIndex}`} 
                          className="aspect-[9/16] rounded-lg overflow-hidden shadow-lg group relative"
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
                          {/* Optional: Add delete button */}
                          <button
                            onClick={() => handleDeleteMedia(post.id, media.url)}
                            className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                  ))}
              </div>

              {/* Empty State */}
              {getFilteredPosts(categoryPosts[selectedCategory], activeMediaType).length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No {activeMediaType}s found in this category
                </div>
              )}
            </>
          )}

          {/* Add Category Modal */}
          {showAddCategory && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
                <h2 className="text-xl font-semibold mb-4">Add New Category</h2>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  className="w-full p-3 border rounded-lg mb-4"
                />
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setShowAddCategory(false)}
                    className="px-4 py-2 text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCategory}
                    className="px-4 py-2 bg-purple-600 text-white rounded-full"
                  >
                    Add Category
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FestivalDetails; 