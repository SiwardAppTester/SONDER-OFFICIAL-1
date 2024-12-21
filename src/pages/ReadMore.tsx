import React, { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera } from '@react-three/drei';
import { Loader } from '../components/ThreeBackground';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { EmailPopup } from '../components/EmailPopup';
import { Toast } from '../components/Toast';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Helmet } from "react-helmet";
// Bottom floating sphere component
function BottomFloatingShell() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1;
      meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={[-2.5, 0, -2]} scale={[5.7, 5.7, 5.7]} castShadow>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color="#1a1a1a"
        metalness={0.85}
        roughness={0.15}
        envMapIntensity={0.95}
        transparent
        opacity={0.88}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}

// Add this new component near the top of the file, after BottomFloatingShell
function QuoteBottomSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.1;
      meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1;
    }
  });

  const [scale, setScale] = useState<any>([3, 3, 3]);
  const [position, setPosition] = useState<any>([0, 0, -2]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setScale([2.2, 2.2, 2.2]);
        setPosition([0, -0.5, -2]);
      } else {
        setScale([3, 3, 3]);
        setPosition([0, 0, -2]);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <mesh ref={meshRef} position={position} scale={scale} castShadow>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color="#1a1a1a"
        metalness={0.85}
        roughness={0.15}
        envMapIntensity={0.95}
        transparent
        opacity={0.88}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}

// Update the fadeInUp variant with an even longer duration
const fadeInUp = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 2.4,
      ease: "easeOut"
    }
  }
};

// Update the AnimatedText component to handle mobile text sizes
function AnimatedText({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeInUp}
      style={{ transition: `all 2.4s cubic-bezier(0.17, 0.55, 0.55, 1) ${delay}s` }}
      className={`${className} px-4 md:px-0`}
    >
      {children}
    </motion.div>
  );
}

