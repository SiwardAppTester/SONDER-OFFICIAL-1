import React, { useState, useEffect, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, getDoc, updateDoc, arrayUnion, arrayRemove, query, where, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable, deleteObject } from "firebase/storage";
import { db, storage, auth } from "../firebase";
import { signOut } from "firebase/auth";
import BusinessSidebar from "./BusinessSidebar";
import { Menu, Plus, Share, Key, Trash2, Upload, QrCode } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { Camera } from 'lucide-react';
import ReactDOMServer from 'react-dom/server';
import QRCode from "qrcode";
import { Html5Qrcode } from 'html5-qrcode';
import { Canvas, useThree, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { TextureLoader } from 'three';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useUserProfile } from '../contexts/UserProfileContext';

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
  imageUrl: string;
  date: string;
  startTime: string;
  endTime: string;
  categoryAccessCodes?: AccessCode[];
  categories?: Category[];
  qrCodes?: {
    id: string;
    code: string;
    linkedCategories: string[];
    imageUrl: string;
    name: string;
    createdAt: any;
  }[];
  stats?: {
    listas?: number;
    entradas?: number;
    reservas?: number;
    pases?: number;
  };
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

interface QRCodeData {
  id: string;
  code: string;
  imageUrl: string;
  name: string;
  categoryIds: string[];
  createdAt: any;
}

interface QRCode {
  id: string;
  imageUrl: string;
  linkedCategories: string[];
  createdAt: any;
  name: string;
}

const generateQRCode = async (text: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(text);
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
};

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

