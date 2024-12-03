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
              
              // Process the code immediately without showing the input
              const cleanedCode = decodedText.trim().toLowerCase();
              
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
                if (matchingQRCode.linkedCategories.length > 0) {
                  setSelectedCategory(matchingQRCode.linkedCategories[0]);
                }
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
        
        // Set the first linked category as selected if any exist
        if (matchingQRCode.linkedCategories.length > 0) {
          setSelectedCategory(matchingQRCode.linkedCategories[0]);
        }

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

  const handleQRFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    try {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        if (!event.target?.result) return;
        
        try {
          const html5QrCode = new Html5Qrcode("qr-reader");
          const decodedText = await html5QrCode.scanFile(file, true);
          
          console.log("Scanned QR code content:", decodedText);
          setShowQRScanner(false);

          // Process QR code directly
          const cleanedCode = decodedText.trim().toLowerCase();
          
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

            // Update local state and navigate directly
            setAccessibleFestivals(prev => new Set([...prev, matchingFestival.id]));
            setAccessibleCategories(prev => ({
              ...prev,
              [matchingFestival.id]: matchingQRCode.linkedCategories
            }));

            // Navigate directly to content view
            setSelectedFestival(matchingFestival.id);
            setShowFestivalList(false);
            setShowAccessInput(false);
            if (matchingQRCode.linkedCategories.length > 0) {
              setSelectedCategory(matchingQRCode.linkedCategories[0]);
            }
          } else {
            setGeneralAccessError("Invalid QR code");
          }
          
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
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 text-white px-8 py-4 rounded-xl
                             font-medium text-lg
                             hover:bg-purple-700 active:bg-purple-800
                             transform transition-all duration-300
                             hover:shadow-[0_4px_20px_rgba(168,85,247,0.3)]
                             focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    Join Festival
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQRScanner(true)}
                    className="aspect-square bg-purple-100 text-purple-600 p-4 rounded-xl
                             hover:bg-purple-200 active:bg-purple-300
                             transform transition-all duration-300
                             focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    <QrCode size={24} />
                  </button>
                </div>
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
                          onClick={() => handleInstagramShare(
                            media.url, 
                            media.type, 
                            post.id, 
                            post.festivalId, 
                            media.categoryId, 
                            mediaIndex
                          )}
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
                          onClick={() => handleInstagramShare(
                            media.url, 
                            media.type, 
                            post.id, 
                            post.festivalId, 
                            media.categoryId, 
                            mediaIndex
                          )}
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

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full mx-4 relative shadow-2xl">
            <button
              onClick={() => setShowQRScanner(false)}
              className="absolute -top-4 -right-4 p-2 rounded-full bg-white shadow-lg 
                         hover:bg-gray-50 transition-colors duration-200"
              aria-label="Close scanner"
            >
              <X size={24} className="text-gray-600" />
            </button>
            
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-800">
                Scan Festival QR Code
              </h3>
              <p className="text-gray-500 text-sm mt-2">
                Use your camera or upload a QR code image
              </p>
            </div>
            
            <div className="relative rounded-2xl overflow-hidden bg-gray-50 shadow-inner">
              <div id="qr-reader" className="w-full max-w-sm mx-auto"></div>
              <div className="absolute inset-0 border-2 border-purple-500/50 rounded-2xl pointer-events-none">
                <div className="absolute inset-12 border-2 border-dashed border-purple-500/30 rounded-xl"></div>
              </div>
            </div>
            
            {scanError && (
              <div className="mt-4 p-3 bg-red-50 rounded-xl">
                <p className="text-red-600 text-sm text-center flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  {scanError}
                </p>
              </div>
            )}
            
            <div className="mt-6 space-y-3">
              {/* Camera controls */}
              <button
                onClick={toggleScanning}
                className="w-full py-3 px-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 
                           transition-colors duration-200 font-medium flex items-center justify-center gap-2"
              >
                <Camera size={20} />
                {isScanning ? "Stop Scanning" : "Start Camera Scanning"}
              </button>

              {/* File upload option */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleQRFileUpload}
                  className="hidden"
                  id="qr-file-input"
                />
                <label
                  htmlFor="qr-file-input"
                  className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 
                           transition-colors duration-200 font-medium cursor-pointer flex items-center justify-center gap-2"
                >
                  <Upload size={20} />
                  Upload QR Code Image
                </label>
              </div>

              <button
                onClick={() => setShowQRScanner(false)}
                className="w-full py-3 text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
