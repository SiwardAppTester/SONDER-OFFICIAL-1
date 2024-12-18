import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera } from '@react-three/drei';
import { Loader } from '../components/ThreeBackground';
import * as THREE from 'three';

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

  return (
    <mesh ref={meshRef} position={[0, 0, -2]} scale={[3, 3, 3]} castShadow>
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

const ReadMore: React.FC = () => {
  return (
    <>
      <style>
        {`
          /* Add font styles */
          h1, h2, h3, h4, h5, h6, p, button, a, span, div {
            font-family: 'Space Grotesk', sans-serif;
          }

          .scroll-container {
            overflow-y: scroll;
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* Internet Explorer 10+ */
          }

          .scroll-container::-webkit-scrollbar { 
            display: none; /* Safari and Chrome */
            width: 0;
            height: 0;
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
      
      <div className="scroll-container relative w-full bg-black">
        {/* Background container with fixed height */}
        <div className="absolute inset-0 h-[600vh] bg-black">
          {/* Add any background effects here if needed */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black/90" />
        </div>

        {/* Content container */}
        <div className="relative h-[600vh]">
          {/* First screen - Hero section */}
          <div className="h-[80vh] flex items-center justify-center p-4 pt-32">
            <div className="max-w-[90rem] text-center px-4 mt-20">
              <p className="text-3xl md:text-5xl font-bold leading-relaxed tracking-wider text-white">
                THE JOY OF BEING FULLY PRESENT IS SLOWLY BEING REPLACED BY A NEED TO DOCUMENT EVERY MOMENT.
              </p>
            </div>
          </div>

          {/* Second screen - Additional content */}
          <div className="h-[60vh] flex flex-col justify-center space-y-44 mt-32">
            <div className="max-w-3xl text-left px-4 ml-32">
              <p className="text-lg md:text-2xl leading-relaxed text-white/80">
                We understand how easy it is to get caught<br />
                up in capturing memories instead of<br />
                experiencing them.
              </p>
            </div>

            <div className="max-w-3xl text-right px-4 mr-32 self-end mb-8">
              <p className="text-lg md:text-2xl leading-relaxed text-white/80">
                That's why we've created a platform<br />
                that ensures you never have to choose<br />
                between the two.
              </p>
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
            <div className="absolute inset-0 flex flex-col items-center justify-center translate-y-32 z-20 px-4">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                BUT, WHO ARE WE?
              </h2>
              <p className="text-xl md:text-2xl text-white/90 max-w-4xl text-center leading-relaxed">
                We are three friends brought together by our shared love for festivals and events. 
                Over the years, we've traveled the world, experiencing countless events together, 
                and noticed a growing shift in how people engage with festivals.
              </p>
            </div>
          </div>

          {/* Add this section after the sphere section, inside the content container */}
          <div className="relative min-h-[120vh] w-full bg-black pt-96">
            <div className="max-w-7xl mx-auto px-4 md:px-64">
              <div className="flex flex-col md:flex-row items-start">
                {/* Left title section */}
                <div className="md:w-[15%] pr-0 -mt-48">
                  <h2 className="text-4xl md:text-5xl font-bold text-white leading-none mb-0">
                    The<br />
                    Good<br />
                    Old<br />
                    Days?
                  </h2>
                </div>

                {/* Right content section */}
                <div className="md:w-[85%] md:pl-24 -mt-8 mb-32">
                  <p className="text-xl md:text-2xl text-white/80 leading-relaxed">
                    The debate around whether phones belong on the dance floor has become a hot topic, 
                    with some events experimenting with concepts like no-phone policies or camera stickers. 
                    While these ideas spark conversations and hint at a desire to return to the "good old days," 
                    they don't fully address the reality of our digital age. At the same time, we recognize 
                    the incredible value that phones and user-generated content bring to the growth of events 
                    and artists.
                  </p>
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
                <mesh position={[0, 4, 0]} scale={[5, 5, 5]} castShadow>
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
            <div className="absolute inset-0 flex flex-col items-center -mt-24 z-[13]">
              <h2 className="text-[10rem] md:text-[18rem] font-[500] text-white mb-0 w-full text-center font-['Outfit'] tracking-[0.12em]">
                SONDER
              </h2>
              <p className="text-3xl md:text-5xl text-white/90 max-w-7xl text-center leading-relaxed -mt-8">
                RATHER THAN RESISTING TECHNOLOGY, WE<br />
                BELIEVE IN UTILIZING IT TO ENHANCE OUR LIVES.
              </p>
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
          <div className="relative h-screen w-full bg-black pl-32 pr-8 -mt-[65rem] z-[14]">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">
              BUT, WHAT ARE WE?
            </h2>
            
            <div className="space-y-16 max-w-md">
              <p className="text-base md:text-xl text-white/80 leading-relaxed">
                SONDER is a platform that lets you be present in the moment, knowing we'll 
                provide you with all the curated content you need. By giving festival-goers 
                the freedom to immerse themselves fully, we aim to restore the true festival 
                experience while also supporting events with strategic tools for categorizing, 
                uploading, and optimizing content for their marketing campaigns. We bridge 
                the gap between event experiences and content sharing.
              </p>

              <p className="text-base md:text-xl text-white/80 leading-relaxed">
                By combining innovative technology with a people-first approach, we help 
                event-goers enjoy every second while guaranteeing access to exclusive, 
                high-quality content linked directly to their tickets. From VIP backstage 
                moments to general access highlights, our mission is to deliver memories that 
                are curated, effortless, and unforgettable.
              </p>
            </div>
          </div>

          {/* Add the quote section after the "BUT, WHAT ARE WE?" section */}
          <div className="relative h-screen w-full bg-black z-[14] pt-32">
            <div className="max-w-7xl mx-auto px-8">
              <p className="text-3xl md:text-4xl leading-relaxed text-center">
                <span className="text-white/30">"we redefine the way people engage with events, creating a seamless experience </span>
                <span className="text-white">where technology complements, rather than distracts from, the actual moment. </span>
                <span className="text-white/30">changing from the moments you have missed to moments you lived."</span>
              </p>
            </div>
          </div>

          {/* Update the final black section to include the sphere */}
          <div className="relative h-screen w-full bg-black z-[14] -mt-[30rem]">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <p className="text-gray-400 text-lg mb-2">are you ready?</p>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 text-center">
                BE A PART OF THE<br />
                NEXT BIG THING
              </h2>
              <button className="px-8 py-3 bg-[#F4A261] text-white rounded-full font-medium hover:bg-[#E76F51] transition-colors">
                GET STARTED
              </button>
            </div>

            {/* Add gradients for smooth blending */}
            <div className="absolute top-0 left-0 right-0 h-32" style={{ 
              background: 'linear-gradient(to bottom, rgb(0, 0, 0) 0%, transparent 100%)' 
            }} />
            <div className="absolute bottom-0 left-0 right-0 h-32" style={{ 
              background: 'linear-gradient(to top, rgb(0, 0, 0) 0%, transparent 100%)' 
            }} />
          </div>
        </div>
      </div>
    </>
  );
};

export default ReadMore; 