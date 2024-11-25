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
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";

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
}

interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  followers?: string[];
  following?: string[];
}

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
          setUserProfile(userDoc.data() as UserProfile);
        }
      } else {
        navigate("/signin");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Add accessible festivals effect
  useEffect(() => {
    const savedFestivals = localStorage.getItem('accessibleFestivals');
    if (savedFestivals) {
      setAccessibleFestivals(new Set(JSON.parse(savedFestivals)));
    }
  }, []);

  // Fetch chat users (followers/following)
  useEffect(() => {
    const fetchChatUsers = async () => {
      if (!currentUser) return;

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userData = userDoc.data();
      
      if (!userData?.followers && !userData?.following) return;

      const userIds = new Set([...(userData.followers || []), ...(userData.following || [])]);
      const users: ChatUser[] = [];

      for (const uid of userIds) {
        const userDoc = await getDoc(doc(db, "users", uid));
        const userData = userDoc.data();
        if (userData) {
          users.push({
            uid,
            displayName: userData.displayName || "Anonymous User",
            email: userData.email,
            photoURL: userData.photoURL,
          });
        }
      }

      setChatUsers(users);

      // If userId is provided in URL, select that user
      if (userId) {
        const selectedUser = users.find(user => user.uid === userId);
        if (selectedUser) {
          setSelectedUser(selectedUser);
        }
      }
    };

    fetchChatUsers();
  }, [currentUser, userId]);

  // Subscribe to messages
  useEffect(() => {
    if (!currentUser || !selectedUser) return;

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
          (data.senderId === currentUser.uid && data.receiverId === selectedUser.uid) ||
          (data.senderId === selectedUser.uid && data.receiverId === currentUser.uid)
        ) {
          newMessages.push({
            id: doc.id,
            ...data,
          } as Message);
        }
      });
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [currentUser, selectedUser]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !selectedUser) return;

    try {
      await addDoc(collection(db, "messages"), {
        text: newMessage.trim(),
        senderId: currentUser.uid,
        receiverId: selectedUser.uid,
        participants: [currentUser.uid, selectedUser.uid],
        createdAt: serverTimestamp(),
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleUserSelect = (user: ChatUser) => {
    setSelectedUser(user);
    navigate(`/chat/${user.uid}`);
  };

  if (!currentUser) return null;

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsNavOpen(!isNavOpen)}
            className="text-gray-700 hover:text-gray-900"
            aria-label="Toggle navigation menu"
          >
            <Menu size={24} />
          </button>
          <h2 className="text-2xl font-bold">Messages</h2>
        </div>
      </div>

      <Sidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={currentUser}
        userProfile={userProfile}
        accessibleFestivalsCount={accessibleFestivals.size}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Users sidebar */}
        <div className="w-1/4 bg-gray-50 border-r overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">Chats</h2>
            {chatUsers.map((user) => (
              <div
                key={user.uid}
                onClick={() => handleUserSelect(user)}
                className={`flex items-center p-3 cursor-pointer rounded-lg mb-2 ${
                  selectedUser?.uid === user.uid ? "bg-blue-50" : "hover:bg-gray-100"
                }`}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                    {user.displayName[0]}
                  </div>
                )}
                <div>
                  <div className="font-medium">{user.displayName}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {selectedUser ? (
            <>
              {/* Chat header */}
              <div className="p-4 border-b bg-white">
                <div className="flex items-center">
                  {selectedUser.photoURL ? (
                    <img
                      src={selectedUser.photoURL}
                      alt={selectedUser.displayName}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                      {selectedUser.displayName[0]}
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{selectedUser.displayName}</div>
                    <div className="text-sm text-gray-500">{selectedUser.email}</div>
                  </div>
                </div>
              </div>

              {/* Messages - adjust padding bottom to account for BottomTabBar */}
              <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderId === currentUser.uid ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        message.senderId === currentUser.uid
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100"
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

              {/* Message input - adjust position to be above BottomTabBar */}
              <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 p-2 border rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg disabled:bg-gray-300"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a user to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat; 