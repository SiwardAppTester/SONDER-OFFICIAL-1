import React, { useState, useEffect, Suspense } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, arrayUnion, arrayRemove, serverTimestamp, getDoc, getDocs, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User } from 'firebase/auth';
import { Heart, MessageCircle, Send, Image, Video, X, Plus, Search as SearchIcon, Share as ShareIcon } from 'lucide-react';
import Sidebar from './Sidebar';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { useNavigate } from 'react-router-dom';
import BusinessSidebar from './BusinessSidebar';
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';

interface MediaFile {
  url: string;
  type: "image" | "video";
}

interface Post {
  id: string;
  text: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  createdAt: any;
  likes: string[];
  comments: Comment[];
  mediaFiles?: MediaFile[];
}

interface Comment {
  id: string;
  text: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  createdAt: any;
  likes: string[];
}

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  username?: string;
  following?: string[];
  isBusinessAccount?: boolean;
  accessibleFestivals?: string[];
}

interface DiscoverProps {
  isBusinessAccount: boolean;
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

const CommentDrawer = ({ isOpen, onClose, post, user, commentText, setCommentText, handleComment, handleCommentLike, handleDeleteComment }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative bg-black/90 backdrop-blur-xl
                    rounded-t-[2rem] border-t border-white/20
                    transform transition-transform duration-300
                    h-[60vh] max-h-[800px]">
        {/* Handle */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-12 h-1 bg-white/20 rounded-full"/>
        </div>

        {/* Comments Header */}
        <div className="px-4 pb-4 flex items-center justify-between border-b border-white/10">
          <h3 className="text-white/90 font-medium">Comments ({post.comments.length})</h3>
          <button onClick={onClose} className="text-white/60">
            <X size={20} />
          </button>
        </div>

        {/* Comments List */}
        <div className="overflow-y-auto p-4 space-y-4" style={{ height: 'calc(100% - 140px)' }}>
          {post.comments.map((comment) => (
            <div key={comment.id} className="bg-white/5 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                {comment.userPhotoURL ? (
                  <img
                    src={comment.userPhotoURL}
                    alt={comment.userDisplayName}
                    className="w-8 h-8 rounded-full border border-white/20"
                  />
                ) : (
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                    <span className="text-white/90 text-sm">
                      {comment.userDisplayName[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-white/90">
                      {comment.userDisplayName}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCommentLike(post.id, comment.id)}
                        className="text-white/60 hover:text-white"
                      >
                        <Heart
                          size={14}
                          className={user && comment.likes?.includes(user.uid) ? 
                                   "fill-white" : ""}
                        />
                      </button>
                      {/* Only show delete button if comment belongs to current user */}
                      {user && comment.userId === user.uid && (
                        <button
                          onClick={() => handleDeleteComment(post.id, comment.id)}
                          className="text-white/60 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-white/80 text-sm mt-1">{comment.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Comment Input */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/90 border-t border-white/10">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={commentText[post.id] || ''}
              onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
              placeholder="Add a comment..."
              className="flex-1 p-3 rounded-lg bg-white/5 border border-white/20
                       text-white placeholder-white/50
                       focus:outline-none focus:ring-2 focus:ring-white/30"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleComment(post.id);
                }
              }}
            />
            <button
              onClick={() => handleComment(post.id)}
              className="p-3 rounded-lg bg-white/10 hover:bg-white/20 
                        border border-white/20 transition-colors"
            >
              <Send size={20} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Discover: React.FC<DiscoverProps> = ({ isBusinessAccount }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [showComments, setShowComments] = useState<{ [key: string]: boolean }>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedFestival, setSelectedFestival] = useState<string>('');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [chatUsers, setChatUsers] = useState<UserProfile[]>([]);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showFollowingOnly, setShowFollowingOnly] = useState(false);
  const navigate = useNavigate();
  const [activeCommentDrawer, setActiveCommentDrawer] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setUserProfile(userData as UserProfile);
      }
    });

    const unsubscribePosts = onSnapshot(
      query(collection(db, "discover_posts"), orderBy("createdAt", "desc")),
      (snapshot) => {
        const postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];
        setPosts(postsData);
      }
    );

    return () => {
      unsubscribeAuth();
      unsubscribePosts();
    };
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      console.log("No user logged in");
      return;
    }

    // Check if user has a business account
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();
    
