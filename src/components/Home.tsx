import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, where, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp, arrayUnion, arrayRemove } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Menu, KeyRound, User, Sparkles, Search as SearchIcon, Star, Package, Download, Share, QrCode, X, Camera, Upload } from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import Sidebar from "./Sidebar";
import { Html5Qrcode } from 'html5-qrcode';
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense } from 'react';

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
  qrCodes?: {
    id: string;
    code: string;
    linkedCategories: string[];
    imageUrl: string;
    name: string;
    createdAt: any;
  }[];
}

interface Category {
  id: string;
  name: string;
  mediaType: "both" | "image" | "video";
}

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
  accessibleFestivals?: string[];
  username?: string;
  accessibleCategories?: Record<string, string[]>;
}

interface AccessCode {
  code: string;
  categoryIds: string[];
  createdAt: any;
}

// Add the Loader component
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

// Add the InnerSphere component
function InnerSphere() {
  return (
    <>
      <Environment preset="sunset" />
      <PerspectiveCamera makeDefault position={[0, 0, 0]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      
      <mesh scale={[-15, -15, -15]}> {/* Negative scale to see inside */}
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
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

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
          setAccessibleFestivals(new Set(userData.accessibleFestivals || []));
          setAccessibleCategories(userData.accessibleCategories || {});
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
    const fetchUserProfile = async () => {
      if (!auth.currentUser?.uid) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserProfile({
            id: userDoc.id,
            ...userDoc.data()
          } as UserProfile);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, [auth.currentUser?.uid]);

  useEffect(() => {
    let html5Qrcode: Html5Qrcode | null = null;

    if (showQRScanner) {
      html5Qrcode = new Html5Qrcode("qr-reader");
    }

    // Cleanup
    return () => {
      if (html5Qrcode && isScanning) {
        html5Qrcode.stop().catch(console.error);
      }
    };
  }, [showQRScanner]);

  const toggleScanning = async () => {
    const html5Qrcode = new Html5Qrcode("qr-reader");
    
    if (!isScanning) {
      try {
        await html5Qrcode.start(
          { facingMode: { exact: "environment" } },
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
          },
          async (decodedText: string) => {
            console.log("Scanned QR code content:", decodedText);
            
            try {
              // Stop scanning immediately
              await html5Qrcode.stop();
              setIsScanning(false);
              setShowQRScanner(false);
              
              // Find matching festival and QR code
              let matchingFestival: Festival | undefined;
              let matchingQRCode: any;

              // Log all QR codes for debugging
              festivals.forEach(festival => {
                console.log("Festival QR codes:", festival.qrCodes);
              });

              for (const festival of festivals) {
                const qrCode = festival.qrCodes?.find(qr => {
                  console.log("Comparing:", {
                    stored: qr.code,
                    scanned: decodedText
                  });
                  return qr.code === decodedText;
                });
                
                if (qrCode) {
                  matchingFestival = festival;
                  matchingQRCode = qrCode;
                  break;
                }
              }

              if (matchingFestival && matchingQRCode && user) {
                // Update user's access
                const userRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userRef);
                const userData = userDoc.data();

                await updateDoc(userRef, {
                  accessibleFestivals: arrayUnion(matchingFestival.id),
                  accessibleCategories: {
                    ...(userData?.accessibleCategories || {}),
                    [matchingFestival.id]: matchingQRCode.linkedCategories
                  }
                });

                // Update local state
                setAccessibleFestivals(prev => new Set([...prev, matchingFestival.id]));
                setAccessibleCategories(prev => ({
                  ...prev,
                  [matchingFestival.id]: matchingQRCode.linkedCategories
                }));

                // Navigate directly to content view
                setSelectedFestival(matchingFestival.id);
                setShowFestivalList(false);
                setShowAccessInput(false);
                setShowQRScanner(false);
                setSelectedCategory("");
              } else {
                setGeneralAccessError("Invalid QR code");
              }
            } catch (error) {
              console.error("Error processing QR code:", error);
              setGeneralAccessError("Error processing QR code");
            }
          },
          (errorMessage: string) => {
            if (errorMessage.includes("NotFound")) {
              setScanError("No QR code found. Please try again.");
            } else if (errorMessage.includes("NotAllowed")) {
              setScanError("Camera access denied. Please grant camera permissions.");
            } else {
              setScanError("Error scanning QR code. Please try again.");
            }
          }
        );
        setIsScanning(true);
      } catch (err) {
        console.error("Error starting scanner:", err);
        setScanError("Failed to start scanner. Please try again.");
      }
    } else {
      try {
        await html5Qrcode.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/signin");
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
    setShowFestivalList(false);
  };

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Clean up the access code by removing whitespace and converting to lowercase
      const cleanedCode = generalAccessCode?.trim().toLowerCase() || '';
      if (!cleanedCode) {
        setGeneralAccessError("Please enter an access code");
        return;
      }
      
      // First check if it's a valid URL
      let codeToCheck = cleanedCode;
      try {
        // If it's a URL, we'll use it as is
        new URL(cleanedCode);
      } catch {
        // If it's not a URL, we'll use it as a regular code
        codeToCheck = cleanedCode;
      }

      // First check for QR codes
      let matchingFestival: Festival | undefined;
      let matchingQRCode: any;

      for (const festival of festivals) {
        const qrCode = festival.qrCodes?.find(qr => {
          if (!qr?.code) return false;
          // Compare both the original code and cleaned version
          const qrCodeClean = qr.code.trim().toLowerCase();
          return qrCodeClean === codeToCheck || qrCodeClean === cleanedCode;
        });
        
        if (qrCode) {
          matchingFestival = festival;
          matchingQRCode = qrCode;
          break;
        }
      }

      if (matchingFestival && matchingQRCode) {
        // QR code found - grant access to linked categories
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        // Update the user document with the new festival access
        await updateDoc(userRef, {
          accessibleFestivals: arrayUnion(matchingFestival.id),
          accessibleCategories: {
            ...(userData?.accessibleCategories || {}),
            [matchingFestival.id]: matchingQRCode.linkedCategories
          }
        });

        // Update local state
        setAccessibleFestivals(prev => new Set([...prev, matchingFestival.id]));
        setAccessibleCategories(prev => ({
          ...prev,
          [matchingFestival.id]: matchingQRCode.linkedCategories
        }));

        // Set states to show content view
        setSelectedFestival(matchingFestival.id);
        setShowAccessInput(false);
        setShowFestivalList(false);
        setShowQRScanner(false);
        setGeneralAccessError(null);
        setSelectedCategory("");
        
        return;
      }

      // If no QR code found, check regular access codes
      const festival = festivals.find(f => {
        if (f.accessCode === cleanedCode) return true;
        return f.categoryAccessCodes?.some(ac => ac?.code?.toLowerCase() === cleanedCode);
      });

      if (festival) {
        try {
          let accessibleCategories: string[] = [];
          
          // If it's the main festival access code, include all categories
          if (festival.accessCode === cleanedCode) {
            accessibleCategories = festival.categories?.map(c => c.id) || [];
          } else {
            // Check for category access code
            const matchingAccessCode = festival.categoryAccessCodes?.find(
              ac => ac?.code?.toLowerCase() === cleanedCode
            );
            
            if (matchingAccessCode) {
              // Use categories from access code
              accessibleCategories = matchingAccessCode.categoryIds;
            }
          }

          const userRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.data();

          // Update the user document with the new festival access
          await updateDoc(userRef, {
            accessibleFestivals: arrayUnion(festival.id),
            accessibleCategories: {
              ...(userData?.accessibleCategories || {}),
              [festival.id]: accessibleCategories
            }
          });
          
          // Update local state
          setAccessibleFestivals(prev => new Set([...prev, festival.id]));
          setAccessibleCategories(prev => ({
            ...prev,
            [festival.id]: accessibleCategories
          }));
          
          // Set states to show content view
          setSelectedFestival(festival.id);
          setShowAccessInput(false);
          setShowFestivalList(false);
          setShowQRScanner(false);
          setGeneralAccessError(null);
          setSelectedCategory("");

          // Set the first accessible category as selected if any exist
          if (accessibleCategories.length > 0) {
            setSelectedCategory(accessibleCategories[0]);
          }

        } catch (error) {
          console.error("Error updating user's accessible festivals:", error);
          setGeneralAccessError("Error saving access. Please try again.");
        }
      } else {
        setGeneralAccessError("Invalid access code or QR code");
      }
    } catch (error) {
      console.error("Error processing access:", error);
      setGeneralAccessError("Error processing access. Please try again.");
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

  const filteredPosts = posts.filter(post => {
    // First check if this post belongs to the selected festival
    if (post.festivalId !== selectedFestival) return false;

    // Then check if user has access to this festival
    if (!accessibleFestivals.has(post.festivalId)) return false;

    // Get user's accessible categories for this festival
    const userAccessibleCategories = accessibleCategories[post.festivalId] || [];

    // Filter media files based on category and media type
    const hasAccessibleMedia = post.mediaFiles.some(media => {
      // Check category access
      if (selectedCategory && media.categoryId !== selectedCategory) return false;
      if (!media.categoryId) return false; // Skip media without category
      if (!userAccessibleCategories.includes(media.categoryId)) return false;

      // Check media type
      if (selectedMediaType !== "all" && media.type !== selectedMediaType) return false;

      return true;
    });

    return hasAccessibleMedia;
  }).map(post => ({
    ...post,
    // Filter out media files that don't match the criteria
    mediaFiles: post.mediaFiles.filter(media => {
      // Check category access
      if (selectedCategory && media.categoryId !== selectedCategory) return false;
      if (!media.categoryId) return false; // Skip media without category
      
      const userAccessibleCategories = accessibleCategories[post.festivalId] || [];
      if (!userAccessibleCategories.includes(media.categoryId)) return false;

      // Check media type
      if (selectedMediaType !== "all" && media.type !== selectedMediaType) return false;

      return true;
    })
  }));

  const handleQRFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    try {
      const file = e.target.files[0];
      
      // Check if the file is an image or PDF
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setScanError("Please upload only image or PDF files");
        return;
      }

      // For PDFs, we'll use the filename or generate a unique identifier
      if (file.type === 'application/pdf') {
        const pdfId = `PDF-${crypto.randomUUID()}`;
        console.log("Processing PDF file with ID:", pdfId);
        
        // Process the PDF directly without scanning
        const cleanedCode = pdfId;
        processQRCodeContent(cleanedCode);
        return;
      }

      // For images, proceed with QR scanning
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        if (!event.target?.result) return;
        
        try {
          const html5QrCode = new Html5Qrcode("qr-reader");
          const decodedText = await html5QrCode.scanFile(file, true);
          
          console.log("Scanned QR code content:", decodedText);
          setShowQRScanner(false);

          // Process QR code
          const cleanedCode = decodedText.trim().toLowerCase();
          processQRCodeContent(cleanedCode);
        } catch (error) {
          console.error("Error scanning QR code file:", error);
          setScanError("Failed to read QR code from image. Please try again.");
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error handling file upload:", error);
      setScanError("Error processing file. Please try again.");
    }
  };

  const processQRCodeContent = async (cleanedCode: string) => {
    try {
      // Find matching festival and QR code
      let matchingFestival: Festival | undefined;
      let matchingQRCode: any;

      for (const festival of festivals) {
        const qrCode = festival.qrCodes?.find(qr => {
          if (!qr?.code) return false;
          const qrCodeClean = qr.code.trim().toLowerCase();
          return qrCodeClean === cleanedCode;
        });
        
        if (qrCode) {
          matchingFestival = festival;
          matchingQRCode = qrCode;
          break;
        }
      }

      if (matchingFestival && matchingQRCode && user) {
        // Update user's access
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        await updateDoc(userRef, {
          accessibleFestivals: arrayUnion(matchingFestival.id),
          accessibleCategories: {
            ...(userData?.accessibleCategories || {}),
            [matchingFestival.id]: matchingQRCode.linkedCategories
          }
        });

        // Update local state
        setAccessibleFestivals(prev => new Set([...prev, matchingFestival.id]));
        setAccessibleCategories(prev => ({
          ...prev,
          [matchingFestival.id]: matchingQRCode.linkedCategories
        }));

        // Navigate directly to content view
        setSelectedFestival(matchingFestival.id);
        setShowFestivalList(false);
        setShowAccessInput(false);
        setShowQRScanner(false);
        setSelectedCategory("");
      } else {
        setGeneralAccessError("Invalid QR code");
      }
    } catch (error) {
      console.error("Error processing QR code:", error);
      setGeneralAccessError("Error processing QR code");
    }
  };

  return (
    <div className="min-h-screen w-full overflow-y-auto relative">
      {/* Three.js Background - Make it fixed */}
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

      {/* Content - Add padding bottom for scrolling space */}
      <div className="relative z-10 min-h-screen pb-20">
        {/* Navigation - Position back button */}
        <div className="w-full px-8 mt-8">
          {selectedFestival && (
            <button
              onClick={() => {
                setSelectedFestival("");
                setShowFestivalList(true);
                setShowAccessInput(false);
                setSelectedCategory("");
              }}
              className="text-white/40 hover:text-white/90 
                        transition-all duration-300
                        text-sm font-['Space_Grotesk']"
              aria-label="Return to festivals overview"
            >
              ← Back
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
            <div className="grid md:grid-cols-2 gap-6">
              {/* Access New Festival Card */}
              <div className="backdrop-blur-xl bg-white/10 rounded-2xl 
                            shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                            p-8 border border-white/20">
                <h2 className="text-2xl font-['Space_Grotesk'] tracking-[0.1em] mb-6 text-white/90 
                             flex items-center gap-2">
                  <KeyRound className="text-white/80" size={24} />
                  Access New Festival
                </h2>
                <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
                  <input
                    type="text"
                    value={generalAccessCode}
                    onChange={(e) => setGeneralAccessCode(e.target.value)}
                    placeholder="Enter access code"
                    className="w-full p-3 rounded-lg bg-white/10 border border-white/20 
                             text-white placeholder-white/50 font-['Space_Grotesk']
                             focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
                  />
                  {generalAccessError && (
                    <p className="text-red-400 text-sm">{generalAccessError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 px-8 py-3 border-2 border-white/30 rounded-full
                               text-white text-lg font-['Space_Grotesk'] tracking-[0.2em]
                               transition-all duration-300 
                               hover:border-white/60 hover:scale-105
                               hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]
                               active:scale-95"
                    >
                      JOIN FESTIVAL
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQRScanner(true)}
                      className="aspect-square bg-white/10 text-white p-4 rounded-full
                               border-2 border-white/30
                               hover:border-white/60 hover:bg-white/20
                               transition-all duration-300"
                    >
                      <QrCode size={24} />
                    </button>
                  </div>
                </form>
              </div>

              {/* Your Accessible Festivals Card */}
              <div className="backdrop-blur-xl bg-white/10 rounded-2xl 
                            shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                            p-8 border border-white/20">
                <h2 className="text-2xl font-['Space_Grotesk'] tracking-[0.1em] mb-6 text-white/90 
                             flex items-center gap-2">
                  <Star className="text-white/80" size={24} />
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
                        className="w-full text-left p-5 rounded-xl bg-white/10 
                                 border border-white/20
                                 hover:border-white/40 hover:bg-white/20
                                 transition-all duration-300 group"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-['Space_Grotesk'] text-white/90 group-hover:text-white 
                                       transition-colors mb-1">
                              {festival.name}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-2 h-2 bg-white/40 rounded-full"></span>
                              <p className="text-sm text-white/60 font-['Space_Grotesk']">
                                {festival.categories?.length || 0} Categories Available
                              </p>
                            </div>
                          </div>
                          <span className="text-white/60 opacity-0 group-hover:opacity-100 
                                       transition-all duration-300 transform translate-x-2 group-hover:translate-x-0
                                       font-['Space_Grotesk']">
                            View Content →
                          </span>
                        </div>
                      </button>
                    ))}
                
                  {festivals.filter(festival => accessibleFestivals.has(festival.id)).length === 0 && (
                    <div className="text-center py-8 px-4 bg-white/10 rounded-xl border border-white/20">
                      <div className="mb-3 text-white/40">
                        <Package size={32} className="mx-auto" />
                      </div>
                      <p className="text-white/80 font-['Space_Grotesk']">
                        No festivals accessed yet
                      </p>
                      <p className="text-sm text-white/60 mt-1 font-['Space_Grotesk']">
                        Enter an access code to join your first festival
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-center text-white/60 mt-8 font-['Space_Grotesk'] tracking-wider
                         hover:text-white/90 transition-colors duration-300">
              Experience the moment. Cherish forever.
            </p>
          </div>
        ) : (
          // Festival content view
          <div className="max-w-6xl mx-auto px-4 pb-20">
            {/* Back button - Positioned above festival name */}
            <div className="mb-4">
              <button
                onClick={() => {
                  setSelectedFestival("");
                  setShowFestivalList(true);
                  setShowAccessInput(false);
                  setSelectedCategory("");
                }}
                className="backdrop-blur-xl bg-white/5 rounded-full 
                          px-6 py-2.5 border border-white/10
                          text-white/50 hover:text-white/90 
                          transition-all duration-300
                          text-sm font-['Space_Grotesk'] tracking-wider
                          hover:bg-white/10 hover:border-white/20"
                aria-label="Return to festivals overview"
              >
                Back
              </button>
            </div>

            {/* Festival Header Section */}
            <div className="mb-12 grid grid-cols-1 md:grid-cols-[1fr,auto] gap-8 items-stretch">
              {/* Festival Name */}
              <div className="backdrop-blur-xl bg-white/10 rounded-2xl 
                            shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                            p-8 border border-white/20
                            flex flex-col justify-center">
                <h1 className="text-4xl md:text-5xl font-['Space_Grotesk'] tracking-[0.1em] text-white/90">
                  {festivals.find(f => f.id === selectedFestival)?.name}
                </h1>
                <div className="mt-2">
                  <span className="text-white/60 text-sm font-['Space_Grotesk']">
                    View and filter your festival content below
                  </span>
                </div>
              </div>

              {/* Filters Section - Moved to right */}
              <div className="backdrop-blur-xl bg-white/10 rounded-2xl 
                            shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                            p-6 border border-white/20
                            md:min-w-[300px]">
                <div className="space-y-6">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                      Filter by Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCategory("")}
                        className={`px-6 py-2.5 rounded-full transition-all transform hover:scale-105 
                                  font-['Space_Grotesk'] ${
                        selectedCategory === ""
                          ? "bg-white/20 text-white border-2 border-white/40"
                          : "bg-white/10 text-white/70 border border-white/20 hover:bg-white/20"
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
                            className={`px-6 py-2.5 rounded-full transition-all transform hover:scale-105 
                                      font-['Space_Grotesk'] ${
                              selectedCategory === category.id
                                ? "bg-white/20 text-white border-2 border-white/40"
                                : "bg-white/10 text-white/70 border border-white/20 hover:bg-white/20"
                            }`}
                          >
                            {category.name}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Media Type Filter */}
                  <div>
                    <label className="block text-sm font-['Space_Grotesk'] text-white/60 mb-2">
                      Media Type
                    </label>
                    <div className="inline-flex bg-white/5 p-1 rounded-full border border-white/10">
                      {["all", "image", "video"].map((type) => (
                        <button
                          key={type}
                          onClick={() => setSelectedMediaType(type as "all" | "image" | "video")}
                          className={`px-6 py-2 rounded-full transition-all duration-200 
                                    font-['Space_Grotesk'] ${
                            selectedMediaType === type
                              ? "bg-white/20 text-white"
                              : "text-white/60 hover:text-white"
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Media Grid */}
            {loadingError && (
              <div className="text-red-400 text-center mb-4 font-['Space_Grotesk']">
                {loadingError}
              </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPosts.flatMap((post, postIndex) => 
                post.mediaFiles.map((media, mediaIndex) => (
                  <div key={`${post.id}-${mediaIndex}`} className="relative group">
                    {media.type === 'video' ? (
                      <div className="aspect-[9/16] rounded-2xl overflow-hidden 
                                    backdrop-blur-xl bg-white/10 border border-white/20">
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
                    ) : (
                      <div className="aspect-[9/16] rounded-2xl overflow-hidden 
                                    backdrop-blur-xl bg-white/10 border border-white/20">
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
                    )}
                    {post.text && (
                      <p className="text-white/80 mt-2 text-sm text-center font-['Space_Grotesk']">
                        {post.text}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
            
            {filteredPosts.length === 0 && !loadingError && (
              <div className="text-center text-white/60 mt-12 font-['Space_Grotesk']">
                <p className="text-xl">
                  {posts.length === 0 ? "No posts yet" : "No posts match the selected filters"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* QR Scanner Modal with updated styling */}
        {showQRScanner && (
          <div className="fixed inset-0 backdrop-blur-xl bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 rounded-3xl p-6 max-w-md w-full mx-4 relative 
                           border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              <button
                onClick={() => {
                  setShowQRScanner(false);
                  setIsScanning(false);
                }}
                className="absolute -top-4 -right-4 p-2 rounded-full bg-white/10 
                           border border-white/20 hover:bg-white/20 
                           transition-colors duration-200"
                aria-label="Close scanner"
              >
                <X size={24} className="text-white" />
              </button>
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-['Space_Grotesk'] tracking-[0.1em] text-white/90">
                  Scan Festival QR Code
                </h3>
                <p className="text-white/60 text-sm mt-2 font-['Space_Grotesk']">
                  Use your camera or upload a QR code image
                </p>
              </div>
              
              <div className="relative rounded-2xl overflow-hidden bg-black/30 
                              border border-white/10 shadow-inner">
                <div id="qr-reader" className="w-full max-w-sm mx-auto"></div>
                <div className="absolute inset-0 border-2 border-white/20 rounded-2xl pointer-events-none">
                  <div className="absolute inset-12 border-2 border-dashed border-white/10 rounded-xl"></div>
                </div>
              </div>
              
              {scanError && (
                <div className="mt-4 p-3 bg-white/5 rounded-xl border border-red-500/20">
                  <p className="text-red-400 text-sm text-center font-['Space_Grotesk'] flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    {scanError}
                  </p>
                </div>
              )}
              
              <div className="mt-6 space-y-3">
                {/* Camera controls */}
                <button
                  onClick={toggleScanning}
                  className="w-full py-3 px-4 border-2 border-white/30 rounded-full
                            text-white font-['Space_Grotesk'] tracking-[0.2em]
                            transition-all duration-300 
                            hover:border-white/60 hover:scale-105
                            hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]
                            active:scale-95
                            flex items-center justify-center gap-2"
                >
                  <Camera size={20} />
                  {isScanning ? "STOP SCANNING" : "START CAMERA"}
                </button>

                {/* File upload option */}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleQRFileUpload}
                    className="hidden"
                    id="qr-file-input"
                  />
                  <label
                    htmlFor="qr-file-input"
                    className="w-full py-3 px-4 bg-white/10 text-white/90 rounded-full 
                             border border-white/20 hover:bg-white/20 
                             transition-all duration-200 font-['Space_Grotesk'] tracking-[0.1em]
                             cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Upload size={20} />
                    UPLOAD QR CODE
                  </label>
                </div>

                <button
                  onClick={() => {
                    setShowQRScanner(false);
                    setIsScanning(false);
                  }}
                  className="w-full py-3 text-white/60 text-sm hover:text-white/90 
                             transition-colors duration-200 font-['Space_Grotesk'] tracking-wider"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