const AddPost: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useUserProfile();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [showAddFestival, setShowAddFestival] = useState(false);
  const [newFestivalName, setNewFestivalName] = useState("");
  const [newFestivalDescription, setNewFestivalDescription] = useState("");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [newFestivalImage, setNewFestivalImage] = useState<File | null>(null);
  const [newFestivalDate, setNewFestivalDate] = useState("");
  const [newFestivalStartTime, setNewFestivalStartTime] = useState("");
  const [newFestivalEndTime, setNewFestivalEndTime] = useState("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchFestivals();
  }, []);

  const fetchFestivals = async () => {
    try {
      const festivalsSnapshot = await getDocs(collection(db, "festivals"));
      const festivalsData = festivalsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        imageUrl: doc.data().imageUrl,
        date: doc.data().date,
        startTime: doc.data().startTime,
        endTime: doc.data().endTime,
        categoryAccessCodes: doc.data().categoryAccessCodes || [],
        categories: doc.data().categories || [],
        qrCodes: doc.data().qrCodes || [],
        stats: doc.data().stats || {}
      }));
      setFestivals(festivalsData);
    } catch (error) {
      console.error("Error fetching festivals:", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewFestivalImage(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleAddFestival = async () => {
    if (isCreating) return;
    
    if (!newFestivalName.trim() || !newFestivalImage || !newFestivalDate || !newFestivalStartTime || !newFestivalEndTime) {
      setToast({
        message: "Please fill in all required fields",
        type: 'error'
      });
      return;
    }

    setIsCreating(true);

    try {
      // Upload image first
      const imageRef = ref(storage, `festivals/${Date.now()}_${newFestivalImage.name}`);
      const uploadResult = await uploadBytes(imageRef, newFestivalImage);
      const imageUrl = await getDownloadURL(uploadResult.ref);

      const docRef = await addDoc(collection(db, "festivals"), {
        name: newFestivalName.trim(),
        description: newFestivalDescription.trim(),
        imageUrl,
        date: newFestivalDate,
        startTime: newFestivalStartTime,
        endTime: newFestivalEndTime,
        createdAt: serverTimestamp(),
        categoryAccessCodes: [],
        categories: [],
        stats: {
          listas: 0,
          entradas: 0,
          reservas: 0,
          pases: 0
        }
      });
      
      const newFestival = { 
        id: docRef.id, 
        name: newFestivalName.trim(),
        description: newFestivalDescription.trim(),
        imageUrl,
        date: newFestivalDate,
        startTime: newFestivalStartTime,
        endTime: newFestivalEndTime,
        categoryAccessCodes: [],
        categories: [],
        stats: {
          listas: 0,
          entradas: 0,
          reservas: 0,
          pases: 0
        }
      };
      
      setFestivals(prev => [...prev, newFestival]);
      setNewFestivalName("");
      setNewFestivalDescription("");
      setNewFestivalImage(null);
      setImagePreview("");
      setNewFestivalDate("");
      setNewFestivalStartTime("");
      setNewFestivalEndTime("");
      setShowAddFestival(false);
      setToast({
        message: "Festival created successfully",
        type: 'success'
      });

    } catch (error) {
      console.error("Error adding festival:", error);
      setToast({
        message: "Failed to create festival. Please try again.",
        type: 'error'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteFestival = async (festivalId: string) => {
    setShowDeleteConfirm(festivalId);
  };

  const confirmDelete = async (festivalId: string) => {
    try {
      await deleteDoc(doc(db, "festivals", festivalId));
      setFestivals(prev => prev.filter(festival => festival.id !== festivalId));
      setShowDeleteConfirm(null);
      setToast({
        message: "Festival deleted successfully",
        type: 'success'
      });
    } catch (error) {
      console.error("Error deleting festival:", error);
      setToast({
        message: "Failed to delete festival. Please try again.",
        type: 'error'
      });
    }
  };

  const handleFestivalClick = (festivalId: string) => {
    navigate(`/festival-management/${festivalId}`);
  };

  return (
    <div className="relative h-screen w-full overflow-y-auto md:overflow-hidden">
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

      {/* Navigation */}
      <div className="md:hidden flex justify-between items-center p-4 sticky top-0 z-50 bg-black/20 backdrop-blur-sm">
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

      {/* BusinessSidebar */}
      <BusinessSidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={auth.currentUser}
        accessibleFestivalsCount={festivals.length}
        userProfile={userProfile}
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center pt-4 md:pt-0">
        {/* Festivals Grid */}
        <div className="w-full max-w-5xl mx-auto px-4 md:px-8 mt-8 md:mt-16 pb-24 md:pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Add Festival Card */}
            <button
              onClick={() => setShowAddFestival(true)}
              className="relative backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20
                       shadow-[0_0_30px_rgba(255,255,255,0.1)] h-[250px] md:h-[280px] 
                       flex flex-col items-center justify-center 
                       hover:bg-white/20 transition-all group"
            >
              <div className="flex flex-col items-center gap-4">
                <Plus size={28} className="text-white group-hover:scale-110 transition-transform" />
                <span className="text-lg font-['Space_Grotesk'] tracking-wider text-white">Create New Festival</span>
              </div>
            </button>

            {/* Festival Cards */}
            {festivals.map((festival) => (
              <div
                key={festival.id}
                onClick={() => handleFestivalClick(festival.id)}
                className="relative backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20
                         shadow-[0_0_30px_rgba(255,255,255,0.1)] overflow-hidden
                         group cursor-pointer hover:bg-white/20 transition-all
                         h-[250px] md:h-[280px]"
              >
                <img 
                  src={festival.imageUrl} 
                  alt={festival.name}
                  className="w-full h-36 object-cover"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFestival(festival.id);
                  }}
                  className="absolute top-4 right-4 p-2 rounded-full 
                             bg-white/10 text-white opacity-0 group-hover:opacity-100 
                             transition-all duration-300
                             hover:bg-red-500/40 border border-white/20
                             hover:border-red-500/60"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="absolute top-4 left-4 backdrop-blur-xl bg-white/10 text-white px-2 py-1 rounded border border-white/20">
                  <div className="text-xs font-['Space_Grotesk']">
                    {new Date(festival.date).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                  </div>
                  <div className="text-lg font-bold font-['Space_Grotesk']">
                    {new Date(festival.date).getDate()}
                  </div>
                  <div className="text-xs font-['Space_Grotesk']">
                    {new Date(festival.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="text-lg font-bold mb-1 text-white font-['Space_Grotesk'] tracking-wider">
                    {festival.name}
                  </h3>
                  <p className="text-white/70 text-xs line-clamp-2 font-['Space_Grotesk']">
                    {festival.description}
                  </p>
                  <div className="mt-1 text-xs text-white/50 font-['Space_Grotesk']">
                    {festival.startTime && festival.endTime && (
                      <span>{festival.startTime} - {festival.endTime} +18</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Festival Modal */}
        {showAddFestival && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20
                          shadow-[0_0_30px_rgba(255,255,255,0.1)] p-4 md:p-8 max-w-md w-full mx-auto relative
                          max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowAddFestival(false)}
                className="absolute top-4 right-4 text-white/70 hover:text-white"
              >
                ×
              </button>
              <h2 className="text-2xl font-['Space_Grotesk'] tracking-wider mb-6 text-white">Create New Festival</h2>
              <div className="space-y-4">
                {imagePreview && (
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 
                           text-white font-['Space_Grotesk']"
                />
                <input
                  type="text"
                  value={newFestivalName}
                  onChange={(e) => setNewFestivalName(e.target.value)}
                  placeholder="Enter festival name"
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 
                           text-white placeholder-white/50 font-['Space_Grotesk']
                           focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <textarea
                  value={newFestivalDescription}
                  onChange={(e) => setNewFestivalDescription(e.target.value)}
                  placeholder="Enter festival description"
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 
                           text-white placeholder-white/50 font-['Space_Grotesk']
                           focus:outline-none focus:ring-2 focus:ring-white/30 
                           min-h-[100px] resize-y"
                />
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={newFestivalDate}
                      onChange={(e) => setNewFestivalDate(e.target.value)}
                      className="w-full p-3 rounded-lg bg-white/10 border border-white/20 
                               text-white font-['Space_Grotesk']
                               focus:outline-none focus:ring-2 focus:ring-white/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={newFestivalStartTime}
                        onChange={(e) => setNewFestivalStartTime(e.target.value)}
                        className="w-full p-3 rounded-lg bg-white/10 border border-white/20 
                                 text-white font-['Space_Grotesk']
                                 focus:outline-none focus:ring-2 focus:ring-white/30"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                        End Time
                      </label>
                      <input
                        type="time"
                        value={newFestivalEndTime}
                        onChange={(e) => setNewFestivalEndTime(e.target.value)}
                        className="w-full p-3 rounded-lg bg-white/10 border border-white/20 
                                 text-white font-['Space_Grotesk']
                                 focus:outline-none focus:ring-2 focus:ring-white/30"
                        required
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddFestival}
                  disabled={isCreating}
                  className={`relative px-16 py-4 border-2 border-white/30 rounded-full
                          text-white text-lg font-['Space_Grotesk'] tracking-[0.2em]
                          transition-all duration-300 
                          hover:border-white/60 hover:scale-105
                          hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]
                          active:scale-95
                          w-full
                          ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isCreating ? 'CREATING...' : 'CREATE FESTIVAL'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20
                            shadow-[0_0_30px_rgba(255,255,255,0.1)] p-4 md:p-8 max-w-md w-full mx-auto">
              <h2 className="text-2xl font-['Space_Grotesk'] tracking-wider mb-6 text-white text-center">
                Delete Festival
              </h2>
              <p className="text-white/70 text-center mb-8 font-['Space_Grotesk']">
                Are you sure you want to delete this festival? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-6 py-3 border-2 border-white/30 rounded-full
                            text-white font-['Space_Grotesk'] tracking-wider
                            transition-all duration-300 
                            hover:border-white/60 hover:bg-white/10"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => showDeleteConfirm && confirmDelete(showDeleteConfirm)}
                  className="flex-1 px-6 py-3 border-2 border-red-500/30 rounded-full
                            text-red-500 font-['Space_Grotesk'] tracking-wider
                            transition-all duration-300 
                            hover:border-red-500/60 hover:bg-red-500/10"
                >
                  DELETE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 mx-4 w-[calc(100%-2rem)] md:w-auto">
            <div className={`px-6 py-3 rounded-full backdrop-blur-xl ${
              toast.type === 'success' 
                ? 'bg-white/10 text-white border border-white/20' 
                : 'bg-red-500/10 text-white border border-red-500/20'
            } transition-all transform animate-fade-in-up font-['Space_Grotesk'] tracking-wider`}>
              <p className="text-center text-sm md:text-base">{toast.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddPost;
