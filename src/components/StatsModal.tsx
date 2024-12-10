import React from 'react';
import { X } from 'lucide-react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xl"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg transform transition-all duration-300 scale-100">
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-2xl" />
        
        <div className="relative bg-black/40 border border-white/10 rounded-2xl 
                      backdrop-blur-2xl shadow-[0_0_30px_rgba(0,0,0,0.3)] overflow-hidden">
          {/* Header with gradient border */}
          <div className="relative">
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="flex items-center justify-between p-6">
              <h3 className="text-xl font-['Space_Grotesk'] tracking-[0.2em] text-white/90">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white/90 transition-all duration-300
                          transform hover:rotate-90"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          
          {/* Content with styled scrollbar */}
          <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-3">
              {children}
            </div>
          </div>
        </div>

        {/* Bottom reflection */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-purple-500/5 to-transparent 
                      blur-2xl -z-10 rounded-full opacity-50" />
      </div>
    </div>
  );
};

export default StatsModal; 