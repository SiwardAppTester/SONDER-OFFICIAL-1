import React, { useState, Suspense } from 'react';
import { Mail, Phone, Globe, MessageCircle, ChevronDown } from 'lucide-react';
import BusinessSidebar from './BusinessSidebar';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
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

const HelpAndSupport: React.FC = () => {
  const [user] = useAuthState(auth);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [accessibleFestivalsCount, setAccessibleFestivalsCount] = useState(0);
  const [expandedFaqs, setExpandedFaqs] = useState<number[]>([]);

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

  const supportOptions = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: 'Email Support',
      description: 'Get in touch via email',
      action: 'support@sonder.com',
      buttonText: 'Send Email'
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: 'Phone Support',
      description: 'Call our support team',
      action: '+1 (555) 123-4567',
      buttonText: 'Call Now'
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: 'Live Chat',
      description: 'Chat with our support team',
      action: 'Start a conversation',
      buttonText: 'Start Chat'
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Knowledge Base',
      description: 'Browse our help articles',
      action: 'View articles',
      buttonText: 'Browse Articles'
    }
  ];

  const faqItems = [
    {
      question: "How do I access my festival memories?",
      answer: "You can access your festival memories by logging into your Sonder account and navigating to 'My Memories'. Here you'll find all the professional content captured during the festivals you've attended. You can view, download, and share these memories directly from your dashboard."
    },
    {
      question: "Can I share my festival memories on social media?",
      answer: "Yes! You can easily share your festival memories on various social media platforms. Simply click the 'Share' button on any video or photo, and choose your preferred platform. You can share directly to Instagram, Facebook, Twitter, or download the content to share it later."
    },
    {
      question: "How long will my festival memories be available?",
      answer: "Your festival memories are stored permanently on our platform as long as you maintain an active account. You can access them anytime and download them to keep local copies for your personal collection."
    },
    {
      question: "What should I do if I can't find my festival content?",
      answer: "If you can't locate your festival content, first ensure you're logged in with the correct account. Check that the festival date has passed and allow up to 48 hours for content processing. If you still can't find your content, contact our support team with your ticket information and festival details."
    },
    {
      question: "How do I update my account settings?",
      answer: "To update your account settings, go to the 'Profile Settings' section in your dashboard. Here you can modify your personal information, notification preferences, and privacy settings. Don't forget to save your changes after making any modifications."
    },
    {
      question: "Is my personal information secure?",
      answer: "Yes, we take your privacy seriously. We use industry-standard encryption to protect your personal information and never share your data with third parties without your explicit consent. You can review our privacy policy for more detailed information about how we handle your data."
    }
  ];

  const toggleFaq = (index: number) => {
    setExpandedFaqs(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
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
          <div className="max-w-4xl mx-auto p-6 pt-32">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {supportOptions.map((option, index) => (
                <div
                  key={index}
                  className="p-6 bg-white/5 rounded-xl border border-white/10 
                           hover:bg-white/10 transition-all duration-300"
                >
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 flex items-center justify-center 
                                  rounded-full bg-white/10 mr-4">
                      {option.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">
                        {option.title}
                      </h3>
                      <p className="text-white/60">
                        {option.description}
                      </p>
                    </div>
                  </div>
                  <button
                    className="w-full py-3 px-4 bg-white/10 rounded-lg text-white 
                             hover:bg-white/20 transition-all duration-300 mt-4"
                  >
                    {option.buttonText}
                  </button>
                </div>
              ))}
            </div>

            {/* FAQ Section */}
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-white mb-6">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {faqItems.map((item, index) => (
                  <div 
                    key={index} 
                    className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full p-6 flex items-center justify-between text-left"
                    >
                      <h3 className="text-lg font-semibold text-white">
                        {item.question}
                      </h3>
                      <ChevronDown 
                        className={`w-5 h-5 text-white transition-transform duration-200 
                          ${expandedFaqs.includes(index) ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {expandedFaqs.includes(index) && (
                      <div className="px-6 pb-6 text-white/60">
                        {item.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpAndSupport; 