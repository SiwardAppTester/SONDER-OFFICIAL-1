'use client'

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Canvas } from '@react-three/fiber'
import { Environment, PerspectiveCamera, Text3D, useProgress, Html } from '@react-three/drei'
import { Suspense, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { useNavigate, useLocation } from 'react-router-dom'
import '../styles/fonts.css'
import { gsap } from 'gsap'

// Utility function
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Button component
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

// 3D Components
function FloatingShell({ isAnimating }: { isAnimating: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hasAnimationStarted, setHasAnimationStarted] = React.useState(false)
  
  // Add position adjustment for mobile
  React.useEffect(() => {
    if (meshRef.current) {
      const handleResize = () => {
        const isMobile = window.innerWidth < 768;
        // Adjust scale as before
        meshRef.current!.scale.set(
          isMobile ? 0.8 : 1,
          isMobile ? 0.8 : 1,
          isMobile ? 0.8 : 1
        );
        // Adjust sphere position - slightly lower but still up from original
        meshRef.current!.position.y = isMobile ? 0.2 : -0.1;
      };

      handleResize(); // Initial check
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  
  useFrame((state) => {
    if (meshRef.current) {
      if (!isAnimating) {
        // Only rotate, no position change
        meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1
        meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.1
      } else if (!hasAnimationStarted) {
        // Sucking animation
        setHasAnimationStarted(true)
        gsap.to(meshRef.current.scale, {
          x: 20,
          y: 20,
          z: 20,
          duration: 1.5,
          ease: "power2.in"
        })
        gsap.to(meshRef.current.position, {
          z: -2,
          duration: 1.5,
          ease: "power2.in"
        })
        gsap.to(meshRef.current.rotation, {
          x: Math.PI * 2,
          y: Math.PI * 2,
          duration: 1.5,
          ease: "power2.in"
        })
      }
    }
  })

  return (
    <mesh ref={meshRef} position={[0, -0.1, 0]} castShadow>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        color="#1a1a1a"
        metalness={0.9}
        roughness={0.1}
        envMapIntensity={1}
        transparent
        opacity={isAnimating ? 1 : 0.9}
      />
    </mesh>
  )
}

function Scene({ isAnimating }: { isAnimating: boolean }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)

  React.useEffect(() => {
    if (isAnimating && cameraRef.current) {
      gsap.to(cameraRef.current.position, {
        z: -1,
        duration: 1.5,
        ease: "power2.in"
      })
    }
  }, [isAnimating])

  return (
    <>
      <Environment preset="sunset" />
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 5]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} castShadow />
      
      <FloatingShell isAnimating={isAnimating} />
    </>
  )
}

function Loader() {
  return (
    <Html center>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-white/80 animate-[bounce_1s_infinite_0ms]"></div>
        <div className="w-3 h-3 rounded-full bg-white/80 animate-[bounce_1s_infinite_200ms]"></div>
        <div className="w-3 h-3 rounded-full bg-white/80 animate-[bounce_1s_infinite_400ms]"></div>
      </div>
    </Html>
  );
}

const NewWelcomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [showIntro, setShowIntro] = React.useState(() => {
    return !location.state || location.state.from !== 'about';
  });
  const [showSignIn, setShowSignIn] = React.useState(false);

  React.useEffect(() => {
    if (!showIntro) return;

    const tl = gsap.timeline();
    
    // Animate each word
    const words = [
      '.word-in', '.word-a', '.word-hyper', '.word-connected', 
      '.word-world', '.word-weve', '.word-never', '.word-felt',
      '.word-more', '.word-disconnected'
    ];

    // Set initial state for all words
    gsap.set(words.map(w => w), { 
      opacity: 0,
      y: 20
    });

    // Animate each word one by one with better timing
    words.forEach((word) => {
      tl.to(word, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.15 // Smooth delay between words
      }, ">");  // The ">" ensures proper sequencing
    });

    // After all words are shown, wait longer before fading out
    tl.to({}, { duration: 1.5 }) // longer pause
      .to('.intro-text', {
        opacity: 0,
        duration: 1.2,
        ease: "power2.inOut",
        onComplete: () => setShowIntro(false)
      });

    return () => {
      tl.kill();
    };
  }, [showIntro]);

  const handleAboutClick = () => {
    setIsAnimating(true);
    
    // Animate content and sphere
    gsap.to('.content-fade', {
      opacity: 0,
      scale: 0.95,
      duration: 1,
      ease: "power2.inOut"
    });

    setTimeout(() => {
      navigate('/about', { 
        state: { animateFrom: 'welcome' }
      });
    }, 1000);
  };

  const handleSignIn = () => {
    setIsAnimating(true);
    
    // Animate content and sphere (matching handleAboutClick animation)
    gsap.to('.content-fade', {
      opacity: 0,
      scale: 0.95,
      duration: 0.8,
      ease: "power3.in"
    });

    // Navigate after animation (using same timing as handleAboutClick)
    setTimeout(() => {
      document.body.style.backgroundColor = '#000';
      navigate('/signin', { state: { animateFrom: 'welcome' } });
    }, 800);
  };

  return (
    <div className="h-screen w-full relative bg-black overflow-hidden">
      {showIntro && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-40">
          <div className="intro-text text-center md:px-4 px-8">
            <p className="text-[#808080] text-lg md:text-3xl md:mb-2 mb-1 font-['Space_Grotesk'] leading-relaxed md:leading-normal">
              <span className="word-in">In</span>{' '}
              <span className="word-a">A</span>{' '}
              <span className="word-hyper text-white">Hyper</span>
              <span className="word-connected text-white">-Connected</span>{' '}
              <span className="word-world">World</span>
            </p>
            <p className="text-[#808080] text-lg md:text-3xl font-['Space_Grotesk'] leading-relaxed md:leading-normal">
              <span className="word-weve">We've</span>{' '}
              <span className="word-never">Never</span>{' '}
              <span className="word-felt">Felt</span>{' '}
              <span className="word-more">More</span>{' '}
              <span className="word-disconnected text-white">Disconnected</span>.
            </p>
          </div>
        </div>
      )}

      {/* Video background - lowest layer */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 content-fade"
        style={{
          filter: "brightness(0.5)"
        }}
      >
        <source src="/videos/background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Text layer with mobile-only responsive changes */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-30 content-fade">
        <h1 className="md:text-[160px] text-[70px] font-[500] md:mb-12 mb-6 tracking-[0.07em]
                      text-white/95 font-['Outfit']
                      drop-shadow-[0_0_30px_rgba(255,255,255,0.25)]
                      transform md:-translate-y-56 -translate-y-48
                      transition-all duration-700 ease-out
                      hover:tracking-[0.2em] hover:drop-shadow-[0_0_40px_rgba(255,255,255,0.35)]">
          SONDER
        </h1>
        {showSignIn && (
          <button 
            onClick={handleSignIn}
            className="relative md:px-12 px-8 md:py-3.5 py-2.5 border-2 border-white/30 rounded-full
                      text-white md:text-base text-sm font-['Space_Grotesk'] md:tracking-[0.2em] tracking-[0.15em]
                      transform md:translate-y-40 translate-y-32
                      transition-all duration-300 
                      hover:border-white/60 hover:scale-105
                      hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]
                      active:scale-95
                      cursor-pointer"
          >
            JOIN THE REVOLUTION
          </button>
        )}
        <button 
          onClick={handleAboutClick}
          className="relative md:px-12 px-8 md:py-3.5 py-2.5 border-2 border-white/30 rounded-full
                    text-white md:text-base text-sm font-['Space_Grotesk'] md:tracking-[0.2em] tracking-[0.15em]
                    transform md:translate-y-40 translate-y-32
                    transition-all duration-300 
                    hover:border-white/60 hover:scale-105
                    hover:bg-white/10 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]
                    active:scale-95
                    cursor-pointer"
        >
          ABOUT US
        </button>
      </div>

      {/* Canvas (black sphere) */}
      <Canvas
        className="absolute inset-0 z-20"
        shadows
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 5], fov: 75 }}
      >
        <Suspense fallback={<Loader />}>
          <Scene isAnimating={isAnimating} />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default NewWelcomeScreen; 