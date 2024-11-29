import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const NewWelcomeScreen: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Create dynamic crowd silhouettes
  const generateCrowdElements = () => {
    return Array.from({ length: 30 }).map((_, i) => (
      <div
        key={i}
        className="absolute w-4 h-8 bg-[#1f164b] rounded-t-full"
        style={{
          bottom: '0',
          left: `${(i / 30) * 100}%`,
          opacity: 0.3 + Math.random() * 0.4,
          transform: `scaleY(${0.8 + Math.random() * 0.4})`,
          filter: 'blur(1px)'
        }}
      />
    ));
  };

  return (
    <div className="h-screen bg-[#1f164b] text-white overflow-hidden relative flex items-center justify-center">
      {/* Dynamic background */}
      <div className="absolute inset-0">
        {/* Vibrant gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1f164b] via-[#8c00ff]/30 to-[#1f164b]" />
        
        {/* Festival lights effect */}
        <div className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-pulse-slow"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 60}%`,
                width: `${10 + Math.random() * 20}px`,
                height: `${10 + Math.random() * 20}px`,
                background: `radial-gradient(circle at center, 
                  ${['#e0ddee', '#b69fff', '#8c00ff'][Math.floor(Math.random() * 3)]}, 
                  transparent)`,
                opacity: 0.3,
                filter: 'blur(3px)',
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>

        {/* Dancing crowd silhouette */}
        <div className="absolute bottom-0 left-0 right-0 h-32 opacity-20">
          {generateCrowdElements()}
        </div>
      </div>

      {/* Main content */}
      <div className={`relative z-10 text-center transition-all duration-1000 ${
        isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}>
        {/* Logo and tagline */}
        <div className="mb-8">
          <h1 className="text-7xl md:text-8xl font-bold mb-4 tracking-tight">
            <span className="text-[#e0ddee]">son</span>
            <span className="text-[#8c00ff] animate-pulse-slow">der</span>
          </h1>
          <p className="text-2xl md:text-3xl text-[#e0ddee]/90 font-light">
            capture the vibe
          </p>
        </div>

        {/* Fun, energetic message */}
        <div className="max-w-2xl mx-auto px-6 mb-12">
          <p className="text-xl md:text-2xl text-[#b69fff] font-light leading-relaxed">
            Your festival moments, professionally captured.
            <br />
            <span className="text-[#e0ddee]/75">Dance like nobody's watching</span>
            <br />
            (because we've got the photos covered) 
          </p>
        </div>

        {/* Playful CTA button */}
        <Link to="/signin">
          <button className="group relative px-10 py-4 bg-[#8c00ff] rounded-full text-xl 
                           transform transition-all duration-300 
                           hover:scale-105 hover:rotate-1
                           active:scale-95
                           overflow-hidden">
            {/* Button background animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#8c00ff] via-[#b69fff] to-[#8c00ff] 
                          opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Button text */}
            <span className="relative z-10 font-medium">
              Join the Party 🎉
            </span>
          </button>
        </Link>

        {/* Floating music notes and symbols */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-float-subtle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                fontSize: `${1 + Math.random() * 1.5}rem`,
                opacity: 0.2,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${4 + Math.random() * 3}s`
              }}
            >
              {['♪', '♫', '🎵', '🎶'][Math.floor(Math.random() * 4)]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewWelcomeScreen; 