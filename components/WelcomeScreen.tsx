
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React from 'react';

interface WelcomeScreenProps {
  visible: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ visible }) => {
  return (
    <div className={`
        absolute top-24 left-0 w-full pointer-events-none flex justify-center z-10 select-none
        transition-all duration-500 ease-out transform font-sans
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}
    `}>
      <div className="text-center flex flex-col items-center gap-4 bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-indigo-100 shadow-xl max-w-lg">
        <div>
            <h1 className="text-4xl font-black text-slate-800 uppercase tracking-widest mb-2">
                Concept Stack
            </h1>
            <div className="text-sm font-extrabold text-indigo-600 uppercase tracking-[0.3em] bg-indigo-50 py-1 px-3 rounded-full inline-block">
                Powered by Gemini 3
            </div>
        </div>
        
        <div className="space-y-3 mt-2 text-slate-600 font-medium">
            <p className="flex items-center justify-center gap-2">
                <span className="font-bold text-slate-800">1. Generate:</span> 
                Create a 3D Logic Model from any topic.
            </p>
            <p className="flex items-center justify-center gap-2">
                <span className="font-bold text-slate-800">2. Deconstruct:</span> 
                Scatter the logic into puzzle pieces.
            </p>
            <p className="flex items-center justify-center gap-2">
                <span className="font-bold text-slate-800">3. Solve:</span> 
                Pick the correct concept blocks to rebuild!
            </p>
        </div>
      </div>
    </div>
  );
};
