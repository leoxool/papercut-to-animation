import React from 'react';

const LoadingScreen = ({ progress }) => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900 text-white">
            <div className="text-center relative">
                <div className="absolute -inset-10 bg-blue-500/20 blur-3xl rounded-full opacity-50 animate-pulse-slow"></div>
                <h1 className="text-5xl font-serif tracking-[0.2em] mb-4 text-gray-100 relative z-10">PaperCut to Animation</h1>
                <p className="text-xs text-blue-300 font-mono tracking-widest mb-16 opacity-80">bulesky sunshine happyness  v3.2</p>
                
                <div className="w-80 h-[2px] bg-slate-800 rounded-full overflow-hidden mx-auto relative">
                    <div 
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] transition-all duration-300 ease-out" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                
                <div className="mt-4 flex justify-between items-center w-80 mx-auto text-[10px] text-slate-500 font-mono">
                    <span>INITIALIZING</span>
                    <span>{progress}%</span>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;