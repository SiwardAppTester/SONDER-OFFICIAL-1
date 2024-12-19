import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface EmailPopupProps {
  isOpen: boolean;
  closeModal: () => void;
  onSubmit: (email: string) => void;
}

export const EmailPopup: React.FC<EmailPopupProps> = ({ isOpen, closeModal, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(email);
      closeModal();
      setEmail('');
    } catch (error) {
      console.error('Error submitting email:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-[8px]" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden 
                                    bg-black/40 backdrop-blur-xl p-8 text-left align-middle transition-all
                                    rounded-2xl border border-white/10">
                <div className="relative">
                  <button
                    onClick={closeModal}
                    className="absolute -top-2 -right-2 text-white/40 hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <Dialog.Title as="div" className="text-center mb-8">
                    <h2 className="text-3xl font-light text-white/90 tracking-wide">
                      Early Access
                    </h2>
                  </Dialog.Title>

                  <form onSubmit={handleSubmit} className="mt-6">
                    <div className="relative mb-6">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="w-full px-0 py-3 bg-transparent text-white/90 placeholder-white/40 
                                 border-b border-white/20 focus:outline-none focus:border-white/60
                                 transition-colors text-lg"
                      />
                    </div>

                    <div className="flex justify-center mt-8">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-12 py-3 bg-white/10 backdrop-blur-sm hover:bg-white/15
                                 text-white/90 rounded-full transition-all duration-300
                                 disabled:opacity-50 text-sm tracking-wider
                                 transform hover:scale-[1.01] active:scale-[0.99]"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-white/80 animate-[bounce_1s_infinite_0ms]"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-white/80 animate-[bounce_1s_infinite_200ms]"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-white/80 animate-[bounce_1s_infinite_400ms]"></div>
                          </div>
                        ) : (
                          'JOIN WAITLIST'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}; 