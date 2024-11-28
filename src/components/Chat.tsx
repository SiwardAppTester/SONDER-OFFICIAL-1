import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  getDocs,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { User } from "firebase/auth";
import { Menu, Plus, Search, X } from "lucide-react";
import Sidebar from "./Sidebar";
import BusinessSidebar from "./BusinessSidebar";

interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  createdAt: any;
}

interface ChatUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  lastMessage?: string;
  timestamp?: any;
  isGroup?: boolean;
}

interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
}

// Add new interface for chat history
interface ChatHistory {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  lastMessage: string;
  timestamp: any;
}

// Add new interfaces at the top
interface GroupChat {
  id: string;
  name: string;
  photoURL?: string;
  participants: string[];
  createdBy: string;
  createdAt: any;
  lastMessage?: string;
  timestamp?: any;
}

// Update the ChatAvatar component
const ChatAvatar: React.FC<{ user: ChatUser }> = ({ user }) => {
  return user.photoURL ? (
    <img
      src={user.photoURL}
      alt={user.displayName}
      className="w-12 h-12 rounded-full mr-3 object-cover"
    />
  ) : (
    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mr-3 text-gray-600 font-medium">
      {user.isGroup ? (
        <div className="text-xl">G</div>
      ) : (
        <div className="text-xl">{user.displayName[0]}</div>
      )}
    </div>
  );
};

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { userId } = useParams();
  const navigate = useNavigate();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [accessibleFestivals, setAccessibleFestivals] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [isBusinessAccount, setIsBusinessAccount] = useState(false);
  const [existingChats, setExistingChats] = useState<ChatUser[]>([]);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [followersSearchTerm, setFollowersSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<ChatUser[]>([]);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Set up auth listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserProfile(userData as UserProfile);
          setIsBusinessAccount(!!userData.isBusinessAccount);
        }
      } else {
        navigate("/signin");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Modify the fetchExistingChats function
  useEffect(() => {
    const fetchExistingChats = async () => {
      if (!currentUser) return;

      try {
        // Get all messages where the current user is a participant
        const messagesQuery = query(
          collection(db, "messages"),
          where("participants", "array-contains", currentUser.uid)
        );

        const messagesSnapshot = await getDocs(messagesQuery);
        const chatUsersMap = new Map<string, { lastMessage: string; timestamp: any }>();
        const groupChatsMap = new Map<string, { lastMessage: string; timestamp: any }>();

        // Get unique users and groups from messages
        messagesSnapshot.forEach((doc) => {
          const messageData = doc.data();
          
          if (messageData.groupId) {
            // Handle group messages
            if (!groupChatsMap.has(messageData.groupId) || 
                messageData.createdAt?.seconds > groupChatsMap.get(messageData.groupId)?.timestamp?.seconds) {
              groupChatsMap.set(messageData.groupId, {
                lastMessage: messageData.text,
                timestamp: messageData.createdAt
              });
            }
          } else {
            // Handle direct messages
            const otherUserId = messageData.senderId === currentUser.uid 
              ? messageData.receiverId 
              : messageData.senderId;

            if (!chatUsersMap.has(otherUserId) || 
                messageData.createdAt?.seconds > chatUsersMap.get(otherUserId)?.timestamp?.seconds) {
              chatUsersMap.set(otherUserId, {
                lastMessage: messageData.text,
                timestamp: messageData.createdAt
              });
            }
          }
        });

        // Fetch all chats (direct and groups)
        const allChats: ChatUser[] = [];

        // Fetch user details for direct chats
        for (const [userId, messageInfo] of chatUsersMap) {
          const userDoc = await getDoc(doc(db, "users", userId));
          const userData = userDoc.data();
          if (userData) {
            allChats.push({
              uid: userId,
              displayName: userData.displayName || "Anonymous User",
              email: userData.email,
              photoURL: userData.photoURL,
              lastMessage: messageInfo.lastMessage,
              timestamp: messageInfo.timestamp,
              isGroup: false
            });
          }
        }

        // Fetch group details
        for (const [groupId, messageInfo] of groupChatsMap) {
          const groupDoc = await getDoc(doc(db, "groups", groupId));
          const groupData = groupDoc.data();
          if (groupData) {
            allChats.push({
              uid: groupId,
              displayName: groupData.name,
              email: `Group: ${groupData.participants.length} participants`,
              photoURL: groupData.photoURL,
              lastMessage: messageInfo.lastMessage,
              timestamp: messageInfo.timestamp,
              isGroup: true,
              participants: groupData.participants
            });
          }
        }

        // Sort all chats by most recent message
        allChats.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          return b.timestamp.seconds - a.timestamp.seconds;
        });
        
        console.log("Fetched all chats:", allChats); // Debug log
        setExistingChats(allChats);
      } catch (error) {
        console.error("Error fetching existing chats:", error);
      }
    };

    fetchExistingChats();
  }, [currentUser]);

  // Remove the separate search effect and modify the search to filter existing chats
  const filteredChats = searchTerm
    ? existingChats.filter(
        (chat) =>
          chat.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          chat.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : existingChats;

  // Subscribe to messages
  useEffect(() => {
    if (!currentUser || !selectedUser) {
      console.log("Messages subscription skipped:", {
        hasCurrentUser: Boolean(currentUser),
        hasSelectedUser: Boolean(selectedUser)
      });
      return;
    }

    console.log("Setting up messages subscription for:", {
      currentUserId: currentUser.uid,
      selectedUserId: selectedUser.uid,
      isGroup: selectedUser.isGroup
    });

    const q = query(
      collection(db, "messages"),
      where("participants", "array-contains", currentUser.uid),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (
          // Handle group messages
          (selectedUser.isGroup && data.groupId === selectedUser.uid) ||
          // Handle direct messages
          (!selectedUser.isGroup && 
            ((data.senderId === currentUser.uid && data.receiverId === selectedUser.uid) ||
            (data.senderId === selectedUser.uid && data.receiverId === currentUser.uid)))
        ) {
          newMessages.push({
            id: doc.id,
            ...data,
          } as Message);
        }
      });
      console.log("Received messages:", newMessages.length);
      setMessages(newMessages);
    }, (error) => {
      console.error("Error in messages subscription:", error);
    });

    return () => unsubscribe();
  }, [currentUser, selectedUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !selectedUser) return;

    try {
      const messageData: any = {
        text: newMessage.trim(),
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
      };

      // Handle group messages
      if (selectedUser.isGroup) {
        messageData.groupId = selectedUser.uid;
        // Make sure we have the participants array
        const groupDoc = await getDoc(doc(db, "groups", selectedUser.uid));
        const groupData = groupDoc.data();
        if (!groupData) {
          throw new Error("Group not found");
        }
        messageData.participants = groupData.participants;
      } else {
        // Handle direct messages
        messageData.receiverId = selectedUser.uid;
        messageData.participants = [currentUser.uid, selectedUser.uid];
      }

      await addDoc(collection(db, "messages"), messageData);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const handleUserSelect = (user: ChatUser) => {
    setSelectedUser(user);
    navigate(`/chat/${user.uid}`);
  };

  const searchFollowers = async (searchTerm: string) => {
    if (!currentUser || !userProfile) return;

    const followers = userProfile.followers || [];
    const following = userProfile.following || [];
    const connections = [...new Set([...followers, ...following])];

    try {
      const users: ChatUser[] = [];
      for (const userId of connections) {
        const userDoc = await getDoc(doc(db, "users", userId));
        const userData = userDoc.data();
        if (userData && (
          userData.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          userData.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )) {
          users.push({
            uid: userId,
            displayName: userData.displayName || "Anonymous User",
            email: userData.email,
            photoURL: userData.photoURL,
          });
        }
      }
      setSearchResults(users);
    } catch (error) {
      console.error("Error searching followers:", error);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (followersSearchTerm.trim()) {
        searchFollowers(followersSearchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [followersSearchTerm, currentUser, userProfile]);

  const handleCreateGroup = async () => {
    if (!currentUser || !groupName.trim() || selectedParticipants.length === 0) return;

    try {
      // Create new group document
      const groupRef = await addDoc(collection(db, "groups"), {
        name: groupName.trim(),
        participants: [currentUser.uid, ...selectedParticipants.map(p => p.uid)],
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      // Create initial group message
      await addDoc(collection(db, "messages"), {
        text: `${currentUser.displayName} created group "${groupName}"`,
        senderId: currentUser.uid,
        groupId: groupRef.id,
        participants: [currentUser.uid, ...selectedParticipants.map(p => p.uid)],
        createdAt: serverTimestamp(),
        isGroupMessage: true
      });

      // Create ChatUser object for the group
      const groupChat: ChatUser = {
        uid: groupRef.id,
        displayName: groupName,
        email: `Group: ${selectedParticipants.length + 1} participants`,
        isGroup: true,
        timestamp: serverTimestamp()
      };

      handleUserSelect(groupChat);
      setIsSearchModalOpen(false);
      setIsCreatingGroup(false);
      setGroupName("");
      setSelectedParticipants([]);
      setFollowersSearchTerm("");
      setSearchResults([]);
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group. Please try again.");
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-rose-100 pb-4">
      {/* Navigation */}
      <div className="flex justify-between items-center p-4">
        <button
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="text-purple-600 hover:text-purple-700 transition-colors duration-300"
          aria-label="Toggle navigation menu"
        >
          <Menu size={28} />
        </button>
      </div>

      {/* Keep existing Sidebar components */}
      {isBusinessAccount ? (
        <BusinessSidebar
          isNavOpen={isNavOpen}
          setIsNavOpen={setIsNavOpen}
          user={currentUser}
          userProfile={userProfile}
          accessibleFestivalsCount={accessibleFestivals.size}
        />
      ) : (
        <Sidebar
          isNavOpen={isNavOpen}
          setIsNavOpen={setIsNavOpen}
          user={currentUser}
          userProfile={userProfile}
          accessibleFestivalsCount={accessibleFestivals.size}
        />
      )}

      {/* Update the main content area */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden px-4 pb-4 h-[calc(100vh-8rem)] space-y-4 md:space-y-0">
        {/* Users sidebar - updated for mobile */}
        <div className={`w-full md:w-1/4 md:mr-4 h-full ${selectedUser ? 'hidden md:block' : 'block'}`}>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 h-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Chats</h2>
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-all duration-300 transform hover:scale-105"
                aria-label="New chat"
              >
                <Plus size={20} />
              </button>
            </div>

            {/* Search input - keep existing styling */}
            <div className="mb-6">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search chats..."
                className="w-full p-3 border rounded-lg focus:outline-none focus:border-purple-500 bg-white/50"
              />
            </div>

            {/* Chats list - keep existing styling */}
            <div className="space-y-3">
              {filteredChats.length > 0 ? (
                filteredChats.map((chat) => (
                  <div
                    key={chat.uid}
                    onClick={() => handleUserSelect(chat)}
                    className={`flex items-center p-4 cursor-pointer rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${
                      selectedUser?.uid === chat.uid
                        ? "bg-purple-100 shadow-md"
                        : "hover:bg-white/50"
                    }`}
                  >
                    <ChatAvatar user={chat} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{chat.displayName}</div>
                      <div className="text-sm text-gray-500 truncate">
                        {chat.isGroup ? `Group: ${chat.email}` : chat.email}
                      </div>
                      {chat.lastMessage && (
                        <div className="text-sm text-gray-500 truncate">
                          {chat.lastMessage}
                        </div>
                      )}
                    </div>
                    {chat.timestamp && (
                      <div className="text-xs text-gray-400 ml-2">
                        {new Date(chat.timestamp.seconds * 1000).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  {searchTerm ? "No matching chats found" : "No chats yet"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat area - updated for mobile */}
        <div className={`flex-1 h-full ${selectedUser ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg flex flex-col h-full">
            {selectedUser ? (
              <>
                {/* Chat header - updated for mobile */}
                <div className="p-4 md:p-6 border-b border-gray-100">
                  <div className="flex items-center">
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="mr-2 p-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors md:hidden"
                    >
                      <X size={20} />
                    </button>
                    <ChatAvatar user={selectedUser} />
                    <div>
                      <div className="font-bold text-gray-900">{selectedUser.displayName}</div>
                      <div className="text-sm text-gray-500">{selectedUser.email}</div>
                    </div>
                  </div>
                </div>

                {/* Messages area - keep existing code but update padding for mobile */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderId === currentUser?.uid ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-6 py-3 shadow-sm ${
                          message.senderId === currentUser?.uid
                            ? "bg-purple-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p>{message.text}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {message.createdAt?.toDate().toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message input - update padding for mobile */}
                <div className="p-4 md:p-6 border-t border-gray-100">
                  <form onSubmit={handleSendMessage} className="flex gap-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 p-3 border rounded-full focus:outline-none focus:border-purple-500 bg-white/50"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="bg-purple-600 text-white px-6 md:px-8 py-3 rounded-full hover:bg-purple-700 
                               transition-all duration-300 transform hover:scale-105 disabled:opacity-50
                               disabled:hover:scale-100 disabled:hover:bg-purple-600"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a chat to start messaging
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Keep existing search modal code but update for mobile */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl w-full md:w-[480px] max-h-[90vh] flex flex-col shadow-xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900">
                {isCreatingGroup ? "Create Group" : "New Chat"}
              </h3>
              <div className="flex items-center gap-4">
                {!isCreatingGroup && (
                  <button
                    onClick={() => setIsCreatingGroup(true)}
                    className="text-purple-600 hover:text-purple-700 font-semibold transition-colors"
                  >
                    Create Group
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsSearchModalOpen(false);
                    setIsCreatingGroup(false);
                    setGroupName("");
                    setSelectedParticipants([]);
                    setFollowersSearchTerm("");
                    setSearchResults([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-all duration-300 transform hover:scale-105"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Group Creation Input */}
            {isCreatingGroup && (
              <div className="p-6 border-b border-gray-100">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name..."
                  className="w-full p-3 border rounded-lg focus:outline-none focus:border-purple-500 bg-white/50 mb-4"
                />
                <div className="flex flex-wrap gap-2">
                  {selectedParticipants.map((participant) => (
                    <div
                      key={participant.uid}
                      className="bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm flex items-center gap-2"
                    >
                      {participant.displayName}
                      <button
                        onClick={() => setSelectedParticipants(prev => 
                          prev.filter(p => p.uid !== participant.uid)
                        )}
                        className="hover:text-purple-900 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Search Input */}
            <div className="p-6 border-b border-gray-100">
              <div className="relative">
                <input
                  type="text"
                  value={followersSearchTerm}
                  onChange={(e) => setFollowersSearchTerm(e.target.value)}
                  placeholder={isCreatingGroup ? "Add participants..." : "Search people you follow..."}
                  className="w-full p-3 pl-12 border rounded-lg focus:outline-none focus:border-purple-500 bg-white/50"
                />
                <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* Search Results */}
            <div className="overflow-y-auto flex-1 p-6">
              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((user) => (
                    <div
                      key={user.uid}
                      onClick={() => {
                        if (isCreatingGroup) {
                          if (!selectedParticipants.find(p => p.uid === user.uid)) {
                            setSelectedParticipants(prev => [...prev, user]);
                          }
                        } else {
                          handleUserSelect(user);
                          setIsSearchModalOpen(false);
                          setFollowersSearchTerm("");
                          setSearchResults([]);
                        }
                      }}
                      className="flex items-center p-4 cursor-pointer rounded-xl transition-all duration-300 
                               transform hover:scale-[1.02] hover:bg-white/50"
                    >
                      <ChatAvatar user={user} />
                      <div>
                        <div className="font-semibold text-gray-900">{user.displayName}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {followersSearchTerm ? "No users found" : "Type to search users"}
                </div>
              )}
            </div>

            {/* Create Group Button */}
            {isCreatingGroup && selectedParticipants.length > 0 && (
              <div className="p-6 border-t border-gray-100">
                <button
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim()}
                  className="w-full bg-purple-600 text-white px-8 py-3 rounded-full hover:bg-purple-700 
                           transition-all duration-300 transform hover:scale-105 disabled:opacity-50
                           disabled:hover:scale-100 disabled:hover:bg-purple-600 shadow-lg
                           shadow-purple-200"
                >
                  Create Group ({selectedParticipants.length + 1} participants)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat; 