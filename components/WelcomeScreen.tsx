import React, { useState, useEffect } from 'react';

const WelcomeScreen: React.FC = () => {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    // Start the fade-out animation shortly before the component is unmounted
    // This ensures a smooth transition to the main app content.
    const fadeOutTimer = setTimeout(() => {
      setFadingOut(true);
    }, 2500); // Total display time is 3000ms, fade-out starts at 2500ms

    return () => clearTimeout(fadeOutTimer);
  }, []);

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes expandWidth {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        /* Animation utility classes */
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .animate-fadeInUp {
          animation: fadeInUp 1s ease-out 0.5s forwards;
          opacity: 0; /* Start hidden */
        }
        .animate-expandWidth {
          animation: expandWidth 1.2s cubic-bezier(0.25, 1, 0.5, 1) 1s forwards;
        }
        .animate-fadeOut {
          animation: fadeOut 0.5s ease-in forwards;
        }
      `}</style>
      <div
        className={`fixed inset-0 bg-tide-dark z-50 flex flex-col justify-center items-center ${fadingOut ? 'animate-fadeOut' : 'animate-fadeIn'}`}
        aria-hidden="true"
        role="status"
      >
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-tide-gold tracking-wider animate-fadeInUp">
            Tidè Hotels and Resorts
          </h1>
          <div className="mt-4 h-1 bg-tide-gold/50 mx-auto animate-expandWidth"></div>
        </div>
      </div>
    </>
  );
};

export default WelcomeScreen;
