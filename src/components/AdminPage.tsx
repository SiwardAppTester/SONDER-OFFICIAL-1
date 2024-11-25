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
    <div className="admin-page p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <button
          onClick={handleSignOut}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>

      {/* Toggle Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveSection('users')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeSection === 'users'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Regular Users
        </button>
        <button
          onClick={() => setActiveSection('business')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            activeSection === 'business'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Create Business Account
        </button>
      </div>

      {/* Conditional Rendering based on activeSection */}
      {activeSection === 'business' ? (
        <div className="space-y-6">
          {/* Create Business Account Form */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Create Business Account</h2>
            <form onSubmit={handleCreateBusinessAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                  minLength={6}
                />
              </div>
              {createAccountError && (
                <p className="text-red-500 text-sm">{createAccountError}</p>
              )}
              <button
                type="submit"
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                Create Business Account
              </button>
            </form>
          </section>

          {/* Business Accounts List */}
          <section className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Business Accounts</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
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
                <tbody className="bg-white divide-y divide-gray-200">
                  {businessUsers.map((user) => (
                    <tr key={user.uid}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.displayName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
              {businessUsers.length === 0 && (
                <p className="text-center text-gray-500 py-4">No business accounts found</p>
              )}
            </div>
          </section>
        </div>
      ) : (
        /* Users List Section */
        <section className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Regular Users</h2>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
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
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.uid}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.displayName || 'Anonymous User'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
            {users.length === 0 && (
              <p className="text-center text-gray-500 py-4">No users found</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminPage; 