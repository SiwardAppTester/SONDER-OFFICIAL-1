import React, { useState, Suspense } from 'react';
import { Users, User as UserIcon, FileText, HelpCircle } from 'lucide-react';
import BusinessSidebar from './BusinessSidebar';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import BusinessTermsAndConditions from './BusinessTermsAndConditions';
import { User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';

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
      
      <mesh scale={[-15, -15, -15]}>
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

const BusinessSettings: React.FC = () => {
  const [user] = useAuthState(auth);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [accessibleFestivalsCount, setAccessibleFestivalsCount] = useState(0);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch user profile data
  React.useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
          setAccessibleFestivalsCount(userDoc.data().accessibleFestivals?.length || 0);
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  const settingsSections = [
    {
      id: 'profile',
      title: 'Profile Settings',
      icon: <UserIcon className="w-6 h-6" />,
      description: 'Manage your business profile information'
    },
    {
      id: 'users',
      title: 'User Management',
      icon: <Users className="w-6 h-6" />,
      description: 'Manage users and permissions'
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

  const handleSectionClick = (sectionId: string) => {
    if (sectionId === 'terms') {
      navigate('/business-terms');
    } else if (sectionId === 'help') {
      navigate('/help-support');
    } else if (sectionId === 'users') {
      navigate('/user-management');
    } else {
      setActiveSection(sectionId);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
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

      {/* Main Content */}
      <div className="relative z-10 flex h-screen">
        <BusinessSidebar
          isNavOpen={isNavOpen}
          setIsNavOpen={setIsNavOpen}
          user={user || null}
          userProfile={userProfile}
          accessibleFestivalsCount={accessibleFestivalsCount}
        />
        
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
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

            {activeSection && (
              <div className="mt-8 p-6 bg-white/5 rounded-xl border border-white/10">
                {activeSection === 'profile' && (
                  <div>
                    {/* Profile settings content */}
                  </div>
                )}
                
                {activeSection === 'users' && (
                  <div>
                    {/* User management content */}
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
    </div>
  );
};

export default BusinessSettings; 