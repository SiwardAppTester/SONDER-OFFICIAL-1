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
import { useNavigate } from 'react-router-dom'

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
function FloatingShell() {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1
      meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.1
      meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1
    }
  })

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} castShadow>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        color="#1a1a1a"
        metalness={0.9}
        roughness={0.1}
        envMapIntensity={1}
      />
    </mesh>
  )
}

function Scene() {
  return (
    <>
      <Environment preset="sunset" />
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} castShadow />
      
      <FloatingShell />
    </>
  )
}

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

const NewWelcomeScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full relative">
      {/* Background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/background.jpg')",
          filter: "brightness(0.5)"
        }}
      />
      
      <Canvas
        className="absolute inset-0"
        shadows
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 5], fov: 75 }}
      >
        <Suspense fallback={<Loader />}>
          <Scene />
        </Suspense>
      </Canvas>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <h1 className="text-6xl font-bold mb-12 text-[#C0C0C0] tracking-widest 
                      drop-shadow-[0_0_10px_rgba(192,192,192,0.5)]
                      transform -translate-y-20">
          SONDER
        </h1>
        <Button 
          onClick={() => navigate('/')}
          className="pointer-events-auto bg-transparent border border-white/20 text-white hover:bg-white/10 rounded-full px-8 py-6"
        >
          BIRTH YOUR VENUS
        </Button>
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 text-white/50 hover:text-white transition-colors duration-300 z-50"
      >
        ← Back
      </button>
    </div>
  )
}

export default NewWelcomeScreen; 