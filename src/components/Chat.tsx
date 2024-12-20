import React from 'react'

export default function Chat() {
  return (
    <div>Chat</div>
  )
}




// import React, { useState, useEffect, useRef, Suspense } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import {
//   collection,
//   query,
//   where,
//   orderBy,
//   onSnapshot,
//   addDoc,
//   getDocs,
//   doc,
//   getDoc,
//   serverTimestamp,
// } from "firebase/firestore";
// import { auth, db } from "../firebase";
// import { User } from "firebase/auth";
// import { Menu, Plus, Search, X, Share } from "lucide-react";
// import Sidebar from "./Sidebar";
// import BusinessSidebar from "./BusinessSidebar";
// import SinglePostView from "./SinglePostView";
// import { Canvas } from '@react-three/fiber';
// import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
// import * as THREE from 'three';
// import '../styles/chat.css';

// interface Message {
//   id: string;
//   text: string;
//   senderId: string;
//   receiverId: string;
//   timestamp: any;
//   createdAt: any;
//   type?: string;
//   postId?: string;
//   postLink?: string;
// }

// interface ChatUser {
//   uid: string;
//   displayName: string;
//   email: string;
//   photoURL?: string;
//   lastMessage?: string;
//   timestamp?: any;
//   isGroup?: boolean;
// }

// interface UserProfile {
//   email: string;
//   displayName?: string;
//   photoURL?: string;
//   followers?: string[];
//   following?: string[];
// }

// // Add new interface for chat history
// interface ChatHistory {
//   uid: string;
//   displayName: string;
//   email: string;
//   photoURL?: string;
//   lastMessage: string;
//   timestamp: any;
// }

// // Add new interfaces at the top
// interface GroupChat {
//   id: string;
//   name: string;
//   photoURL?: string;
//   participants: string[];
//   createdBy: string;
//   createdAt: any;
//   lastMessage?: string;
//   timestamp?: any;
// }

// // Update the ChatAvatar component
// const ChatAvatar: React.FC<{ user: ChatUser }> = ({ user }) => {
//   return user.photoURL ? (
//     <img
//       src={user.photoURL}
//       alt={user.displayName}
//       className="w-12 h-12 rounded-full mr-3 object-cover"
//     />
//   ) : (
//     <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-3 text-gray-600 font-medium">
//       {user.isGroup ? (
//         <div className="text-xl">G</div>
//       ) : (
//         <div className="text-xl">{user.displayName[0]}</div>
//       )}
//     </div>
//   );
// };

// // Add the Loader component
// function Loader() {
//   const { progress } = useProgress()
//   return (
//     <Html center>
//       <div className="text-white text-xl">
//         {progress.toFixed(0)}% loaded
//       </div>
//     </Html>
//   )
// }

// // Add the InnerSphere component
// function InnerSphere() {
//   return (
//     <>
//       <Environment preset="sunset" />
//       <PerspectiveCamera makeDefault position={[0, 0, 0]} />
//       <ambientLight intensity={0.2} />
//       <pointLight position={[10, 10, 10]} intensity={0.5} />
      
//       <mesh scale={[-15, -15, -15]}>
//         <sphereGeometry args={[1, 64, 64]} />
//         <meshStandardMaterial
//           side={THREE.BackSide}
//           color="#1a1a1a"
//           metalness={0.9}
//           roughness={0.1}
//           envMapIntensity={1}
//         />
//       </mesh>
//     </>
//   )
// }

// interface ChatProps {
//   isBusinessAccount: boolean;
// }

