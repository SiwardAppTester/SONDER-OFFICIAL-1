import React, { useState } from 'react';
import { User, Bell, Shield, FileText, HelpCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import Sidebar from './Sidebar'; // Assuming you have a regular user Sidebar component

const UserSettings: React.FC = () => {
  const [user] = useAuthState(auth);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Fetch user profile data
  React.useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  const settingsSections = [
    {
      id: 'profile',
      title: 'Profile Settings',
      icon: <User className="w-6 h-6" />,
      description: 'Manage your personal information and preferences'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <Bell className="w-6 h-6" />,
      description: 'Configure your notification preferences'
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: <Shield className="w-6 h-6" />,
      description: 'Manage your privacy settings and security options'
    },
    {
      id: 'terms',
      title: 'Terms & Conditions',
      icon: <FileText className="w-6 h-6" />,
      description: 'View our terms and conditions'
    },
    {
      id: 'help',
      title: 'Help & Support',
      icon: <HelpCircle className="w-6 h-6" />,
      description: 'Get help and contact support'
    }
  ];

  return (
    <div className="flex h-screen bg-black">
      <Sidebar
        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}
        user={user || null}
        userProfile={userProfile}
      />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className="flex items-center p-6 bg-white/5 rounded-xl hover:bg-white/10 
                         transition-all duration-300 border border-white/10 group"
              >
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center 
                              rounded-full bg-white/10 group-hover:bg-white/20 
                              transition-all duration-300 mr-4 text-white">
                  {section.icon}
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {section.title}
                  </h3>
                  <p className="text-sm text-white/60">
                    {section.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Section content */}
          {activeSection && (
            <div className="mt-8 p-6 bg-white/5 rounded-xl border border-white/10">
              {activeSection === 'profile' && (
                <div>
                  {/* Profile settings content */}
                </div>
              )}
              
              {activeSection === 'notifications' && (
                <div>
                  {/* Notifications settings content */}
                </div>
              )}
              
              {activeSection === 'privacy' && (
                <div>
                  {/* Privacy settings content */}
                </div>
              )}
              
              {activeSection === 'terms' && (
                <div>
                  {/* Terms and conditions content */}
                </div>
              )}
              
              {activeSection === 'help' && (
                <div>
                  {/* Help and support content */}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSettings; 