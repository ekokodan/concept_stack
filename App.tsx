
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useEffect, useRef, useState } from 'react';
import { VoxelEngine } from './services/VoxelEngine';
import { UIOverlay } from './components/UIOverlay';
import { JsonModal } from './components/JsonModal';
import { PromptModal } from './components/PromptModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Generators, Templates } from './utils/voxelGenerators';
import { AppState, VoxelData, SavedModel, LessonStep, ScreenPosition } from './types';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VoxelEngine | null>(null);
  
  const [appState, setAppState] = useState<AppState>(AppState.STABLE);
  const [voxelCount, setVoxelCount] = useState<number>(0);
  
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonModalMode, setJsonModalMode] = useState<'view' | 'import'>('view');
  
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  
  const [showWelcome, setShowWelcome] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [jsonData, setJsonData] = useState('');
  const [isAutoRotate, setIsAutoRotate] = useState(true);

  // --- State for Custom Models & Lessons ---
  const [currentBaseModel, setCurrentBaseModel] = useState<string>('Eagle');
  const [lessonSteps, setLessonSteps] = useState<LessonStep[]>([]);
  
  // Game State
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [shuffledOptions, setShuffledOptions] = useState<number[]>([]);
  const [stepCentroids, setStepCentroids] = useState<ScreenPosition[]>([]);

  const [customBuilds, setCustomBuilds] = useState<SavedModel[]>([]);

  // 1. Initialize 3D Engine (RUNS ONCE)
  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Engine
    const engine = new VoxelEngine(
      containerRef.current,
      (newState) => setAppState(newState),
      (count) => setVoxelCount(count)
    );

    engineRef.current = engine;

    // Initial Model Load
    engine.loadInitialModel(Generators.Eagle());

    // Resize Listener
    const handleResize = () => engine.handleResize();
    window.addEventListener('resize', handleResize);

    // Auto-hide welcome screen after interaction
    const timer = setTimeout(() => setShowWelcome(false), 5000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
      engine.cleanup();
    };
  }, []); // Empty dependency array = run once on mount

  // 2. Track Centroids (RUNS WHEN LESSON CHANGES)
  useEffect(() => {
    if (lessonSteps.length === 0) {
        setStepCentroids([]);
        return;
    }

    const interval = setInterval(() => {
       if (engineRef.current) {
           const centroids = engineRef.current.getStepCentroids(lessonSteps.length);
           setStepCentroids(centroids);
       }
    }, 30);

    return () => clearInterval(interval);
  }, [lessonSteps]); // Re-run only when the lesson structure changes

  const handleDismantle = () => {
    if (engineRef.current) {
        engineRef.current.dismantle();
        // Prepare for interactive rebuild
        setCurrentStepIndex(0);
        setCompletedSteps(new Set());
        // Shuffle the available steps so the user has to THINK about the order
        const indices = lessonSteps.map((_, i) => i);
        setShuffledOptions(indices.sort(() => Math.random() - 0.5));
    }
  };

  const handleNewScene = (type: 'Eagle') => {
    const generator = Generators[type];
    if (generator && engineRef.current) {
      engineRef.current.loadInitialModel(generator());
      setCurrentBaseModel('Eagle');
      setLessonSteps([]); 
      setCompletedSteps(new Set());
      setShuffledOptions([]);
    }
  };

  const handleSelectCustomBuild = (model: SavedModel) => {
      if (engineRef.current) {
          engineRef.current.loadInitialModel(model.data);
          setCurrentBaseModel(model.name);
          setLessonSteps(model.steps || []);
          setCompletedSteps(new Set());
          if (model.steps) {
              // If it's a lesson, immediately show full state
              setCompletedSteps(new Set(model.steps.map((_, i) => i)));
              setCurrentStepIndex(model.steps.length);
          }
      }
  };

  const handleStepClick = (clickedIndex: number) => {
      if (completedSteps.has(clickedIndex)) return true;

      // Strict Bottom-Up Logic
      if (clickedIndex === currentStepIndex) {
          // Correct!
          if (engineRef.current) {
              // Ensure we wake up the physics
              engineRef.current.rebuildLayer(clickedIndex);
          }
          
          setCompletedSteps(prev => new Set(prev).add(clickedIndex));
          const nextIndex = currentStepIndex + 1;
          setCurrentStepIndex(nextIndex);
          return true; // Success
      } else {
          // Wrong step! 
          if (engineRef.current) {
              engineRef.current.rejectLayer(clickedIndex);
          }
          return false; // Failure
      }
  };

  const handleShowJson = () => {
    if (engineRef.current) {
      setJsonData(engineRef.current.getJsonData());
      setJsonModalMode('view');
      setIsJsonModalOpen(true);
    }
  };

  const handleImportClick = () => {
      setJsonModalMode('import');
      setIsJsonModalOpen(true);
  };

  const handleJsonImport = (jsonStr: string) => {
      try {
          const rawData = JSON.parse(jsonStr);
          if (!Array.isArray(rawData)) throw new Error("JSON must be an array");

          const voxelData: VoxelData[] = rawData.map((v: any) => {
              let colorVal = v.c || v.color;
              let colorInt = 0xCCCCCC;

              if (typeof colorVal === 'string') {
                  if (colorVal.startsWith('#')) colorVal = colorVal.substring(1);
                  colorInt = parseInt(colorVal, 16);
              } else if (typeof colorVal === 'number') {
                  colorInt = colorVal;
              }

              return {
                  x: Number(v.x) || 0,
                  y: Number(v.y) || 0,
                  z: Number(v.z) || 0,
                  color: isNaN(colorInt) ? 0xCCCCCC : colorInt,
                  stepIndex: v.stepIndex !== undefined ? Number(v.stepIndex) : -1
              };
          });
          
          if (engineRef.current) {
              engineRef.current.loadInitialModel(voxelData);
              setCurrentBaseModel('Imported Build');
              setLessonSteps([]);
              setCompletedSteps(new Set());
              setShuffledOptions([]);
          }
      } catch (e) {
          console.error("Failed to import JSON", e);
          alert("Failed to import JSON. Please ensure the format is correct.");
      }
  };

  const openPrompt = () => {
      setIsPromptModalOpen(true);
  }
  
  const handleToggleRotation = () => {
      const newState = !isAutoRotate;
      setIsAutoRotate(newState);
      if (engineRef.current) {
          engineRef.current.setAutoRotate(newState);
      }
  }

  // --- AI GENERATION HANDLER ---
  
  // Helper to extract JSON from messy text
  const findJsonPayload = (text: string) => {
    try {
        // 1. Try strict parse first
        return JSON.parse(text);
    } catch (e) {
        // 2. Scan for valid JSON object structure
        let startIndex = text.indexOf('{');
        if (startIndex === -1) return null;
        
        let braceCount = 0;
        let endIndex = -1;
        
        for (let i = startIndex; i < text.length; i++) {
            if (text[i] === '{') braceCount++;
            else if (text[i] === '}') braceCount--;
            
            if (braceCount === 0) {
                endIndex = i;
                break;
            }
        }
        
        if (endIndex !== -1) {
            const jsonStr = text.substring(startIndex, endIndex + 1);
            try {
                return JSON.parse(jsonStr);
            } catch (e2) {
                return null;
            }
        }
        return null;
    }
  };

  const handlePromptSubmit = async (prompt: string, imageBase64?: string) => {
    setIsGenerating(true);
    setIsPromptModalOpen(false);

    try {
        if (!process.env.API_KEY) throw new Error("Missing API Key");

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        // Use Flash for speed
        const modelName = 'gemini-2.5-flash';

        const parts: any[] = [];
        if (imageBase64) {
            const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
            parts.push({ inlineData: { mimeType: 'image/png', data: cleanBase64 } });
        }
        
        const systemPrompt = `
            You are "Concept Stack", an educational AI.
            Your goal is to break down the user's topic into 3 to 7 SEQUENTIAL LOGICAL STEPS.
            
            OUTPUT RULES:
            - Return ONLY valid JSON.
            - NO markdown code blocks.
            - Format: { "steps": [{ "text": "Step 1", "color": "#HEX" }] }
            - Steps must be short (max 6 words).
            - Use distinct, vibrant colors.
        `;

        parts.push({
            text: `
                ${systemPrompt}
                USER TOPIC: "${prompt}"
            `
        });

        console.log("Sending request to AI...");
        const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: { responseMimeType: "application/json" }
        });

        const resultText = response.text;
        console.log("AI Raw Response:", resultText);

        const parsedData = findJsonPayload(resultText);

        if (!parsedData || !parsedData.steps || !Array.isArray(parsedData.steps)) {
            throw new Error("Invalid JSON structure received from AI.");
        }

        const steps = parsedData.steps.map((s: any, i: number) => ({
            text: s.text || `Step ${i + 1}`,
            color: s.color || "#3498DB"
        }));

        loadLessonFromSteps(steps, prompt);

    } catch (err: any) {
        console.error("Generation failed:", err);
        
        // --- GUARANTEED FALLBACK ---
        // If anything fails, load a fallback so the user doesn't see the Eagle.
        const fallbackSteps = [
            { text: "Define Problem", color: "#E74C3C" },
            { text: "Gather Info", color: "#E67E22" },
            { text: "Formulate Plan", color: "#F1C40F" },
            { text: "Execute", color: "#2ECC71" },
            { text: "Review", color: "#3498DB" }
        ];
        
        // Show a discrete toast or alert but ENSURE the model changes
        const errorMsg = err.message || "Unknown error";
        alert(`AI Error (${errorMsg}). Loading fallback lesson.`);
        
        loadLessonFromSteps(fallbackSteps, prompt + " (Fallback)");
    } finally {
        setIsGenerating(false);
    }
  };

  const loadLessonFromSteps = (steps: LessonStep[], title: string) => {
      try {
        const styleKeys = ['Pyramid', 'Tower', 'Spiral'] as const;
        const randomStyle = styleKeys[Math.floor(Math.random() * styleKeys.length)];
        
        // Ensure Template exists
        const templateFn = Templates[randomStyle] || Templates.Tower;
        
        console.log(`Generating ${randomStyle} with ${steps.length} steps`);
        const voxelData = templateFn(steps);
        
        if (engineRef.current) {
            engineRef.current.loadInitialModel(voxelData);
            setLessonSteps(steps);
            setCompletedSteps(new Set(steps.map((_, i) => i)));
            setCurrentStepIndex(steps.length);
            setShuffledOptions([]);
            
            const cleanTitle = title.length > 25 ? title.substring(0, 25) + "..." : title;
            setCustomBuilds(prev => [...prev, { name: cleanTitle, data: voxelData, steps }]);
            setCurrentBaseModel(cleanTitle);
        }
      } catch (e) {
          console.error("Error in loadLessonFromSteps:", e);
      }
  };

  return (
    <div className="relative w-full h-screen bg-[#f0f2f5] overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 z-0" />
      
      <UIOverlay 
        voxelCount={voxelCount}
        appState={appState}
        currentBaseModel={currentBaseModel}
        lessonSteps={lessonSteps}
        customBuilds={customBuilds}
        completedSteps={completedSteps}
        shuffledOptions={shuffledOptions}
        stepCentroids={stepCentroids}
        isAutoRotate={isAutoRotate}
        isInfoVisible={showWelcome}
        isGenerating={isGenerating}
        onDismantle={handleDismantle}
        onStepClick={handleStepClick}
        onNewScene={handleNewScene}
        onSelectCustomBuild={handleSelectCustomBuild}
        onPromptCreate={openPrompt}
        onShowJson={handleShowJson}
        onImportJson={handleImportClick}
        onToggleRotation={handleToggleRotation}
        onToggleInfo={() => setShowWelcome(!showWelcome)}
      />

      <WelcomeScreen visible={showWelcome} />

      <JsonModal 
        isOpen={isJsonModalOpen}
        onClose={() => setIsJsonModalOpen(false)}
        data={jsonData}
        isImport={jsonModalMode === 'import'}
        onImport={handleJsonImport}
      />

      <PromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        onSubmit={handlePromptSubmit}
      />
    </div>
  );
};

export default App;
