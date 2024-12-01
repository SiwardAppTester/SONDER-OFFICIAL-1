import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, arrayUnion, arrayRemove, serverTimestamp, getDoc, getDocs, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User } from 'firebase/auth';
import { Menu, Heart, MessageCircle, Send, Image, Video, X, Plus, Search as SearchIcon, Share as ShareIcon } from 'lucide-react';
import Sidebar from './Sidebar';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { useNavigate } from 'react-router-dom';

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
}

const Discover: React.FC = () => {
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
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        setUserProfile(userDoc.data() as UserProfile);
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

    if (!newPost.trim() && selectedFiles.length === 0) {
      console.log("No content to post");
      return;
    }

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
      setShowCreatePost(false); // Close the modal after posting

      console.log("Post created successfully");
    } catch (error) {
      console.error("Error creating post:", error);
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
      const newComment = {
        id: Math.random().toString(36).substr(2, 9),
        text: commentText[postId].trim(),
        userId: user.uid,
        userDisplayName: userProfile?.displayName || 'Anonymous',
        userPhotoURL: userProfile?.photoURL,
        createdAt: new Date().toISOString(),
        likes: []
      };

      // Get current post data
      const postDoc = await getDoc(postRef);
      if (!postDoc.exists()) {
        console.error("Post not found");
        return;
      }

      const currentComments = postDoc.data().comments || [];

      // Update post with new comment
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
    if (!searchQuery.trim()) return true;
    
    const lowercaseQuery = searchQuery.toLowerCase();
    return (
      post.text.toLowerCase().includes(lowercaseQuery) ||
      post.userDisplayName.toLowerCase().includes(lowercaseQuery)
    );
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
        const newChatRoomRef = await addDoc(collection(db, "chatRooms"), {
          participants: [user.uid, userId],
          lastMessage: "Shared a post",
          lastMessageTimestamp: serverTimestamp()
        });
        chatRoomId = newChatRoomRef.id;
      }

      // Create message with post link
      const postLink = `/discover/post/${postId}`;
      
      // Add message to chat room
      await addDoc(collection(db, "chatRooms", chatRoomId, "messages"), {
        senderId: user.uid,
        receiverId: userId,
        type: "shared_post",
        postId: postId,
        text: "Shared a post",
        postLink: postLink,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
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
        
        {/* Add Post Button */}
        <button
          onClick={() => setShowCreatePost(true)}
          className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 
                     transition-all duration-300 transform hover:scale-105
                     shadow-lg hover:shadow-purple-500/20"
          aria-label="Create new post"
        >
          <Plus size={24} />
        </button>
      </div>

      <Sidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={user}
        userProfile={userProfile}
        setSelectedFestival={setSelectedFestival}
      />

      {/* Search Section */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="relative mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts..."
            className="w-full px-6 py-4 pr-12 rounded-full bg-white/90 backdrop-blur-sm
                     shadow-[0_0_20px_rgba(168,85,247,0.15)]
                     hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]
                     transition-all duration-300
                     text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <SearchIcon 
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-600"
            size={20}
          />
        </div>

        {/* Posts List - Now using filteredPosts */}
        <div className="space-y-6">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl shadow-lg p-4">
                {/* Post Header */}
                <div className="flex items-center mb-4">
                  {post.userPhotoURL ? (
                    <img
                      src={post.userPhotoURL}
                      alt={post.userDisplayName}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-medium">
                        {post.userDisplayName[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="ml-3">
                    <p className="font-medium">{post.userDisplayName}</p>
                    <p className="text-sm text-gray-500">
                      {post.createdAt?.toDate().toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Post Content */}
                <p className="text-gray-800 mb-4">{post.text}</p>

                {/* Media Content */}
                {post.mediaFiles && post.mediaFiles.length > 0 && (
                  <div className="mb-4 grid gap-2 grid-cols-2">
                    {post.mediaFiles.map((media, index) => (
                      <div key={index} className="relative rounded-lg overflow-hidden">
                        {media.type === 'image' ? (
                          <img
                            src={media.url}
                            alt="Post content"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            src={media.url}
                            controls
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Post Actions */}
                <div className="flex items-center gap-6 mb-4">
                  <button
                    onClick={() => handleLike(post.id)}
                    className="flex items-center gap-2 text-gray-500 hover:text-purple-600"
                  >
                    <Heart
                      size={20}
                      className={user && post.likes.includes(user.uid) ? "fill-purple-600 text-purple-600" : ""}
                    />
                    <span>{post.likes.length}</span>
                  </button>
                  <button
                    onClick={() => setShowComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                    className="flex items-center gap-2 text-gray-500 hover:text-purple-600"
                  >
                    <MessageCircle size={20} />
                    <span>{post.comments.length}</span>
                  </button>
                  <button
                    onClick={() => {
                      fetchChatUsers();
                      setShowShareModal(post.id);
                    }}
                    className="flex items-center gap-2 text-gray-500 hover:text-purple-600 ml-auto"
                  >
                    <ShareIcon size={20} />
                    <span>Share</span>
                  </button>
                </div>

                {/* Comments Section */}
                {showComments[post.id] && (
                  <div className="mt-4 space-y-4">
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                        <div className="flex-shrink-0">
                          {comment.userPhotoURL ? (
                            <img
                              src={comment.userPhotoURL}
                              alt={comment.userDisplayName}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-purple-600 text-sm font-medium">
                                {comment.userDisplayName[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{comment.userDisplayName}</p>
                              <p className="text-gray-800">{comment.text}</p>
                            </div>
                            <button
                              onClick={() => handleCommentLike(post.id, comment.id)}
                              className="flex items-center gap-1 text-sm text-gray-500 hover:text-purple-600 
                                        transition-colors ml-4 flex-shrink-0"
                            >
                              <Heart
                                size={14}
                                className={user && comment.likes?.includes(user.uid) 
                                  ? "fill-purple-600 text-purple-600" 
                                  : ""
                                }
                              />
                              <span>{comment.likes?.length || 0}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Comment */}
                    <div className="flex gap-2 mt-3">
                      <input
                        type="text"
                        value={commentText[post.id] || ''}
                        onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder="Add a comment..."
                        className="flex-grow p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleComment(post.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleComment(post.id)}
                        disabled={!commentText[post.id]?.trim()}
                        className="p-2 text-purple-600 hover:text-purple-700 disabled:opacity-50"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 bg-white/80 rounded-xl shadow-sm">
              <p className="text-gray-600">No posts found matching your search</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Create Post</h2>
              <button
                onClick={() => setShowCreatePost(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreatePost} className="p-4">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      ) : (
                        <video
                          src={url}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}

              <div className="mt-3 flex justify-between items-center">
                <div className="flex gap-2">
                  <label className="cursor-pointer text-purple-600 hover:text-purple-700 p-2 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-2">
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
                  className="px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Share with</h2>
              <button
                onClick={() => setShowShareModal(null)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {chatUsers.map((chatUser) => (
                <button
                  key={chatUser.id}
                  onClick={() => handleShareToChat(chatUser.id, showShareModal)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {chatUser.photoURL ? (
                    <img
                      src={chatUser.photoURL}
                      alt={`@${chatUser.username}`}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-medium">
                        {chatUser.username ? chatUser.username[0].toUpperCase() : 'A'}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col items-start">
                    <span className="font-medium">@{chatUser.username}</span>
                    {chatUser.displayName && chatUser.displayName !== chatUser.username && (
                      <span className="text-sm text-gray-500">{chatUser.displayName}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {shareSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-up">
          Post shared successfully!
        </div>
      )}
    </div>
  );
};

export default Discover; 