    if (!userData?.isBusinessAccount) {
      alert("Only business accounts can create posts");
      return;
    }

    if (!newPost.trim() && selectedFiles.length === 0) {
      console.log("No content to post");
      return;
    }

    // Close modal immediately to prevent multiple submissions
    setShowCreatePost(false);

    try {
      setUploadProgress(0);
      const mediaFiles: MediaFile[] = [];

      // Upload files if any
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileRef = ref(storage, `discover_posts/${user.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          
          mediaFiles.push({
            url,
            type: file.type.startsWith('image/') ? 'image' : 'video'
          });

          setUploadProgress((prev) => prev + (100 / selectedFiles.length));
        }
      }

      // Create the post document
      const postData = {
        text: newPost.trim(),
        userId: user.uid,
        userDisplayName: userProfile?.displayName || 'Anonymous',
        userPhotoURL: userProfile?.photoURL || null,
        createdAt: serverTimestamp(),
        likes: [],
        comments: [],
        mediaFiles: mediaFiles.length > 0 ? mediaFiles : []
      };

      await addDoc(collection(db, "discover_posts"), postData);

      // Reset form state
      setNewPost('');
      setSelectedFiles([]);
      setPreviewUrls([]);
      setUploadProgress(0);

      console.log("Post created successfully");
    } catch (error) {
      console.error("Error creating post:", error);
      // Optionally show error message to user
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    const postRef = doc(db, "discover_posts", postId);
    const postDoc = await getDoc(postRef);
    const likes = postDoc.data()?.likes || [];

    if (likes.includes(user.uid)) {
      await updateDoc(postRef, {
        likes: arrayRemove(user.uid)
      });
    } else {
      await updateDoc(postRef, {
        likes: arrayUnion(user.uid)
      });
    }
  };

  const handleComment = async (postId: string) => {
    if (!user || !commentText[postId]?.trim()) return;

    try {
      const postRef = doc(db, "discover_posts", postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        console.error("Post not found");
        return;
      }

      const newComment = {
        id: Math.random().toString(36).substr(2, 9),
        text: commentText[postId].trim(),
        userId: user.uid,
        userDisplayName: userProfile?.displayName || 'Anonymous',
        userPhotoURL: userProfile?.photoURL,
        createdAt: new Date().toISOString(),
        likes: []
      };

      const currentComments = postDoc.data().comments || [];
      
      await updateDoc(postRef, {
        comments: [...currentComments, newComment]
      });

      // Clear comment input
      setCommentText(prev => ({ ...prev, [postId]: '' }));
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleCommentLike = async (postId: string, commentId: string) => {
    if (!user) return;

    try {
      const postRef = doc(db, "discover_posts", postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        console.error("Post not found");
        return;
      }

      const post = postDoc.data();
      const comments = post.comments || [];
      const commentIndex = comments.findIndex((c: Comment) => c.id === commentId);

      if (commentIndex === -1) return;

      const comment = comments[commentIndex];
      const likes = comment.likes || [];
      
      // Toggle like
      if (likes.includes(user.uid)) {
        likes.splice(likes.indexOf(user.uid), 1);
      } else {
        likes.push(user.uid);
      }

      comments[commentIndex] = { ...comment, likes };

      // Update the post with modified comments
      await updateDoc(postRef, {
        comments: comments
      });
    } catch (error) {
      console.error("Error liking comment:", error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    setSelectedFiles(prev => [...prev, ...validFiles]);

    validFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      setPreviewUrls(prev => [...prev, url]);
    });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const filteredPosts = posts.filter(post => {
    // First apply search filter
    const matchesSearch = !searchQuery.trim() || 
      post.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.userDisplayName.toLowerCase().includes(searchQuery.toLowerCase());

    // Then apply following filter if needed
    if (showFollowingOnly && userProfile) {
      const following = userProfile.following || [];
      return matchesSearch && following.includes(post.userId);
    }

    return matchesSearch;
  });

  const fetchChatUsers = async () => {
    if (!user) return;
    
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const users = usersSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            username: data.username || 'anonymous'
          };
        })
        .filter(u => u.id !== user.uid)
        .sort((a, b) => (a.username || '').localeCompare(b.username || '')) as UserProfile[];
      setChatUsers(users);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleShareToChat = async (userId: string, postId: string) => {
    if (!user) return;

    try {
      // Create or get existing chat room
      const chatRoomQuery = query(
        collection(db, "chatRooms"),
        where("participants", "array-contains", user.uid)
      );
      const chatRoomSnapshot = await getDocs(chatRoomQuery);
      let chatRoomId = "";

      const existingChatRoom = chatRoomSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.participants.includes(userId);
      });

      if (existingChatRoom) {
        chatRoomId = existingChatRoom.id;
      } else {
        // Create new chat room
        const newChatRoomRef = await addDoc(collection(db, "chatRooms"), {
          participants: [user.uid, userId],
          lastMessage: "Shared a post",
          lastMessageTimestamp: serverTimestamp()
        });
        chatRoomId = newChatRoomRef.id;
      }

      // Add message to messages collection (not chatRooms/messages)
      await addDoc(collection(db, "messages"), {
        chatRoomId: chatRoomId,
        senderId: user.uid,
        receiverId: userId,
        type: "shared_post",
        postId: postId,
        text: "Shared a post",
        postLink: `/discover/post/${postId}`,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        participants: [user.uid, userId] // Add this field to help with querying
      });

      // Update chat room's last message
      await updateDoc(doc(db, "chatRooms", chatRoomId), {
        lastMessage: "Shared a post",
        lastMessageTimestamp: serverTimestamp()
      });

      // Show success message
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);

      // Close share modal
      setShowShareModal(null);

    } catch (error) {
      console.error("Error sharing post:", error);
    }
  };

  // Add this useEffect to fetch chat users when share modal opens
  useEffect(() => {
    if (showShareModal) {
      fetchChatUsers();
    }
  }, [showShareModal]);

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!user) return;

    try {
      const postRef = doc(db, "discover_posts", postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        console.error("Post not found");
        return;
      }

      const post = postDoc.data();
      const updatedComments = post.comments.filter((c: Comment) => c.id !== commentId);

      await updateDoc(postRef, {
        comments: updatedComments
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
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

      {/* Sidebar */}
      {isBusinessAccount ? (
        <BusinessSidebar
          isNavOpen={isNavOpen}
          setIsNavOpen={setIsNavOpen}
          user={user}
          userProfile={userProfile}
          accessibleFestivalsCount={userProfile?.accessibleFestivals?.length || 0}
        />
      ) : (
        <Sidebar
          isNavOpen={isNavOpen}
          setIsNavOpen={setIsNavOpen}
          user={user}
          userProfile={userProfile}
          setSelectedFestival={setSelectedFestival}
        />
      )}

      {/* Main Content - Add margin-left for desktop */}
      <div className="relative z-10 min-h-screen md:ml-0">
        {/* Navigation */}
        <div className="flex justify-end items-center p-4">
          {userProfile?.isBusinessAccount && (
            <button
              onClick={() => setShowCreatePost(true)}
              className="bg-white/10 text-white p-2 rounded-full 
                       hover:bg-white/20 border border-white/20
                       transition-all duration-300 transform hover:scale-105
                       shadow-[0_0_20px_rgba(255,255,255,0.1)]
                       hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              aria-label="Create new post"
            >
              <Plus size={24} />
            </button>
          )}
        </div>

        {/* Search Section with Feed Toggle */}
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            {/* Feed Toggle */}
            <div className="backdrop-blur-xl bg-white/10 rounded-full p-1 flex 
                         shadow-[0_0_20px_rgba(255,255,255,0.1)] border border-white/20">
              <button
                onClick={() => setShowFollowingOnly(false)}
                className={`flex-1 px-4 py-2 rounded-full transition-all duration-300 
                         ${!showFollowingOnly ? 'bg-white/20 text-white' : 'text-white/60'}`}
              >
                All Posts
              </button>
              <button
                onClick={() => setShowFollowingOnly(true)}
                className={`flex-1 px-4 py-2 rounded-full transition-all duration-300 
                         ${showFollowingOnly ? 'bg-white/20 text-white' : 'text-white/60'}`}
              >
                Following
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts..."
                className="w-full px-6 py-4 pr-12 rounded-lg 
                         bg-white/10 border border-white/20
                         text-white placeholder-white/50 
                         focus:outline-none focus:ring-2 focus:ring-white/30 
                         transition-all duration-300"
              />
              <SearchIcon 
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60"
                size={20}
              />
            </div>
          </div>

          {/* Posts List */}
          <div className="space-y-6 mt-6">
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <div key={post.id} 
                     className="backdrop-blur-xl bg-white/10 rounded-xl 
                              shadow-[0_0_20px_rgba(255,255,255,0.1)]
                              border border-white/20 p-4">
                  {/* Post Header */}
                  <div className="flex items-center mb-4">
                    {post.userPhotoURL ? (
                      <img
                        src={post.userPhotoURL}
                        alt={post.userDisplayName}
                        className="w-10 h-10 rounded-full border border-white/20"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-white/10 rounded-full 
                                    border border-white/20
                                    flex items-center justify-center">
                        <span className="text-white font-medium">
                          {post.userDisplayName[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="ml-3">
                      <p className="font-medium text-white">{post.userDisplayName}</p>
                      <p className="text-sm text-white/60">
                        {post.createdAt?.toDate().toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Post Content with Responsive Layout */}
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Left Side - Media Content and Like Button */}
                    <div className="relative flex-1">
                      {/* Text Content */}
                      <p className="text-white/90 mb-4">{post.text}</p>
                      
                      {/* Media Content with Action Buttons */}
                      {post.mediaFiles && post.mediaFiles.length > 0 && (
                        <div className="relative rounded-lg overflow-hidden border border-white/20">
                          {post.mediaFiles.map((media, index) => (
                            <div key={index} className="relative w-full">
                              {media.type === 'image' ? (
                                <img
                                  src={media.url}
                                  alt="Post content"
                                  className="w-full object-cover rounded-lg"
                                />
                              ) : (
                                <video
                                  src={media.url}
                                  controls
                                  className="w-full object-cover rounded-lg"
                                />
                              )}
                            </div>
                          ))}
                          
                          {/* Action Buttons */}
                          <div className="absolute bottom-4 right-4 backdrop-blur-md bg-black/30 
                                        rounded-lg p-2 flex items-center gap-3 
                                        border border-white/10">
                            {/* Like Button */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white/80">{post.likes.length}</span>
                              <button
                                onClick={() => handleLike(post.id)}
                                className="flex items-center"
                              >
                                <Heart
                                  size={20}
                                  className={`${user && post.likes.includes(user.uid) ? 
                                            "fill-white text-white" : "text-white/60"} 
                                          hover:text-white transition-colors`}
                                />
                              </button>
                            </div>

                            {/* Comment Button - Mobile Only */}
                            <div className="flex items-center gap-2 md:hidden">
                              <span className="text-sm text-white/80">{post.comments.length}</span>
                              <button
                                onClick={() => setActiveCommentDrawer(post.id)}
                                className="flex items-center text-white/60 hover:text-white"
                              >
                                <MessageCircle size={20} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Side - Comments Section (Desktop Only) */}
                    <div className="w-72 border-l border-white/10 pl-4 flex-col hidden md:flex">
                      {/* Comments Header */}
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-white/90 font-medium">Comments</h3>
                        <span className="text-white/60 text-sm">{post.comments.length}</span>
                      </div>

                      {/* Comments List - Scrollable with space for input */}
                      <div className="overflow-y-auto pr-2 space-y-4" style={{ height: 'calc(100% - 120px)' }}>
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="bg-white/5 p-3 rounded-lg">
                            <div className="flex items-start gap-2">
                              {comment.userPhotoURL ? (
                                <img
                                  src={comment.userPhotoURL}
                                  alt={comment.userDisplayName}
                                  className="w-8 h-8 rounded-full border border-white/20"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                                  <span className="text-white/90 text-sm">
                                    {comment.userDisplayName[0].toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <p className="text-sm font-medium text-white/90">
                                    {comment.userDisplayName}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleCommentLike(post.id, comment.id)}
                                      className="text-white/60 hover:text-white"
                                    >
                                      <Heart
                                        size={14}
                                        className={user && comment.likes?.includes(user.uid) ? 
                                                 "fill-white" : ""}
                                      />
                                    </button>
                                    {/* Only show delete button if comment belongs to current user */}
                                    {user && comment.userId === user.uid && (
                                      <button
                                        onClick={() => handleDeleteComment(post.id, comment.id)}
                                        className="text-white/60 hover:text-red-500 transition-colors"
                                      >
                                        <X size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-white/80 text-sm mt-1">{comment.text}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Comment Input - Fixed at bottom of comments section */}
                      <div className="mt-auto pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={commentText[post.id] || ''}
                            onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                            placeholder="Add a comment..."
                            className="flex-1 p-3 rounded-lg bg-white/5 border border-white/20
                                     text-white placeholder-white/50
                                     focus:outline-none focus:ring-2 focus:ring-white/30"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleComment(post.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleComment(post.id)}
                            className="p-3 rounded-lg bg-white/10 hover:bg-white/20 
                                      border border-white/20 transition-colors"
                          >
                            <Send size={20} className="text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Comment Drawer */}
                  <CommentDrawer
                    isOpen={activeCommentDrawer === post.id}
                    onClose={() => setActiveCommentDrawer(null)}
                    post={post}
                    user={user}
                    commentText={commentText}
                    setCommentText={setCommentText}
                    handleComment={handleComment}
                    handleCommentLike={handleCommentLike}
                    handleDeleteComment={handleDeleteComment}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-8 backdrop-blur-xl bg-white/10 rounded-xl 
                             border border-white/20">
                <p className="text-white/60">
                  {showFollowingOnly 
                    ? "No posts found from people you follow" 
                    : "No posts found matching your search"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl 
                        shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                        border border-white/20 
                        w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Create Post</h2>
              <button
                onClick={() => setShowCreatePost(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreatePost} className="p-4">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full p-3 bg-white/5 border border-white/20 rounded-lg 
                          resize-none text-white placeholder-white/50
                          focus:outline-none focus:ring-2 focus:ring-white/30
                          transition-all duration-300"
                rows={3}
              />
              
              {/* Media Preview */}
              {previewUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative">
                      {selectedFiles[index]?.type.startsWith('image/') ? (
                        <img
                          src={url}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded-lg border border-white/20"
                        />
                      ) : (
                        <video
                          src={url}
                          className="w-20 h-20 object-cover rounded-lg border border-white/20"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 bg-red-500/80 text-white 
                               rounded-full p-1 backdrop-blur-sm
                               hover:bg-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-3 w-full bg-white/10 rounded-full h-2.5">
                  <div
                    className="bg-white/30 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}

              <div className="mt-3 flex justify-between items-center">
                <div className="flex gap-2">
                  <label className="cursor-pointer text-white/80 hover:text-white 
                                p-2 rounded-lg hover:bg-white/10 transition-colors 
                                flex items-center gap-2 border border-white/20">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      multiple
                    />
                    <Image size={20} />
                    <span className="text-sm">Add Media</span>
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={!newPost.trim() && selectedFiles.length === 0}
                  className="px-6 py-2 bg-white/10 text-white rounded-full 
                           hover:bg-white/20 transition-all duration-300
                           disabled:opacity-50 disabled:cursor-not-allowed
                           border border-white/20"
                >
                  Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl 
                        shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                        border border-white/20 
                        w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-2xl font-['Space_Grotesk'] tracking-[0.1em] text-white/90">
                Share with
              </h2>
              <button
                onClick={() => setShowShareModal(null)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Users List */}
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
              {chatUsers.map((chatUser) => (
                <button
                  key={chatUser.id}
                  onClick={() => handleShareToChat(chatUser.id, showShareModal)}
                  className="w-full flex items-center gap-3 p-3 
                           bg-white/5 hover:bg-white/10 
                           border border-white/10 hover:border-white/20
                           rounded-lg transition-all duration-300
                           group"
                >
                  {chatUser.photoURL ? (
                    <img
                      src={chatUser.photoURL}
                      alt={`@${chatUser.username}`}
                      className="w-10 h-10 rounded-full border border-white/20"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-white/10 rounded-full 
                                 border border-white/20
                                 flex items-center justify-center">
                      <span className="text-white/90 font-medium">
                        {chatUser.username ? chatUser.username[0].toUpperCase() : 'A'}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col items-start">
                    <span className="text-white/90 font-medium group-hover:text-white transition-colors">
                      @{chatUser.username}
                    </span>
                    {chatUser.displayName && chatUser.displayName !== chatUser.username && (
                      <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                        {chatUser.displayName}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {shareSuccess && (
        <div className="fixed bottom-4 right-4 
                      backdrop-blur-xl bg-white/10 
                      text-white px-6 py-3 rounded-lg 
                      shadow-[0_0_20px_rgba(255,255,255,0.1)]
                      border border-white/20
                      z-50 animate-fade-in-up">
          Post shared successfully!
        </div>
      )}
    </div>
  );
};

export default Discover; 