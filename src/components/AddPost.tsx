import React, { useState, useEffect } from "react";
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

const AddPost: React.FC = () => {
  const navigate = useNavigate();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [showAddFestival, setShowAddFestival] = useState(false);
  const [newFestivalName, setNewFestivalName] = useState("");
  const [newFestivalDescription, setNewFestivalDescription] = useState("");
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

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
        categoryAccessCodes: doc.data().categoryAccessCodes || [],
        categories: doc.data().categories || [],
        qrCodes: doc.data().qrCodes || []
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

  const handleDeleteFestival = async (festivalId: string) => {
    if (!window.confirm("Are you sure you want to delete this festival?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "festivals", festivalId));
      setFestivals(prev => prev.filter(festival => festival.id !== festivalId));
    } catch (error) {
      console.error("Error deleting festival:", error);
      alert("Failed to delete festival. Please try again.");
    }
  };

  const handleFestivalClick = (festivalId: string) => {
    navigate(`/festival/${festivalId}`);
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
        {/* Festivals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {/* Add Festival Card */}
          <button
            onClick={() => setShowAddFestival(true)}
            className="h-48 bg-white/90 rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center gap-4 hover:bg-white transition-all group"
          >
            <Plus size={32} className="text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="text-lg font-medium text-purple-600">Create New Festival</span>
          </button>

          {/* Festival Cards */}
          {festivals.map((festival) => (
            <div
              key={festival.id}
              className="relative group bg-white/90 rounded-2xl shadow-lg p-6 hover:bg-white transition-all"
            >
              <button
                onClick={() => handleFestivalClick(festival.id)}
                className="w-full h-full text-left"
              >
                <h3 className="text-xl font-semibold mb-2">{festival.name}</h3>
                <p className="text-gray-600 text-sm">{festival.description}</p>
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                  <span>{festival.categories?.length || 0} Categories</span>
                </div>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFestival(festival.id);
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
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

        {/* Toast */}
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
    </div>
  );
};

export default AddPost;