// const Chat: React.FC<ChatProps> = ({ isBusinessAccount: initialIsBusinessAccount }) => {
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [newMessage, setNewMessage] = useState("");
//   const [currentUser, setCurrentUser] = useState<User | null>(null);
//   const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
//   const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const { userId } = useParams();
//   const navigate = useNavigate();
//   const [isNavOpen, setIsNavOpen] = useState(false);
//   const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
//   const [accessibleFestivals, setAccessibleFestivals] = useState<Set<string>>(new Set());
//   const [searchTerm, setSearchTerm] = useState("");
//   const [isBusinessAccount, setIsBusinessAccount] = useState(initialIsBusinessAccount);
//   const [existingChats, setExistingChats] = useState<ChatUser[]>([]);
//   const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
//   const [followersSearchTerm, setFollowersSearchTerm] = useState("");
//   const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
//   const [isCreatingGroup, setIsCreatingGroup] = useState(false);
//   const [groupName, setGroupName] = useState("");
//   const [selectedParticipants, setSelectedParticipants] = useState<ChatUser[]>([]);
//   const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

//   // Scroll to bottom of messages
//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   };

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   // Set up auth listener
//   useEffect(() => {
//     const unsubscribe = auth.onAuthStateChanged(async (user) => {
//       if (user) {
//         setCurrentUser(user);
//         const userDoc = await getDoc(doc(db, "users", user.uid));
//         if (userDoc.exists()) {
//           const userData = userDoc.data();
//           setUserProfile(userData as UserProfile);
//           if (!!userData.isBusinessAccount !== initialIsBusinessAccount) {
//             setIsBusinessAccount(!!userData.isBusinessAccount);
//           }
//         }
//       } else {
//         navigate("/signin");
//       }
//     });

//     return () => unsubscribe();
//   }, [navigate, initialIsBusinessAccount]);

//   // Modify the fetchExistingChats function
//   useEffect(() => {
//     const fetchExistingChats = async () => {
//       if (!currentUser) return;

//       try {
//         // Get all messages where the current user is a participant
//         const messagesQuery = query(
//           collection(db, "messages"),
//           where("participants", "array-contains", currentUser.uid)
//         );

//         const messagesSnapshot = await getDocs(messagesQuery);
//         const chatUsersMap = new Map<string, { lastMessage: string; timestamp: any }>();
//         const groupChatsMap = new Map<string, { lastMessage: string; timestamp: any }>();

//         // Get unique users and groups from messages
//         messagesSnapshot.forEach((doc) => {
//           const messageData = doc.data();
          
//           if (messageData.groupId) {
//             // Handle group messages
//             if (!groupChatsMap.has(messageData.groupId) || 
//                 messageData.createdAt?.seconds > groupChatsMap.get(messageData.groupId)?.timestamp?.seconds) {
//               groupChatsMap.set(messageData.groupId, {
//                 lastMessage: messageData.text,
//                 timestamp: messageData.createdAt
//               });
//             }
//           } else {
//             // Handle direct messages
//             const otherUserId = messageData.senderId === currentUser.uid 
//               ? messageData.receiverId 
//               : messageData.senderId;

//             if (!chatUsersMap.has(otherUserId) || 
//                 messageData.createdAt?.seconds > chatUsersMap.get(otherUserId)?.timestamp?.seconds) {
//               chatUsersMap.set(otherUserId, {
//                 lastMessage: messageData.text,
//                 timestamp: messageData.createdAt
//               });
//             }
//           }
//         });

//         // Fetch all chats (direct and groups)
//         const allChats: ChatUser[] = [];

//         // Fetch user details for direct chats
//         for (const [userId, messageInfo] of chatUsersMap) {
//           const userDoc = await getDoc(doc(db, "users", userId));
//           const userData = userDoc.data();
//           if (userData) {
//             allChats.push({
//               uid: userId,
//               displayName: userData.displayName || "Anonymous User",
//               email: userData.email,
//               photoURL: userData.photoURL,
//               lastMessage: messageInfo.lastMessage,
//               timestamp: messageInfo.timestamp,
//               isGroup: false
//             });
//           }
//         }

//         // Fetch group details
//         for (const [groupId, messageInfo] of groupChatsMap) {
//           const groupDoc = await getDoc(doc(db, "groups", groupId));
//           const groupData = groupDoc.data();
//           if (groupData) {
//             allChats.push({
//               uid: groupId,
//               displayName: groupData.name,
//               email: `Group: ${groupData.participants.length} participants`,
//               photoURL: groupData.photoURL,
//               lastMessage: messageInfo.lastMessage,
//               timestamp: messageInfo.timestamp,
//               isGroup: true,
//               participants: groupData.participants
//             });
//           }
//         }

