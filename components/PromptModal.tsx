
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Loader2, BrainCircuit, Image as ImageIcon, FileText, Upload } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string, imageBase64?: string) => Promise<void>;
}

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setSelectedImage(null);
      setError('');
      setIsLoading(false);
      setMode('text');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 5 * 1024 * 1024) {
              setError("Image size too large (max 5MB)");
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              setSelectedImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isLoading) return;
    
    if (mode === 'text' && !prompt.trim()) {
        setError("Please enter a topic.");
        return;
    }
    if (mode === 'image' && !selectedImage) {
        setError("Please upload an image of the problem.");
        return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // If image mode, we might pass a default prompt if the user didn't type one
      const finalPrompt = prompt.trim() || (mode === 'image' ? "Solve this problem step-by-step" : "");
      
      await onSubmit(finalPrompt, selectedImage || undefined);
      
      setPrompt('');
      setSelectedImage(null);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to generate lesson. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col border-4 border-indigo-100 animate-in fade-in zoom-in duration-200 scale-95 sm:scale-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-indigo-50 bg-gradient-to-r from-indigo-50 to-violet-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                <BrainCircuit size={24} strokeWidth={2.5} />
            </div>
            <div>
                <h2 className="text-xl font-extrabold text-slate-800">
                    New Lesson
                </h2>
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-400">
                    CONCEPT STACK
                </p>
            </div>
          </div>
          <button 
            onClick={!isLoading ? onClose : undefined}
            className="p-2 rounded-xl bg-white/50 text-slate-400 hover:bg-white hover:text-slate-700 transition-colors disabled:opacity-50"
            disabled={isLoading}
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 gap-2 bg-slate-50 border-b border-slate-100">
            <button 
                onClick={() => setMode('text')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'text' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:bg-slate-100'}`}
            >
                <FileText size={16} />
                Text Topic
            </button>
            <button 
                onClick={() => setMode('image')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'image' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' : 'text-slate-400 hover:bg-slate-100'}`}
            >
                <ImageIcon size={16} />
                Image Problem
            </button>
        </div>

        {/* Body */}
        <div className="p-6 bg-white">
          <form onSubmit={handleSubmit}>
            
            {mode === 'text' ? (
                <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">What do you want to learn?</label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g. How to solve quadratic equations, Steps of the scientific method, Conjugating French verbs..."
                        disabled={isLoading}
                        className="w-full h-32 resize-none bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-medium text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-slate-400"
                        autoFocus
                    />
                </div>
            ) : (
                <div className="space-y-4">
                     <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Upload a photo of a problem</label>
                     <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            w-full h-48 border-4 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all
                            ${selectedImage ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'}
                        `}
                     >
                        {selectedImage ? (
                            <img src={selectedImage} alt="Preview" className="h-full w-full object-contain rounded-lg p-2" />
                        ) : (
                            <>
                                <Upload size={32} className="text-slate-300" />
                                <span className="text-slate-400 font-bold text-sm">Click to upload image</span>
                            </>
                        )}
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden"
                            onChange={handleFileChange}
                        />
                     </div>
                     <input 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Optional: Add context (e.g., 'Solve for x')"
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-400"
                     />
                </div>
            )}

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 text-rose-600 text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
                <X size={16} /> {error}
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button 
                type="submit"
                disabled={isLoading}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm transition-all
                  ${isLoading 
                    ? 'bg-slate-200 text-slate-400 cursor-wait' 
                    : 'bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/30 active:scale-95'}
                `}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} fill="currentColor" />
                    Create Stack
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