const ReadMore: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [isEmailPopupOpen, setIsEmailPopupOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showToast, setShowToast] = useState(false);

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const minLength = 5;
    const maxLength = 100;
    const forbiddenDomains = ['tempmail.com', 'throwaway.com'];

    if (!emailRegex.test(email)) {
      return false;
    }

    if (email.length < minLength || email.length > maxLength) {
      return false;
    }

    const domain = email.split('@')[1].toLowerCase();
    if (forbiddenDomains.includes(domain)) {
      return false;
    }

    return true;
  };

  const handleEmailSubmit = async (email: string) => {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      if (!isValidEmail(normalizedEmail)) {
        setToastMessage('Please enter a valid email address');
        setToastType('error');
        setShowToast(true);
        return;
      }

      const emailQuery = query(
        collection(db, 'earlyAccess'),
        where('email', '==', normalizedEmail)
      );

      const querySnapshot = await getDocs(emailQuery);

      if (!querySnapshot.empty) {
        setToastMessage('This email is already on the waitlist! 🎉');
        setToastType('error');
        setShowToast(true);
        setIsEmailPopupOpen(false);
        return;
      }

      await addDoc(collection(db, 'earlyAccess'), {
        email: normalizedEmail,
        timestamp: serverTimestamp(),
        source: 'website_popup',
        userAgent: navigator.userAgent,
        referrer: document.referrer || 'direct',
        locale: navigator.language || 'unknown'
      });

      setToastMessage('Welcome to the future of partying 🎉');
      setToastType('success');
      setShowToast(true);
      setIsEmailPopupOpen(false);

    } catch (error) {
      console.error('Error adding email to waitlist:', error);

      let errorMessage = 'Something went wrong. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('permission-denied')) {
          errorMessage = 'Unable to join waitlist at this time.';
        } else if (error.message.includes('quota-exceeded')) {
          errorMessage = 'Service is currently busy. Please try again later.';
        }
      }

      setToastMessage(errorMessage);
      setToastType('error');
      setShowToast(true);
    }
  };

  return (
    <>
       <Helmet>
        <title></title>
          <meta name="description" content="" />
        </Helmet>
      <style>
        {`
          /* Add font styles */
          h1, h2, h3, h4, h5, h6, p, button, a, span, div {
            font-family: 'Space Grotesk', sans-serif;
          }

          /* Remove the old scroll-container styles */

          /* Add these new scrollbar hiding styles */
          body {
            -ms-overflow-style: none !important;  /* IE and Edge */
            scrollbar-width: none !important;  /* Firefox */
            overflow-y: auto;
          }

          body::-webkit-scrollbar {
            display: none !important;  /* Chrome, Safari and Opera */
            width: 0 !important;
            background: transparent !important;
          }

          .content-wrapper {
            position: relative;
            z-index: 1;
            overflow-y: auto;
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }

          .content-wrapper::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            background: transparent !important;
          }

          .dark-gradient-overlay {
            background: linear-gradient(
              to right,
              transparent 0%,
              transparent 30%,
              rgba(0, 0, 0, 0.4) 70%,
              rgba(0, 0, 0, 0.6) 100%
            );
            pointer-events: none;
          }

          .top-blend-gradient {
            background: linear-gradient(
              to bottom,
              rgb(0, 0, 0) 0%,
              rgba(0, 0, 0, 0.6) 40%,
              transparent 100%
            );
            height: 20vh;
            pointer-events: none;
          }

          .bottom-blend-gradient {
            background: linear-gradient(
              to bottom,
              rgb(0, 0, 0) 0%,
              rgba(0, 0, 0, 0.6) 40%,
              transparent 100%
            );
            height: 30vh;
            pointer-events: none;
          }

          .top-sphere-blend {
            background: linear-gradient(
              to bottom,
              rgb(0, 0, 0) 0%,
              rgba(0, 0, 0, 0.8) 30%,
              transparent 100%
            );
            height: 40vh;
            pointer-events: none;
          }
        `}
      </style>

      <div className="relative w-full bg-black">
        {/* Background container */}
        <div className="fixed inset-0 bg-black">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black/90" />
        </div>

        {/* Content wrapper */}
        <div className="content-wrapper">
          {/* First screen - Hero section */}
          <div className="min-h-[80vh] flex items-center justify-center p-4 pt-32">
            <div className="max-w-[90rem] text-center px-4 mt-0 md:mt-64">
              <AnimatedText className="text-xl sm:text-2xl md:text-5xl font-bold leading-relaxed tracking-wider text-white">
                THE JOY OF BEING FULLY PRESENT IS SLOWLY BEING REPLACED BY A NEED TO DOCUMENT EVERY MOMENT.
              </AnimatedText>

              {/* Increase margin for explore more section */}
              <div className="text-white/60 mt-32 md:mt-72">
                <div className="flex flex-col items-center gap-2 cursor-pointer hover:text-white/80 transition-colors">
                  <span className="text-base md:text-lg">explore more</span>
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="w-4 h-4 md:w-6 md:h-6 animate-bounce"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <polyline points="19 12 12 19 5 12"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Second screen - Additional content */}
          <div className="min-h-[60vh] flex flex-col justify-center space-y-12 md:space-y-44 mt-0 md:mt-32">
            <div className="max-w-[280px] md:max-w-3xl text-left px-8 md:px-4 md:ml-32">
              <AnimatedText className="text-base md:text-2xl leading-relaxed text-white/80">
                We understand how easy it is to get caught<br className="hidden md:block" />
                up in capturing memories instead of<br className="hidden md:block" />
                experiencing them.
              </AnimatedText>
            </div>

            <div className="max-w-[280px] md:max-w-3xl text-right md:text-right px-8 md:px-4 self-end md:mr-32 md:self-end -mb-24 md:mb-8">
              <AnimatedText className="text-base md:text-2xl leading-relaxed text-white/80" delay={0.2}>
                That's why we've created a platform<br className="hidden md:block" />
                that ensures you never have to choose<br className="hidden md:block" />
                between the two.
              </AnimatedText>
            </div>
          </div>

          {/* Ready Section with Sphere - Similar to AboutUs implementation */}
          <div className="relative h-screen w-full bg-black overflow-hidden mt-16">
            {/* Canvas Container */}
            <Canvas
              className="absolute inset-0"
              shadows
              gl={{ antialias: true, alpha: true }}
              camera={{ position: [0, 0, 3.3], fov: 45 }}
            >
              <Suspense fallback={<Loader />}>
                <Environment preset="sunset" />
                <PerspectiveCamera makeDefault position={[0, 0, 3.3]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} castShadow />
                <BottomFloatingShell />
              </Suspense>
            </Canvas>

            {/* Top blending gradient */}
            <div className="absolute top-0 left-0 right-0 top-blend-gradient z-10" />

            {/* Dark gradient overlay */}
            <div className="absolute inset-0 dark-gradient-overlay z-10" />

            {/* Text overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center -translate-y-48 md:translate-y-32 z-20 px-4">
              <AnimatedText className="text-2xl md:text-4xl font-bold text-white mb-4">
                BUT, WHO ARE WE?
              </AnimatedText>
              <AnimatedText className="text-base md:text-2xl text-white/90 max-w-4xl text-center leading-relaxed" delay={0.2}>
                We are three friends brought together by our shared love for festivals and events. 
                Over the years, we've traveled the world, experiencing countless events together, 
                and noticed a growing shift in how people engage with festivals.
              </AnimatedText>
            </div>
          </div>

          {/* Add this section after the sphere section, inside the content container */}
          <div className="relative min-h-[60vh] md:min-h-[120vh] w-full bg-black pt-0 md:pt-96">
            <div className="max-w-7xl mx-auto px-8 md:px-64">
              <div className="flex flex-col md:flex-row items-start">
                {/* Left title section */}
                <div className="w-full md:w-[15%] pr-0 mb-8 md:mb-0 md:-mt-48 -mt-64">
                  <AnimatedText className="text-3xl md:text-5xl font-bold text-white leading-none mb-0">
                    The<br />
                    Good<br />
                    Old<br />
                    Days?
                  </AnimatedText>
                </div>

                {/* Right content section */}
                <div className="w-full md:w-[85%] md:pl-24 md:-mt-8 mb-32 relative z-20">
                  <AnimatedText className="text-base md:text-2xl text-white/80 leading-relaxed" delay={0.2}>
                    The debate around whether phones belong on the dance floor has become a hot topic, 
                    with some events experimenting with concepts like no-phone policies or camera stickers. 
                    While these ideas spark conversations and hint at a desire to return to the "good old days," 
                    they don't fully address the reality of our digital age. At the same time, we recognize 
                    the incredible value that phones and user-generated content bring to the growth of events 
                    and artists.
                  </AnimatedText>
                </div>
              </div>
            </div>
          </div>

          {/* Add this section at the very bottom of the content container */}
          <div className="relative h-screen w-full bg-black overflow-hidden">
            {/* Canvas Container with bottom sphere */}
            <Canvas
              className="absolute inset-0"
              shadows
              gl={{ antialias: true, alpha: true }}
              camera={{ position: [0, 0, 8], fov: 75 }}
            >
              <Suspense fallback={<Loader />}>
                <Environment preset="sunset" />
                <PerspectiveCamera makeDefault position={[0, 0, 8]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} castShadow />
                <mesh 
                  position={[0, 4, 0]} 
                  scale={[
                    window.innerWidth < 768 ? 3 : 5, 
                    window.innerWidth < 768 ? 3 : 5, 
                    window.innerWidth < 768 ? 3 : 5
                  ]} 
                  castShadow
                >
                  <sphereGeometry args={[1, 32, 32]} />
                  <meshStandardMaterial
                    color="#1a1a1a"
                    metalness={0.85}
                    roughness={0.15}
                    envMapIntensity={0.8}
                    transparent
                    opacity={0.85}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    emissive="#000044"
                    emissiveIntensity={0.15}
                  />
                </mesh>
              </Suspense>
            </Canvas>

            {/* Full section blur overlay */}
            <div className="absolute inset-0 backdrop-blur-md z-[11]" />

            {/* Top blending gradient */}
            <div className="absolute top-0 left-0 right-0 top-sphere-blend z-[12]" />

            {/* Text overlay */}
            <div className="absolute inset-0 flex flex-col items-center -mt-24 md:-mt-24 pt-32 md:pt-0 z-[13]">
              <AnimatedText className="text-[5rem] sm:text-[6rem] md:text-[18rem] font-[500] text-white mb-0 w-full text-center font-['Outfit'] tracking-[0.12em]">
                SONDER
              </AnimatedText>
              <AnimatedText className="text-sm sm:text-2xl md:text-5xl text-white/90 max-w-7xl text-center leading-relaxed -mt-4 md:-mt-8 px-4" delay={0.2}>
                RATHER THAN RESISTING TECHNOLOGY, WE<br className="hidden md:block" />
                BELIEVE IN UTILIZING IT TO ENHANCE OUR LIVES.
              </AnimatedText>
            </div>
          </div>

          {/* Update the bottom black section - remove blue tint */}
          <div className="relative h-screen w-full bg-black">
            {/* Remove the blue gradient and just use black gradient for smooth transition */}
            <div className="absolute inset-0" style={{ 
              background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%)' 
            }} />
          </div>

          {/* Add the "BUT, WHAT ARE WE?" section with minimal padding */}
          <div className="relative h-[130vh] md:h-screen w-full bg-black px-8 md:pl-32 md:pr-8 -mt-[75rem] md:-mt-[65rem] z-[14]">
            <AnimatedText className="text-xl md:text-3xl font-bold text-white mb-8 pt-16 md:pt-0">
              BUT, WHAT ARE WE?
            </AnimatedText>

            <div className="space-y-8 md:space-y-16 max-w-md">
              <AnimatedText className="text-base md:text-xl text-white/80 leading-relaxed" delay={0.2}>
                SONDER is a platform that lets you be present in the moment, knowing we'll 
                provide you with all the curated content you need. By giving festival-goers 
                the freedom to immerse themselves fully, we aim to restore the true festival 
                experience while also supporting events with strategic tools for categorizing, 
                uploading, and optimizing content for their marketing campaigns. We bridge 
                the gap between event experiences and content sharing.
              </AnimatedText>

              <AnimatedText className="text-base md:text-xl text-white/80 leading-relaxed pb-16 md:pb-0" delay={0.4}>
                By combining innovative technology with a people-first approach, we help 
                event-goers enjoy every second while guaranteeing access to exclusive, 
                high-quality content linked directly to their tickets. From VIP backstage 
                moments to general access highlights, our mission is to deliver memories that 
                are curated, effortless, and unforgettable.
              </AnimatedText>
            </div>
          </div>

          {/* Add the quote section after the "BUT, WHAT ARE WE?" section */}
          <div className="relative h-screen w-full bg-black z-[14] pt-0 md:pt-32 -mt-32 md:mt-0">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
              <AnimatedText className="text-xl md:text-4xl leading-relaxed text-center">
                <span className="text-white/30">"we redefine the way people engage with events, creating a seamless experience </span>
                <span className="text-white">where technology complements, rather than distracts from, the actual moment. </span>
                <span className="text-white/30">changing from the moments you have missed to moments you lived."</span>
              </AnimatedText>
            </div>
          </div>

          {/* Update the final black section to include the sphere */}
          <div className="relative h-[80vh] md:h-screen w-full bg-black z-[14] -mt-[30rem]">
            <Canvas
              className="absolute inset-0"
              shadows
              gl={{ antialias: true, alpha: true }}
              camera={{ position: [0, 0, 8], fov: 75 }}
            >
              <Suspense fallback={<Loader />}>
                <Environment preset="sunset" />
                <PerspectiveCamera makeDefault position={[0, 0, 8]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} castShadow />
                <QuoteBottomSphere />
              </Suspense>
            </Canvas>

            {/* Add text and button overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 mt-24 md:mt-0">
              <AnimatedText className="text-gray-400 text-sm md:text-lg mb-2">
                are you ready?
              </AnimatedText>
              <AnimatedText className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-6 md:mb-8 text-center" delay={0.2}>
                BE A PART OF THE<br />
                NEXT BIG THING
              </AnimatedText>
              <AnimatedText delay={0.4}>
                <button 
                  onClick={() => setIsEmailPopupOpen(true)}
                  className="px-6 md:px-8 py-2 md:py-3 bg-[#F4A261] text-white rounded-full text-sm md:text-base font-medium hover:bg-[#E76F51] transition-colors hover:scale-105 active:scale-95 transform duration-200"
                >
                  EARLY ACCESS
                </button>
              </AnimatedText>
            </div>

            {/* Add gradients for smooth blending */}
            <div className="absolute top-0 left-0 right-0 h-32" style={{ 
              background: 'linear-gradient(to bottom, rgb(0, 0, 0) 0%, transparent 100%)' 
            }} />
            <div className="absolute bottom-0 left-0 right-0 h-32" style={{ 
              background: 'linear-gradient(to top, rgb(0, 0, 0) 0%, transparent 100%)' 
            }} />
          </div>

          {/* Add extra black section for extended background */}
          <div className="relative h-[12vh] md:h-[6vh] w-full bg-black z-[14]">
            {/* Add Sonder logo in bottom left */}
            <div className="absolute bottom-4 md:bottom-8 left-4 md:left-8">
              <h2 className="text-xl md:text-2xl font-[500] text-white font-['Outfit'] tracking-[0.12em]">
                SONDER
              </h2>
            </div>

            {/* Add connect section in bottom right */}
            <div className="absolute bottom-4 md:bottom-8 right-4 md:right-8 text-right">
              <div className="flex flex-col items-end">
                <h3 className="hidden md:block text-white text-sm font-bold tracking-[0.2em] mb-1">
                  CLICK
                </h3>
                <h3 className="hidden md:block text-white text-sm font-bold tracking-[0.2em] mb-1">
                  2
                </h3>
                <h3 className="hidden md:block text-white text-sm font-bold tracking-[0.2em] mb-4">
                  CONNECT
                </h3>
              </div>
              <div className="flex gap-4 justify-end text-white/80">
                <a 
                  href="https://www.tiktok.com/@sonder__ofc?_t=8sLe4DVlm6A&_r=1" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="transition-colors hover:text-white"
                  aria-label="Follow us on TikTok"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 448 512">
                    <path fill="currentColor" d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/>
                  </svg>
                </a>
                <a 
                  href="https://www.instagram.com/sonder__ofc/?utm_source=ig_web_button_share_sheet" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="transition-colors hover:text-white"
                  aria-label="Follow us on Instagram"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M7.8,2H16.2C19.4,2 22,4.6 22,7.8V16.2A5.8,5.8 0 0,1 16.2,22H7.8C4.6,22 2,19.4 2,16.2V7.8A5.8,5.8 0 0,1 7.8,2M7.6,4A3.6,3.6 0 0,0 4,7.6V16.4C4,18.39 5.61,20 7.6,20H16.4A3.6,3.6 0 0,0 20,16.4V7.6C20,5.61 18.39,4 16.4,4H7.6M17.25,5.5A1.25,1.25 0 0,1 18.5,6.75A1.25,1.25 0 0,1 17.25,8A1.25,1.25 0 0,1 16,6.75A1.25,1.25 0 0,1 17.25,5.5M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z" />
                  </svg>
                </a>
                <a 
                  href="mailto:info@sonder-official.com" 
                  className="transition-colors hover:text-white"
                  aria-label="Email us"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>

      <EmailPopup 
        isOpen={isEmailPopupOpen}
        closeModal={() => setIsEmailPopupOpen(false)}
        onSubmit={handleEmailSubmit}
      />

      <Toast 
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </>
  );
};

export default ReadMore; 