//         // Sort all chats by most recent message
//         allChats.sort((a, b) => {
//           if (!a.timestamp || !b.timestamp) return 0;
//           return b.timestamp.seconds - a.timestamp.seconds;
//         });
        
//         console.log("Fetched all chats:", allChats); // Debug log
//         setExistingChats(allChats);
//       } catch (error) {
//         console.error("Error fetching existing chats:", error);
//       }
//     };

//     fetchExistingChats();
//   }, [currentUser]);

//   // Remove the separate search effect and modify the search to filter existing chats
//   const filteredChats = searchTerm
//     ? existingChats.filter(
//         (chat) =>
//           chat.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//           chat.email.toLowerCase().includes(searchTerm.toLowerCase())
//       )
//     : existingChats;

//   // Subscribe to messages
//   useEffect(() => {
//     if (!currentUser || !selectedUser) {
//       console.log("Messages subscription skipped:", {
//         hasCurrentUser: Boolean(currentUser),
//         hasSelectedUser: Boolean(selectedUser)
//       });
//       return;
//     }

//     console.log("Setting up messages subscription for:", {
//       currentUserId: currentUser.uid,
//       selectedUserId: selectedUser.uid,
//       isGroup: selectedUser.isGroup
//     });

//     const q = query(
//       collection(db, "messages"),
//       where("participants", "array-contains", currentUser.uid),
//       orderBy("createdAt", "asc")
//     );

//     const unsubscribe = onSnapshot(q, (snapshot) => {
//       const newMessages: Message[] = [];
//       snapshot.forEach((doc) => {
//         const data = doc.data();
//         if (
//           // Handle group messages
//           (selectedUser.isGroup && data.groupId === selectedUser.uid) ||
//           // Handle direct messages
//           (!selectedUser.isGroup && 
//             ((data.senderId === currentUser.uid && data.receiverId === selectedUser.uid) ||
//             (data.senderId === selectedUser.uid && data.receiverId === currentUser.uid)))
//         ) {
//           newMessages.push({
//             id: doc.id,
//             ...data,
//           } as Message);
//         }
//       });
//       console.log("Received messages:", newMessages.length);
//       setMessages(newMessages);
//     }, (error) => {
//       console.error("Error in messages subscription:", error);
//     });

//     return () => unsubscribe();
//   }, [currentUser, selectedUser]);

//   const handleSendMessage = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!newMessage.trim() || !currentUser || !selectedUser) return;

//     try {
//       const messageData: any = {
//         text: newMessage.trim(),
//         senderId: currentUser.uid,
//         createdAt: serverTimestamp(),
//       };

//       // Handle group messages
//       if (selectedUser.isGroup) {
//         messageData.groupId = selectedUser.uid;
//         // Make sure we have the participants array
//         const groupDoc = await getDoc(doc(db, "groups", selectedUser.uid));
//         const groupData = groupDoc.data();
//         if (!groupData) {
//           throw new Error("Group not found");
//         }
//         messageData.participants = groupData.participants;
//       } else {
//         // Handle direct messages
//         messageData.receiverId = selectedUser.uid;
//         messageData.participants = [currentUser.uid, selectedUser.uid];
//       }

//       await addDoc(collection(db, "messages"), messageData);
//       setNewMessage("");
//     } catch (error) {
//       console.error("Error sending message:", error);
//       alert("Failed to send message. Please try again.");
//     }
//   };

//   const handleUserSelect = (user: ChatUser) => {
//     setSelectedUser(user);
//     navigate(`/chat/${user.uid}`);
//   };

//   const searchFollowers = async (searchTerm: string) => {
//     if (!currentUser || !userProfile) return;

//     const followers = userProfile.followers || [];
//     const following = userProfile.following || [];
//     const connections = [...new Set([...followers, ...following])];

