import React, { useState, useEffect } from "react";
import { collection, query, getDocs, where, doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db, auth } from "../firebase";
import { useNavigate } from "react-router-dom";

interface User {
  uid: string;
  email: string;
  displayName: string;
  createdAt: any;
  isBusinessAccount?: boolean;
}

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'users' | 'business'>('users');
  const [businessUsers, setBusinessUsers] = useState<User[]>([]);

  // Business account creation form state
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createAccountError, setCreateAccountError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchBusinessUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      
      const usersList: User[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.email && 
            userData.email.toLowerCase() !== "admin@sonder.com" && 
            !userData.isBusinessAccount) {
          usersList.push({
            uid: doc.id,
            email: userData.email,
            displayName: userData.displayName || 'Anonymous User',
            createdAt: userData.createdAt,
            isBusinessAccount: userData.isBusinessAccount || false
          });
        }
      });
      
      setUsers(usersList);
      console.log("Fetched users:", usersList);
    } catch (err) {
      setError("Failed to fetch users");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessUsers = async () => {
    try {
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      
      const businessList: User[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.email && userData.isBusinessAccount) {
          businessList.push({
            uid: doc.id,
            email: userData.email,
            displayName: userData.displayName || 'Anonymous Business',
            createdAt: userData.createdAt,
            isBusinessAccount: true
          });
        }
      });
      
      setBusinessUsers(businessList);
    } catch (err) {
      console.error("Error fetching business users:", err);
    }
  };

  const handleCreateBusinessAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAccountError(null);

    if (!companyName.trim() || !email.trim() || !password.trim()) {
      setCreateAccountError("All fields are required");
      return;
    }

    try {
      // Create authentication account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { user } = userCredential;

      // Create user document
      await setDoc(doc(db, "users", user.uid), {
        email: email.toLowerCase(),
        displayName: companyName,
        isBusinessAccount: true,
        createdAt: new Date(),
      });

      // Fetch updated business users list
      await fetchBusinessUsers();

      // Reset form
      setCompanyName("");
      setEmail("");
      setPassword("");

      // Show success message
      alert("Business account created successfully!");
    } catch (err) {
      console.error("Error creating business account:", err);
      setCreateAccountError("Failed to create business account. Please try again.");
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

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-rose-100">
      {/* Header Section - Adjusted for mobile */}
      <div className="max-w-6xl mx-auto px-4 pt-4 md:pt-8 pb-2 md:pb-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-lg p-4 md:p-8 
                       border border-gray-100 relative overflow-hidden mb-4 md:mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 to-rose-50/50"></div>
          <div className="relative flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <button
              onClick={handleSignOut}
              className="w-full md:w-auto bg-red-500 text-white px-6 py-2.5 md:py-3 rounded-full hover:bg-red-600 
                       transition-all duration-300 transform hover:scale-105
                       shadow-lg hover:shadow-xl text-sm md:text-base"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Toggle Buttons - Made scrollable on mobile */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-md p-4 md:p-6 mb-4 md:mb-8">
          <div className="flex gap-2 md:gap-4 overflow-x-auto hide-scrollbar pb-2 md:pb-0">
            <button
              onClick={() => setActiveSection('users')}
              className={`px-4 md:px-8 py-2.5 md:py-3 rounded-full transition-all transform hover:scale-105 whitespace-nowrap flex-shrink-0 text-sm md:text-base ${
                activeSection === 'users'
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                  : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              Regular Users
            </button>
            <button
              onClick={() => setActiveSection('business')}
              className={`px-4 md:px-8 py-2.5 md:py-3 rounded-full transition-all transform hover:scale-105 whitespace-nowrap flex-shrink-0 text-sm md:text-base ${
                activeSection === 'business'
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-200"
                  : "bg-gray-50 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              Business Accounts
            </button>
          </div>
        </div>

        {/* Main Content */}
        {activeSection === 'business' ? (
          <div className="space-y-4 md:space-y-8">
            {/* Create Business Account Form */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-lg p-4 md:p-8 
                          border border-gray-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 to-rose-50/50"></div>
              <div className="relative">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Create Business Account</h2>
                <form onSubmit={handleCreateBusinessAccount} className="space-y-3 md:space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full p-3 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 border rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 border rounded-lg"
                      required
                      minLength={6}
                    />
                  </div>
                  {createAccountError && (
                    <p className="text-red-500 text-sm">{createAccountError}</p>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-purple-600 text-white px-6 py-3 rounded-full 
                             hover:bg-purple-700 transition-all duration-300
                             transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    Create Business Account
                  </button>
                </form>
              </div>
            </div>

            {/* Business Users List - Reformatted for mobile */}
            <div className="bg-white/95 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-lg p-4 md:p-8 
                          border border-gray-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 to-rose-50/50"></div>
              <div className="relative">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Business Accounts</h2>
                
                {/* Mobile view */}
                <div className="md:hidden space-y-3">
                  {businessUsers.map((user) => (
                    <div key={user.uid} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex flex-col space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-500">Company</span>
                          <span className="text-sm font-medium text-gray-900">{user.displayName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-500">Email</span>
                          <span className="text-sm text-gray-900">{user.email}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-500">Created</span>
                          <span className="text-sm text-gray-900">
                            {user.createdAt?.toDate?.() 
                              ? user.createdAt.toDate().toLocaleDateString() 
                              : user.createdAt instanceof Date 
                                ? user.createdAt.toLocaleDateString()
                                : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop view - unchanged */}
                <div className="hidden md:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {businessUsers.map((user) => (
                        <tr key={user.uid} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {user.displayName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {user.createdAt?.toDate?.() 
                              ? user.createdAt.toDate().toLocaleDateString() 
                              : user.createdAt instanceof Date 
                                ? user.createdAt.toLocaleDateString()
                                : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {businessUsers.length === 0 && (
                  <p className="text-center text-gray-500 py-4 text-sm md:text-base">No business accounts found</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Regular Users List - Reformatted for mobile */
          <div className="bg-white/95 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-lg p-4 md:p-8 
                         border border-gray-100 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-50/50 to-rose-50/50"></div>
            <div className="relative">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Regular Users</h2>
              {error && <p className="text-red-500 mb-4 text-sm md:text-base">{error}</p>}
              
              {/* Mobile view */}
              <div className="md:hidden space-y-3">
                {users.map((user) => (
                  <div key={user.uid} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-500">Name</span>
                        <span className="text-sm font-medium text-gray-900">
                          {user.displayName || 'Anonymous User'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-500">Email</span>
                        <span className="text-sm text-gray-900">{user.email}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-500">Joined</span>
                        <span className="text-sm text-gray-900">
                          {user.createdAt?.toDate?.() 
                            ? user.createdAt.toDate().toLocaleDateString() 
                            : user.createdAt instanceof Date 
                              ? user.createdAt.toLocaleDateString()
                              : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop view - unchanged */}
              <div className="hidden md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.uid} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {user.displayName || 'Anonymous User'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {user.createdAt?.toDate?.() 
                            ? user.createdAt.toDate().toLocaleDateString() 
                            : user.createdAt instanceof Date 
                              ? user.createdAt.toLocaleDateString()
                              : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {users.length === 0 && (
                <p className="text-center text-gray-500 py-4 text-sm md:text-base">No users found</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage; 