
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useEffect, useRef } from 'react';
import { AppState, SavedModel, LessonStep, ScreenPosition } from '../types';
import { Box, Bird, BrainCircuit, Hammer, FolderOpen, ChevronUp, FileJson, History, Play, Pause, Info, Loader2, CheckCircle2, AlertTriangle, ArrowUp } from 'lucide-react';

interface UIOverlayProps {
  voxelCount: number;
  appState: AppState;
  currentBaseModel: string;
  lessonSteps: LessonStep[];
  customBuilds: SavedModel[];
  completedSteps: Set<number>;
  shuffledOptions: number[]; // randomized indices of steps
  stepCentroids: ScreenPosition[];
  isAutoRotate: boolean;
  isInfoVisible: boolean;
  isGenerating: boolean;
  onDismantle: () => void;
  onStepClick: (index: number) => boolean; // returns success/fail
  onNewScene: (type: 'Eagle') => void;
  onSelectCustomBuild: (model: SavedModel) => void;
  onPromptCreate: () => void;
  onShowJson: () => void;
  onImportJson: () => void;
  onToggleRotation: () => void;
  onToggleInfo: () => void;
}

const LOADING_MESSAGES = [
    "Consulting AI...",
    "Extracting logic...",
    "Drafting blueprint...",
    "Assembling blocks...",
    "Ready to learn!"
];