//     try {
//       const users: ChatUser[] = [];
//       for (const userId of connections) {
//         const userDoc = await getDoc(doc(db, "users", userId));
//         const userData = userDoc.data();
//         if (userData && (
//           userData.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//           userData.email?.toLowerCase().includes(searchTerm.toLowerCase())
//         )) {
//           users.push({
//             uid: userId,
//             displayName: userData.displayName || "Anonymous User",
//             email: userData.email,
//             photoURL: userData.photoURL,
//           });
//         }
//       }
//       setSearchResults(users);
//     } catch (error) {
//       console.error("Error searching followers:", error);
//     }
//   };

//   useEffect(() => {
//     const timeoutId = setTimeout(() => {
//       if (followersSearchTerm.trim()) {
//         searchFollowers(followersSearchTerm);
//       } else {
//         setSearchResults([]);
//       }
//     }, 300);

//     return () => clearTimeout(timeoutId);
//   }, [followersSearchTerm, currentUser, userProfile]);

//   const handleCreateGroup = async () => {
//     if (!currentUser || !groupName.trim() || selectedParticipants.length === 0) return;

//     try {
//       // Create new group document
//       const groupRef = await addDoc(collection(db, "groups"), {
//         name: groupName.trim(),
//         participants: [currentUser.uid, ...selectedParticipants.map(p => p.uid)],
//         createdBy: currentUser.uid,
//         createdAt: serverTimestamp(),
//       });

//       // Create initial group message
//       await addDoc(collection(db, "messages"), {
//         text: `${currentUser.displayName} created group "${groupName}"`,
//         senderId: currentUser.uid,
//         groupId: groupRef.id,
//         participants: [currentUser.uid, ...selectedParticipants.map(p => p.uid)],
//         createdAt: serverTimestamp(),
//         isGroupMessage: true
//       });

//       // Create ChatUser object for the group
//       const groupChat: ChatUser = {
//         uid: groupRef.id,
//         displayName: groupName,
//         email: `Group: ${selectedParticipants.length + 1} participants`,
//         isGroup: true,
//         timestamp: serverTimestamp()
//       };

//       handleUserSelect(groupChat);
//       setIsSearchModalOpen(false);
//       setIsCreatingGroup(false);
//       setGroupName("");
//       setSelectedParticipants([]);
//       setFollowersSearchTerm("");
//       setSearchResults([]);
//     } catch (error) {
//       console.error("Error creating group:", error);
//       alert("Failed to create group. Please try again.");
//     }
//   };

//   if (!currentUser) return null;

//   return (
//     <div className="relative min-h-screen w-full overflow-hidden">
//       {/* Three.js Background */}
//       <div className="absolute inset-0">
//         <Canvas
//           className="w-full h-full"
//           gl={{ antialias: true, alpha: true }}
//         >
//           <Suspense fallback={<Loader />}>
//             <InnerSphere />
//           </Suspense>
//         </Canvas>
//       </div>

//       {/* Main Content */}
//       <div className="relative z-10 min-h-screen">
//         {/* Navigation - Updated for mobile consistency */}
//         <div className="md:hidden flex justify-between items-center p-4 sticky top-0 z-50 bg-black/20 backdrop-blur-sm">
//           <button
//             onClick={() => setIsNavOpen(!isNavOpen)}
//             className="text-white hover:text-white/80 transition-colors duration-300"
//           >
//             <Menu size={28} />
//           </button>
          
//           {/* Add Sonder text - only visible on mobile */}
//           <h1 className="text-2xl font-bold text-white hover:text-white/80 transition-colors duration-300">
//             SONDER
//           </h1>
//         </div>

//         {/* Keep existing Sidebar components with updated styling */}
//         {isBusinessAccount ? (
//           <BusinessSidebar
//             isNavOpen={isNavOpen}
//             setIsNavOpen={setIsNavOpen}
//             user={currentUser}
//             userProfile={userProfile}
//           />
//         ) : (
//           <Sidebar
//             isNavOpen={isNavOpen}
//             setIsNavOpen={setIsNavOpen}
//             user={currentUser}
//             userProfile={userProfile}
//           />
//         )}

