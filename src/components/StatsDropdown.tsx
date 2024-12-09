import React from 'react';

interface StatsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  items: Array<{
    id: string;
    name: string;
    photoURL?: string;
  }>;
  title: string;
}

const StatsDropdown: React.FC<StatsDropdownProps> = ({ isOpen, onClose, items, title }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md max-h-[80vh] m-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-white/90 font-['Space_Grotesk'] tracking-wider text-lg text-center">
              {title}
            </h3>
          </div>
          
          {/* Content */}
          <div className="overflow-y-auto max-h-[60vh]">
            {items.length === 0 ? (
              <div className="p-4 text-center text-white/60">
                No {title.toLowerCase()} yet
              </div>
            ) : (
              <div className="p-2">
                {items.map(item => (
                  <div 
                    key={item.id} 
                    className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    {item.photoURL ? (
                      <img 
                        src={item.photoURL} 
                        alt={item.name} 
                        className="w-10 h-10 rounded-lg object-cover border border-white/10" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                        <span className="text-white/80">{item.name[0]}</span>
                      </div>
                    )}
                    <span className="text-white/90 font-['Space_Grotesk']">{item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsDropdown; 