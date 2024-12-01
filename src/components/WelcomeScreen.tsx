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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex flex-col justify-center items-center relative overflow-hidden">
      {/* Dynamic background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[60rem] h-[60rem] bg-gradient-to-r from-orange-500/20 to-purple-500/20 rounded-full blur-[150px] opacity-30 top-[-20rem] left-[-20rem] animate-pulse"></div>
        <div className="absolute w-[60rem] h-[60rem] bg-gradient-to-l from-sky-500/20 to-indigo-500/20 rounded-full blur-[150px] opacity-30 bottom-[-20rem] right-[-20rem] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Main content with new layout */}
      {!showSignIn ? (
        <div className="w-full h-screen flex flex-col md:flex-row items-center justify-center relative z-10 px-4">
          {/* Left side - Branding */}
          <div className="md:w-1/2 text-left md:pl-12 lg:pl-24 mb-12 md:mb-0">
            {/* Logo with enhanced neon effect */}
            <div className="text-7xl md:text-8xl lg:text-9xl font-bold mb-6 transform hover:scale-105 transition-all duration-500 cursor-default">
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#FF6F31] to-orange-500 
                           drop-shadow-[0_0_15px_rgba(255,111,49,0.5)]">
                Sonder
              </span>
            </div>

            {/* Tagline with dynamic gradient */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-clip-text text-transparent 
                        bg-gradient-to-r from-white via-gray-200 to-gray-400 
                        animate-fade-in-up leading-tight mb-8">
              Live Now.<br />Relive Later.
            </h1>

            {/* Description with glowing effect */}
            <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-xl
                       hover:text-gray-300 transition-all duration-300">
              Capture every beat, every moment, every memory. Join the next generation of festival experiences.
            </p>

            {/* CTA Button with enhanced glow */}
            <button
              onClick={handleJoinClick}
              className="group relative px-8 py-4 text-xl font-bold text-white
                       bg-gradient-to-r from-[#FF6F31] to-sky-400
                       rounded-full overflow-hidden transition-all duration-500
                       hover:shadow-[0_0_30px_rgba(255,111,49,0.4)]
                       hover:scale-105"
            >
              <span className="relative z-10 flex items-center gap-2">
                Join the Revolution
                <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform duration-300" 
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#FF6F31] to-sky-400 opacity-90" />
            </button>
          </div>

          {/* Right side - Feature Icons in a vertical layout */}
          <div className="md:w-1/2 flex flex-col gap-8 md:pl-12">
            {[
              { title: 'We Capture', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z\nM15 13a3 3 0 11-6 0 3 3 0 016 0z' },
              { title: 'You Connect', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
              { title: 'All Dance', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' },
              { title: 'All Memories', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' }
            ].map((feature, index) => (
              <div 
                key={index}
                className="group flex items-center gap-6 transform hover:translate-x-2 transition-all duration-300"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="w-16 h-16 bg-black/50 backdrop-blur-xl rounded-2xl flex items-center justify-center
                             border border-white/10 shadow-lg transition-all duration-300
                             group-hover:shadow-[0_0_20px_rgba(255,111,49,0.3)]
                             group-hover:border-orange-500/30">
                  <svg 
                    className={`w-8 h-8 ${
                      index % 2 === 0 
                        ? 'text-[#FF6F31] drop-shadow-[0_0_8px_rgba(255,111,49,0.5)]' 
                        : 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]'
                    }`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                  </svg>
                </div>
                <span className="text-xl font-medium text-white/80 group-hover:text-white transition-colors duration-300">
                  {feature.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <SignIn initialFestivalCode={festivalCode} />
      )}
    </div>
  );
};

export default WelcomeScreen;