//         {/* Chat Layout */}
//         <div className="flex justify-center w-full">
//           <div className="flex flex-col md:flex-row justify-center gap-4 overflow-hidden px-4 pb-4 h-[calc(100vh-12rem)] 
//                         max-w-7xl mx-auto w-full md:pt-20">
//             {/* Users sidebar */}
//             <div className={`w-full md:w-80 h-full ${selectedUser ? 'hidden md:block' : 'block'}`}>
//               <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] 
//                             border border-white/20 p-6 h-full flex flex-col">
//                 <div className="flex justify-between items-center mb-6">
//                   <h2 className="text-2xl font-['Space_Grotesk'] tracking-[0.1em] text-white/90">Chats</h2>
//                   <button
//                     onClick={() => setIsSearchModalOpen(true)}
//                     className="p-2 text-white/90 hover:text-white rounded-full 
//                              hover:bg-white/10 transition-all duration-300"
//                     aria-label="New chat"
//                   >
//                     <Plus size={20} />
//                   </button>
//                 </div>

//                 {/* Search input */}
//                 <div className="mb-6">
//                   <input
//                     type="text"
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     placeholder="Search chats..."
//                     className="w-full p-3 rounded-lg bg-white/10 border border-white/20 
//                              text-white placeholder-white/50 font-['Space_Grotesk']
//                              focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
//                   />
//                 </div>

//                 {/* Chats list */}
//                 <div className="flex-1 overflow-y-auto hide-scrollbar">
//                   <div className="space-y-3">
//                     {filteredChats.map((chat) => (
//                       <div
//                         key={chat.uid}
//                         onClick={() => handleUserSelect(chat)}
//                         className={`flex items-center p-4 cursor-pointer rounded-xl 
//                                   transition-all duration-300 transform hover:scale-[1.02]
//                                   ${selectedUser?.uid === chat.uid
//                                     ? "bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
//                                     : "hover:bg-white/10"}`}
//                       >
//                         <ChatAvatar user={chat} />
//                         <div className="flex-1 min-w-0">
//                           <div className="font-['Space_Grotesk'] text-white/90">{chat.displayName}</div>
//                           <div className="text-sm text-white/60 truncate">
//                             {chat.isGroup ? `Group: ${chat.email}` : chat.email}
//                           </div>
//                           {chat.lastMessage && (
//                             <div className="text-sm text-white/60 truncate">
//                               {chat.lastMessage}
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Chat area */}
//             <div className={`flex-1 h-full max-w-3xl ${selectedUser ? 'block mt-8 md:mt-0' : 'hidden md:block'}`}>
//               <div className="backdrop-blur-xl bg-black/40 md:bg-white/10 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.1)] 
//                             border border-white/20 flex flex-col h-full">
//                 {selectedUser ? (
//                   <>
//                     {/* Chat header */}
//                     <div className="p-4 md:p-6 border-b border-white/20">
//                       <div className="flex items-center">
//                         <button
//                           onClick={() => setSelectedUser(null)}
//                           className="mr-2 p-2 text-white/90 hover:text-white 
//                                    hover:bg-white/10 rounded-full transition-colors md:hidden"
//                         >
//                           <X size={20} />
//                         </button>
//                         <ChatAvatar user={selectedUser} />
//                         <div>
//                           <div className="font-['Space_Grotesk'] text-white/90">
//                             {selectedUser.displayName}
//                           </div>
//                           <div className="text-sm text-white/60">{selectedUser.email}</div>
//                         </div>
//                       </div>
//                     </div>

