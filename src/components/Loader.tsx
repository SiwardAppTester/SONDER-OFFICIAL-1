import React from 'react';
import { Html, useProgress } from '@react-three/drei';

export const Loader: React.FC = () => {
  const { progress } = useProgress();
  
  return (
    <Html center>
      <div className="text-white text-xl font-['Space_Grotesk']">
        {progress.toFixed(0)}% loaded
      </div>
    </Html>
  );
}; 