export const UIOverlay: React.FC<UIOverlayProps> = ({
  voxelCount,
  appState,
  currentBaseModel,
  lessonSteps,
  customBuilds,
  completedSteps,
  shuffledOptions,
  stepCentroids,
  isAutoRotate,
  isInfoVisible,
  isGenerating,
  onDismantle,
  onStepClick,
  onNewScene,
  onSelectCustomBuild,
  onPromptCreate,
  onShowJson,
  onImportJson,
  onToggleRotation,
  onToggleInfo
}) => {
  const isStable = appState === AppState.STABLE;
  const isDismantling = appState === AppState.DISMANTLING;
  const isInteractive = appState === AppState.INTERACTIVE_REBUILD || appState === AppState.REJECTING;
  
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [errorIndex, setErrorIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isGenerating) {
        const interval = setInterval(() => {
            setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 800);
        return () => clearInterval(interval);
    } else {
        setLoadingMsgIndex(0);
    }
  }, [isGenerating]);

  const handleStepSelection = (index: number) => {
      if (completedSteps.has(index)) return;
      const success = onStepClick(index);
      if (!success) {
          setErrorIndex(index);
          setTimeout(() => setErrorIndex(null), 800);
      }
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none select-none font-sans overflow-hidden">
      
      {/* --- Floating Labels for 3D Layers (Built Steps) --- */}
      {stepCentroids.map((pos, idx) => {
          if (!pos.visible || !completedSteps.has(idx)) return null;
          const step = lessonSteps[idx];
          return (
              <div 
                key={`label-${idx}`}
                style={{ 
                    transform: `translate(${pos.x}px, ${pos.y}px)`,
                }}
                className="absolute z-20 pointer-events-none transition-transform duration-100 ease-out flex items-center"
              >
                  {/* Connection Line */}
                  <div className="w-8 h-0.5" style={{ backgroundColor: step.color }}></div>
                  
                  {/* Label Box */}
                  <div 
                    className="px-4 py-2 bg-white/95 border-l-4 shadow-lg rounded-r-lg flex items-center gap-3 animate-in fade-in zoom-in slide-in-from-left-4"
                    style={{ borderLeftColor: step.color }}
                  >
                      <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-white shrink-0" style={{ backgroundColor: step.color }}>
                          {idx + 1}
                      </div>
                      <span className="text-sm font-bold text-slate-800 leading-tight whitespace-nowrap">
                          {step.text}
                      </span>
                  </div>
              </div>
          );
      })}

      {/* --- Top Bar --- */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-40">
        <div className="pointer-events-auto flex flex-col gap-2">
            <DropdownMenu icon={<FolderOpen size={20} />} label="Lessons" color="indigo">
                <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Start Here</div>
                <DropdownItem onClick={onPromptCreate} icon={<BrainCircuit size={16}/>} label="New Logic Stack" highlight />
                <div className="h-px bg-slate-100 my-1" />
                <DropdownItem onClick={() => onNewScene('Eagle')} icon={<Bird size={16}/>} label="Demo: Eagle" />
                {customBuilds.length > 0 && (
                    <>
                        <div className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">History</div>
                        {customBuilds.map((model, idx) => (
                            <DropdownItem key={`build-${idx}`} onClick={() => onSelectCustomBuild(model)} icon={<History size={16}/>} label={model.name} truncate />
                        ))}
                    </>
                )}
            </DropdownMenu>

            {voxelCount > 0 && (
                <div className="flex items-center gap-3 px-4 py-2 bg-white/90 backdrop-blur-sm shadow-sm rounded-xl border border-slate-200 text-slate-500 font-bold w-fit mt-2 animate-in slide-in-from-left-4">
                    <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                        <Box size={16} strokeWidth={3} />
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-[10px] uppercase tracking-wider opacity-60">Blocks</span>
                        <span className="text-lg text-slate-800 font-extrabold font-mono">{voxelCount}</span>
                    </div>
                </div>
            )}
        </div>

        <div className="pointer-events-auto flex gap-2">
            <TactileButton onClick={onToggleInfo} color={isInfoVisible ? 'indigo' : 'slate'} icon={<Info size={18} strokeWidth={2.5} />} label="Help" compact />
            <TactileButton onClick={onToggleRotation} color={isAutoRotate ? 'sky' : 'slate'} icon={isAutoRotate ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />} label={isAutoRotate ? "Pause" : "Play"} compact />
            <TactileButton onClick={onShowJson} color="slate" icon={<FileJson size={18} strokeWidth={2.5} />} label="Share" />
        </div>
      </div>

      {/* --- Concept Cards (Bottom) --- */}
      {(isDismantling || isInteractive) && lessonSteps.length > 0 && (
          <div className="absolute bottom-0 left-0 w-full p-4 z-30 pointer-events-auto flex flex-col items-center justify-end pb-8 bg-gradient-to-t from-slate-900/40 via-slate-900/10 to-transparent">
              
              {completedSteps.size < lessonSteps.length && (
                  <div className="bg-white/90 backdrop-blur px-6 py-2 rounded-full border border-indigo-100 shadow-xl text-center mb-4 animate-in slide-in-from-bottom-5">
                       <p className="text-xs text-slate-600 font-extrabold uppercase tracking-widest flex items-center gap-2">
                           <ArrowUp size={14} className="animate-bounce" />
                           Stack the logic (Bottom Up)
                       </p>
                  </div>
              )}

              <div className="flex flex-wrap justify-center items-end gap-3 max-w-6xl">
                  {shuffledOptions.map((stepIndex) => {
                      if (completedSteps.has(stepIndex)) return null; 

                      const step = lessonSteps[stepIndex];
                      const isError = errorIndex === stepIndex;
                      
                      return (
                          <button 
                            key={`opt-${stepIndex}`}
                            onClick={() => handleStepSelection(stepIndex)}
                            className={`
                                group relative w-48 h-28 rounded-xl border-b-[6px] text-left transition-all duration-150 active:border-b-0 active:translate-y-[6px]
                                ${isError ? 'animate-shake bg-rose-500 border-rose-700 text-white' : 'hover:-translate-y-2 hover:shadow-2xl border-black/20'}
                            `}
                            style={{ 
                                backgroundColor: isError ? undefined : step.color,
                                color: 'white'
                            }}
                          >
                              {/* Connector Line (Visual cue when hovering) */}
                              <div className="absolute -top-32 left-1/2 w-0.5 h-32 bg-white/0 group-hover:bg-white/60 transition-colors duration-300 pointer-events-none"></div>

                              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                                <div className="flex justify-between items-start opacity-60">
                                    <Box size={20} strokeWidth={2.5} />
                                    <span className="text-[10px] uppercase font-bold tracking-wider">Logic Block</span>
                                </div>
                                
                                <div className="flex items-center justify-center h-full">
                                    {isError ? (
                                        <div className="flex flex-col items-center">
                                            <AlertTriangle size={28} />
                                            <span className="text-[10px] uppercase font-bold mt-1">Wrong Step</span>
                                        </div>
                                    ) : (
                                        <span className="text-sm font-black text-center leading-tight drop-shadow-md">
                                            {step.text}
                                        </span>
                                    )}
                                </div>
                              </div>
                          </button>
                      )
                  })}
              </div>
          </div>
      )}

      {/* --- Loading --- */}
      {isGenerating && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in fade-in zoom-in duration-300">
              <div className="bg-white/90 backdrop-blur-md border-2 border-indigo-100 px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 min-w-[280px]">
                  <Loader2 size={48} className="text-indigo-500 animate-spin" />
                  <div className="text-center">
                      <h3 className="text-lg font-extrabold text-slate-800">Thinking...</h3>
                      <p className="text-slate-500 font-bold text-sm transition-all duration-300">
                          {LOADING_MESSAGES[loadingMsgIndex]}
                      </p>
                  </div>
              </div>
          </div>
      )}

      {/* --- Dismantle Button --- */}
      <div className="absolute bottom-8 left-0 w-full flex justify-center items-end pointer-events-none z-20">
        <div className="pointer-events-auto transition-all duration-500 ease-in-out transform">
            {isStable && lessonSteps.length > 0 && (
                 <div className="animate-in slide-in-from-bottom-10 fade-in duration-300 flex flex-col items-center gap-2">
                     <BigActionButton onClick={onDismantle} icon={<Hammer size={32} strokeWidth={2.5} />} label="DECONSTRUCT" color="rose" />
                 </div>
            )}
            
            {/* Victory State */}
            {(isInteractive || isDismantling) && completedSteps.size === lessonSteps.length && lessonSteps.length > 0 && (
                <div className="animate-in zoom-in spin-in-1 mb-20">
                    <div className="bg-emerald-500 text-white px-8 py-4 rounded-full font-black text-xl shadow-lg flex items-center gap-2 border-b-4 border-emerald-700">
                        <CheckCircle2 size={24} />
                        Logic Stack Complete!
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

// --- Components ---

interface TactileButtonProps {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  color: 'slate' | 'rose' | 'sky' | 'emerald' | 'amber' | 'indigo';
  compact?: boolean;
}

const TactileButton: React.FC<TactileButtonProps> = ({ onClick, disabled, icon, label, color, compact }) => {
  const colorStyles = {
    slate:   'bg-slate-200 text-slate-600 shadow-slate-300 hover:bg-slate-300',
    rose:    'bg-rose-500 text-white shadow-rose-700 hover:bg-rose-600',
    sky:     'bg-sky-500 text-white shadow-sky-700 hover:bg-sky-600',
    emerald: 'bg-emerald-500 text-white shadow-emerald-700 hover:bg-emerald-600',
    amber:   'bg-amber-400 text-amber-900 shadow-amber-600 hover:bg-amber-500',
    indigo:  'bg-indigo-500 text-white shadow-indigo-700 hover:bg-indigo-600',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative flex items-center justify-center gap-2 rounded-xl font-bold text-sm transition-all duration-100
        border-b-[4px] active:border-b-0 active:translate-y-[4px]
        ${compact ? 'p-2.5' : 'px-4 py-3'}
        ${disabled ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed shadow-none' : `${colorStyles[color]} border-black/20 shadow-lg`}
      `}
    >
      {icon}
      {!compact && <span>{label}</span>}
    </button>
  );
};

const BigActionButton: React.FC<{onClick: () => void, icon: React.ReactNode, label: string, color: 'rose' | 'emerald'}> = ({ onClick, icon, label, color }) => {
    const bg = color === 'rose' ? 'bg-rose-500 hover:bg-rose-600 border-rose-800 shadow-rose-900/30' : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-800 shadow-emerald-900/30';
    return (
        <button 
            onClick={onClick}
            className={`group relative flex flex-col items-center justify-center w-32 h-32 rounded-3xl text-white shadow-xl border-b-[8px] active:border-b-0 active:translate-y-[8px] transition-all duration-150 ${bg}`}
        >
            <div className="mb-2">{icon}</div>
            <div className="text-sm font-black tracking-wider">{label}</div>
        </button>
    )
}

interface DropdownProps {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
    color: 'indigo' | 'emerald';
}

const DropdownMenu: React.FC<DropdownProps> = ({ icon, label, children, color }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const bgClass = color === 'indigo' ? 'bg-indigo-500 hover:bg-indigo-600 border-indigo-800' : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-800';

    return (
        <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 font-bold text-white shadow-lg rounded-2xl transition-all active:scale-95
                    ${bgClass}
                    px-4 py-3 text-sm border-b-[4px] active:border-b-0 active:translate-y-[4px]
                `}
            >
                {icon}
                {label}
                <ChevronUp size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className={`
                    absolute left-0 top-full mt-3
                    w-64 max-h-[60vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border-2 border-slate-100 p-2 flex flex-col gap-1 animate-in fade-in zoom-in duration-200 z-50
                `}>
                    {children}
                </div>
            )}
        </div>
    )
}

const DropdownItem: React.FC<{ onClick: () => void, icon: React.ReactNode, label: string, highlight?: boolean, truncate?: boolean }> = ({ onClick, icon, label, highlight, truncate }) => {
    return (
        <button 
            onClick={onClick}
            className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-colors text-left
                ${highlight ? 'bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-600 hover:from-indigo-100 hover:to-violet-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
            `}
        >
            <div className="shrink-0">{icon}</div>
            <span className={truncate ? "truncate w-full" : ""}>{label}</span>
        </button>
    )
}