//                     {/* Messages area */}
//                     <div className="flex-1 overflow-y-auto hide-scrollbar p-4 md:p-6 space-y-4">
//                       {messages.map((message) => (
//                         <div
//                           key={message.id}
//                           className={`flex ${
//                             message.senderId === currentUser?.uid ? "justify-end" : "justify-start"
//                           } mb-4`}
//                         >
//                           <div
//                             className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 
//                                       ${message.senderId === currentUser?.uid
//                                         ? "bg-black/40 md:bg-white/10 backdrop-blur-sm border border-white/20 text-white"
//                                         : "bg-black/40 md:bg-white/10 backdrop-blur-sm border border-white/20 text-white"}`}
//                           >
//                             {message.type === "shared_post" ? (
//                               <div className="cursor-pointer">
//                                 <div 
//                                   onClick={() => setSelectedPostId(message.postId)}
//                                   className="hover:opacity-90 transition-opacity"
//                                 >
//                                   <div className="flex items-center gap-2 mb-1">
//                                     <Share size={16} className="text-white" />
//                                     <span className="font-['Space_Grotesk'] tracking-wider text-white">Shared a post</span>
//                                   </div>
//                                   <span className="text-sm underline font-['Space_Grotesk'] text-white">Click to view post</span>
//                                 </div>
//                               </div>
//                             ) : (
//                               <p className="font-['Space_Grotesk'] tracking-wider text-white">{message.text}</p>
//                             )}
//                             <p className="text-xs mt-1 text-white/70 font-['Space_Grotesk']">
//                               {message.timestamp?.toDate().toLocaleTimeString()}
//                             </p>
//                           </div>
//                         </div>
//                       ))}
//                       <div ref={messagesEndRef} />
//                     </div>

//                     {/* Message input */}
//                     <div className="p-4 md:p-6 border-t border-white/20">
//                       <form onSubmit={handleSendMessage} className="flex gap-3">
//                         <input
//                           type="text"
//                           value={newMessage}
//                           onChange={(e) => setNewMessage(e.target.value)}
//                           placeholder="Type a message..."
//                           className="flex-1 p-3 rounded-lg bg-white/10 border border-white/20 
//                                    text-white placeholder-white/50 font-['Space_Grotesk']
//                                    focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
//                         />
//                         <button
//                           type="submit"
//                           disabled={!newMessage.trim()}
//                           className="relative px-8 py-3 border-2 border-white/30 rounded-full
//                                     text-white font-['Space_Grotesk'] tracking-[0.2em]
//                                     transition-all duration-300 
//                                     hover:border-white/60 hover:scale-105
//                                     hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]
//                                     active:scale-95
//                                     disabled:opacity-50 disabled:hover:scale-100 
//                                     disabled:hover:border-white/30 disabled:hover:bg-transparent
//                                     disabled:hover:shadow-none"
//                         >
//                           SEND
//                         </button>
//                       </form>
//                     </div>
//                   </>
//                 ) : (
//                   <div className="flex-1 flex items-center justify-center text-white/60 
//                                  font-['Space_Grotesk'] tracking-wider">
//                     Select a chat to start messaging
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Search/Create Chat Modal */}
//       {isSearchModalOpen && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white/10 backdrop-blur-xl rounded-2xl w-full md:w-[480px] max-h-[90vh] 
//                          flex flex-col shadow-[0_0_30px_rgba(255,255,255,0.1)] border border-white/20">
//             {/* Modal Header */}
//             <div className="p-6 border-b border-white/20 flex justify-between items-center">
//               <h3 className="text-2xl font-['Space_Grotesk'] tracking-[0.1em] text-white/90">
//                 {isCreatingGroup ? "Create Group" : "New Chat"}
//               </h3>
//               <div className="flex items-center gap-4">
//                 {!isCreatingGroup && (
//                   <button
//                     onClick={() => setIsCreatingGroup(true)}
//                     className="text-white/80 hover:text-white font-['Space_Grotesk'] tracking-wider 
//                              transition-colors"
//                   >
//                     Create Group
//                   </button>
//                 )}
//                 <button
//                   onClick={() => {
//                     setIsSearchModalOpen(false);
//                     setIsCreatingGroup(false);
//                     setGroupName("");
//                     setSelectedParticipants([]);
//                     setFollowersSearchTerm("");
//                     setSearchResults([]);
//                   }}
//                   className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full 
//                            transition-all duration-300"
//                 >
//                   <X size={20} />
//                 </button>
//               </div>
//             </div>

