import React, { useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import { Suspense } from 'react';
import * as THREE from 'three';

interface FestivalDetailsProps {
  // Add any required props
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

const FestivalDetails: React.FC<FestivalDetailsProps> = () => {
  const [qrError, setQrError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Add this function to read QR code content
  const readQRCode = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (!event.target?.result) {
          reject(new Error("Failed to read file"));
          return;
        }
        
        try {
          // Create a temporary div for the QR scanner
          const tempDiv = document.createElement('div');
          tempDiv.id = 'temp-qr-reader';
          document.body.appendChild(tempDiv);

          const html5QrCode = new Html5Qrcode('temp-qr-reader');
          const qrCodeMessage = await html5QrCode.scanFile(file, true);
          
          // Clean up
          document.body.removeChild(tempDiv);
          await html5QrCode.clear();

          resolve(qrCodeMessage);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle QR file upload
  const handleQRFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    try {
      const file = e.target.files[0];
      const qrContent = await readQRCode(file);
      console.log("QR Content:", qrContent);
      
      setQrError(null);
    } catch (error) {
      console.error("Error handling file upload:", error);
      setQrError("Invalid QR code image. Please try another image.");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
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

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 
                         shadow-[0_0_30px_rgba(255,255,255,0.1)] 
                         border border-white/20">
            <h2 className="text-2xl text-white/90 mb-6 text-center tracking-[0.2em]">
              Festival Details
            </h2>

            {/* QR Code Upload */}
            <div className="mb-6">
              <input
                type="file"
                accept="image/*"
                onChange={handleQRFileUpload}
                className="hidden"
                id="qr-upload"
              />
              <label
                htmlFor="qr-upload"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 
                          border-2 border-white/30 rounded-full
                          text-white font-['Space_Grotesk'] tracking-[0.2em]
                          transition-all duration-300 
                          hover:border-white/60 hover:scale-105 cursor-pointer"
              >
                SCAN QR CODE
              </label>

              {qrError && (
                <div className="mt-2 p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                  <p className="text-red-400 text-sm text-center">{qrError}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FestivalDetails; 