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
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-rose-100 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl opacity-20 -top-20 -left-20 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl opacity-20 -bottom-20 -right-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {!showSignIn ? (
        <div className="w-full max-w-6xl mx-auto px-4 flex flex-col items-center relative z-10">
          {/* Main Content */}
          <div className="text-center w-full">
            {/* Updated Logo with perfectly matched colors */}
            <div className="text-9xl font-bold mb-12 transform hover:scale-105 transition-transform duration-300 cursor-default flex justify-center">
              <span className="text-purple-600">S</span>
              <span style={{ color: '#DC2626' }}>o</span>
              <span className="text-purple-600">nder</span>
            </div>

            <h1 className="text-6xl font-bold text-gray-900 mb-24 animate-fade-in-up">
              Live Now. Relive Later.
            </h1>

            {/* Features with hover effects */}
            <div className="grid grid-cols-4 gap-20 mb-24 max-w-4xl mx-auto">
              {[
                { title: 'We Capture', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z\nM15 13a3 3 0 11-6 0 3 3 0 016 0z' },
                { title: 'You Connect', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
                { title: 'All Dance', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' },
                { title: 'Memories Preserved', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' }
              ].map((feature, index) => (
                <div 
                  key={index} 
                  className="flex flex-col items-center transform hover:scale-110 transition-all duration-300"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg hover:shadow-purple-500/50 transition-shadow duration-300">
                    <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                    </svg>
                  </div>
                  <span className="text-gray-900 font-medium text-lg">{feature.title}</span>
                </div>
              ))}
            </div>

            {/* Updated Join Button */}
            <div className="max-w-md mx-auto mb-24 transform hover:scale-105 transition-all duration-300">
              <div className="relative">
                <button
                  onClick={handleJoinClick}
                  className="w-full px-8 py-4 rounded-full bg-purple-600 text-white font-semibold text-xl 
                           transition-all duration-300 
                           shadow-[0_0_20px_rgba(168,85,247,0.5)] 
                           hover:shadow-[0_0_30px_rgba(168,85,247,0.8)]
                           relative overflow-hidden"
                >
                  <span className="relative z-10">
                    Join the Revolution
                  </span>
                  
                  {/* Background gradient */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-500 transition-opacity duration-300"
                  />
                </button>
              </div>
            </div>

            {/* Footer with subtle animation */}
            <footer className="text-center text-gray-600">
              <p className="text-xl hover:text-gray-900 transition-colors duration-300 cursor-default">
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