//             {/* Group Creation Input */}
//             {isCreatingGroup && (
//               <div className="p-6 border-b border-white/20">
//                 <input
//                   type="text"
//                   value={groupName}
//                   onChange={(e) => setGroupName(e.target.value)}
//                   placeholder="Group name..."
//                   className="w-full p-3 rounded-lg bg-white/10 border border-white/20 
//                            text-white placeholder-white/50 font-['Space_Grotesk']
//                            focus:outline-none focus:ring-2 focus:ring-white/30 transition-all mb-4"
//                 />
//                 <div className="flex flex-wrap gap-2">
//                   {selectedParticipants.map((participant) => (
//                     <div
//                       key={participant.uid}
//                       className="bg-white/10 backdrop-blur-sm border border-white/20 
//                                text-white/90 px-4 py-2 rounded-full text-sm 
//                                flex items-center gap-2 font-['Space_Grotesk']"
//                     >
//                       {participant.displayName}
//                       <button
//                         onClick={() => setSelectedParticipants(prev => 
//                           prev.filter(p => p.uid !== participant.uid)
//                         )}
//                         className="hover:text-white transition-colors"
//                       >
//                         <X size={14} />
//                       </button>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             )}
            
//             {/* Search Input */}
//             <div className="p-6 border-b border-white/20">
//               <div className="relative">
//                 <input
//                   type="text"
//                   value={followersSearchTerm}
//                   onChange={(e) => setFollowersSearchTerm(e.target.value)}
//                   placeholder={isCreatingGroup ? "Add participants..." : "Search people you follow..."}
//                   className="w-full p-3 pl-12 rounded-lg bg-white/10 border border-white/20 
//                            text-white placeholder-white/50 font-['Space_Grotesk']
//                            focus:outline-none focus:ring-2 focus:ring-white/30 transition-all"
//                 />
//                 <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/50" />
//               </div>
//             </div>

//             {/* Search Results */}
//             <div className="overflow-y-auto flex-1 p-6">
//               {searchResults.length > 0 ? (
//                 <div className="space-y-3">
//                   {searchResults.map((user) => (
//                     <div
//                       key={user.uid}
//                       onClick={() => {
//                         if (isCreatingGroup) {
//                           if (!selectedParticipants.find(p => p.uid === user.uid)) {
//                             setSelectedParticipants(prev => [...prev, user]);
//                           }
//                         } else {
//                           handleUserSelect(user);
//                           setIsSearchModalOpen(false);
//                           setFollowersSearchTerm("");
//                           setSearchResults([]);
//                         }
//                       }}
//                       className="flex items-center p-4 cursor-pointer rounded-xl 
//                                transition-all duration-300 transform hover:scale-[1.02]
//                                hover:bg-white/10"
//                     >
//                       <ChatAvatar user={user} />
//                       <div>
//                         <div className="font-['Space_Grotesk'] text-white/90">{user.displayName}</div>
//                         <div className="text-sm text-white/60">{user.email}</div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               ) : (
//                 <div className="text-center text-white/60 py-8 font-['Space_Grotesk'] tracking-wider">
//                   {followersSearchTerm ? "No users found" : "Type to search users"}
//                 </div>
//               )}
//             </div>

//             {/* Create Group Button */}
//             {isCreatingGroup && selectedParticipants.length > 0 && (
//               <div className="p-6 border-t border-white/20">
//                 <button
//                   onClick={handleCreateGroup}
//                   disabled={!groupName.trim()}
//                   className="w-full relative px-8 py-3 border-2 border-white/30 rounded-full
//                            text-white font-['Space_Grotesk'] tracking-[0.2em]
//                            transition-all duration-300 
//                            hover:border-white/60 hover:scale-105
//                            hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]
//                            active:scale-95
//                            disabled:opacity-50 disabled:hover:scale-100 
//                            disabled:hover:border-white/30 disabled:hover:bg-transparent
//                            disabled:hover:shadow-none"
//                 >
//                   CREATE GROUP ({selectedParticipants.length + 1} PARTICIPANTS)
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Chat; 