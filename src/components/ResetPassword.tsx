import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '../firebase';
import { Canvas } from '@react-three/fiber';
import { Loader, InnerSphere } from './ThreeBackground';

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password should be at least 6 characters long');
      return;
    }

    try {
      const oobCode = new URLSearchParams(location.search).get('oobCode');
      
      if (!oobCode) {
        setError('Invalid password reset link');
        return;
      }

      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
      
      // Redirect to sign in page after 3 seconds
      setTimeout(() => {
        navigate('/signin', { 
          state: { 
            verificationSuccess: true, 
            message: 'Password reset successful! Please sign in with your new password.' 
          }
        });
      }, 3000);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setError(error.message || 'Failed to reset password. Please try again.');
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Three.js Background */}
      <div className="absolute inset-0">
        <Canvas className="w-full h-full" gl={{ antialias: true, alpha: true }}>
          <Suspense fallback={<Loader />}>
            <InnerSphere />
          </Suspense>
        </Canvas>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center items-center">
        <div className="w-full max-w-md mx-auto px-4">
          {/* Logo */}
          <div className="text-[50px] md:text-[100px] font-[500] mb-8 tracking-[0.12em]
                        text-white/95 font-['Outfit']
                        drop-shadow-[0_0_30px_rgba(255,255,255,0.25)]">
            SONDER
          </div>

          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20">
            {!success ? (
              <>
                <h2 className="text-2xl font-['Space_Grotesk'] text-white/90 mb-6">
                  Reset Your Password
                </h2>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New Password"
                      className="w-full p-3 rounded-lg bg-white/10 border border-white/20 
                               text-white placeholder-white/50 font-['Space_Grotesk']
                               focus:outline-none focus:ring-2 focus:ring-white/30"
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password"
                      className="w-full p-3 rounded-lg bg-white/10 border border-white/20 
                               text-white placeholder-white/50 font-['Space_Grotesk']
                               focus:outline-none focus:ring-2 focus:ring-white/30"
                      required
                      minLength={6}
                    />
                  </div>

                  {error && (
                    <p className="text-red-400 text-sm text-center font-['Space_Grotesk']">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-white/10 text-white rounded-lg
                             hover:bg-white/20 transition-all font-['Space_Grotesk']
                             border border-white/20"
                  >
                    Reset Password
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center">
                <h2 className="text-2xl font-['Space_Grotesk'] text-white/90 mb-4">
                  Password Reset Successful!
                </h2>
                <p className="text-white/70 font-['Space_Grotesk']">
                  Redirecting you to sign in...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword; 