import React, { useState, useRef, useEffect } from 'react';
import SignIn from "./SignIn";
import { useNavigate } from 'react-router-dom';

const WelcomeScreen: React.FC = () => {
  const [showSignIn, setShowSignIn] = useState(false);
  const [festivalCode, setFestivalCode] = useState('');
  const navigate = useNavigate();

  const handleJoinClick = () => {
    setShowSignIn(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 flex flex-col justify-center items-center relative overflow-hidden py-8 md:py-0">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-64 md:w-96 h-64 md:h-96 bg-white rounded-full blur-3xl opacity-20 -top-20 -left-20 animate-pulse"></div>
        <div className="absolute w-64 md:w-96 h-64 md:h-96 bg-white rounded-full blur-3xl opacity-20 -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {!showSignIn ? (
        <div className="w-full max-w-6xl mx-auto px-4 flex flex-col items-center relative z-10">
          {/* Main Content */}
          <div className="text-center w-full">
            {/* Logo - Updated colors */}
            <div className="text-6xl md:text-9xl font-bold mb-8 md:mb-12 transform hover:scale-105 transition-transform duration-300 cursor-default flex justify-center">
              <span className="text-[#FF6F31]">S</span>
              <span style={{ color: 'rgb(255, 111, 49)' }}>o</span>
              <span className="text-[#FF6F31]">nder</span>
            </div>

            {/* Tagline - Improved mobile spacing */}
            <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-12 md:mb-24 animate-fade-in-up px-2 md:px-4 leading-tight">
              Live Now. Relive Later.
            </h1>

            {/* Features - Updated to single row layout */}
            <div className="flex md:grid md:grid-cols-4 flex-row gap-2 md:gap-20 mb-12 md:mb-24 max-w-4xl mx-auto px-2 md:px-4 overflow-x-auto md:overflow-x-visible">
              {[
                { title: 'We Capture', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z\nM15 13a3 3 0 11-6 0 3 3 0 016 0z' },
                { title: 'You Connect', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
                { title: 'All Dance', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' },
                { title: 'All Memories', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' }
              ].map((feature, index) => (
                <div 
                  key={index} 
                  className="flex flex-col items-center shrink-0 w-[80px] md:w-auto transform hover:scale-110 transition-all duration-300"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  {/* Feature icon - Smaller for mobile */}
                  <div className="w-12 h-12 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center mb-2 md:mb-4 shadow-lg hover:shadow-orange-500/50 transition-shadow duration-300">
                    <svg className="w-6 h-6 md:w-10 md:h-10 text-[#FF6F31]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                    </svg>
                  </div>
                  {/* Feature title - Smaller text for mobile */}
                  <span className="text-gray-800 font-medium text-[10px] md:text-lg text-center leading-tight whitespace-nowrap">
                    {feature.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Join Button - Updated with new gradient and glow */}
            <div className="max-w-[280px] md:max-w-md mx-auto mb-10 md:mb-24 px-2 md:px-4 transform hover:scale-105 transition-all duration-300">
              <div className="relative">
                <button
                  onClick={handleJoinClick}
                  className="w-full px-6 md:px-8 py-3.5 md:py-4 rounded-full bg-gradient-to-r from-[#FF6F31] to-[rgb(255,111,49)] text-white font-semibold text-base md:text-xl 
                           transition-all duration-300 
                           shadow-[0_0_15px_rgba(255,111,49,0.4)] md:shadow-[0_0_20px_rgba(255,111,49,0.5)]
                           hover:shadow-[0_0_20px_rgba(255,111,49,0.6)] md:hover:shadow-[0_0_30px_rgba(255,111,49,0.8)]
                           relative overflow-hidden"
                >
                  <span className="relative z-10">
                    Join the Revolution
                  </span>
                  
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FF6F31] to-[hsl(16,100%,59%)] transition-opacity duration-300" />
                </button>
              </div>
            </div>

            {/* Footer - Updated text color */}
            <footer className="text-center text-gray-700 px-2 md:px-4">
              <p className="text-sm md:text-xl hover:text-gray-900 transition-colors duration-300 cursor-default leading-relaxed">
                Experience the moment. Cherish forever.
              </p>
            </footer>
          </div>
        </div>
      ) : (
        <SignIn initialFestivalCode={festivalCode} />
      )}
    </div>
  );
};

export default WelcomeScreen;
