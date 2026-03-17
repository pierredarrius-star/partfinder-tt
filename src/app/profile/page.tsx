"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import Vapi from "@vapi-ai/web";

export default function Profile() {
  const [manualUploaded, setManualUploaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'active' | 'ending'>('idle');
  const [transcript, setTranscript] = useState<string[]>([]);
  const vapiRef = useRef<Vapi | null>(null);

  // Mock upload handler for the MVP
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      // Simulate network request
      setTimeout(() => {
        setIsUploading(false);
        setManualUploaded(true);
      }, 2000);
    }
  };

  // Initialize Vapi
  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (publicKey) {
      vapiRef.current = new Vapi(publicKey);

      vapiRef.current.on('call-start', () => {
        setCallStatus('active');
        setTranscript(prev => [...prev, '🤖 Call connected...']);
      });

      vapiRef.current.on('call-end', () => {
        setCallStatus('idle');
        setTranscript(prev => [...prev, '📞 Call ended.']);
      });

      vapiRef.current.on('message', (message: any) => {
        if (message.type === 'transcript' && message.transcriptType === 'final') {
          const prefix = message.role === 'assistant' ? '🤖' : '👤';
          setTranscript(prev => [...prev, `${prefix} ${message.transcript}`]);
        }
      });

      vapiRef.current.on('error', (error: any) => {
        console.error('Vapi error:', error);
        setCallStatus('idle');
        setTranscript(prev => [...prev, `❌ Error: ${error?.message || 'Connection failed'}`]);
      });
    }

    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, []);

  const startCall = async () => {
    if (!vapiRef.current) {
      alert('Voice system not initialized. Check your API key.');
      return;
    }

    setCallStatus('connecting');
    setTranscript(['🔄 Connecting to Partfinder AI Agent...']);

    try {
      const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || '2069d78b-14a8-4275-8341-ea5424b0538b';
      await vapiRef.current.start(assistantId);
    } catch (error: any) {
      console.error('Failed to start call:', error);
      setCallStatus('idle');
      setTranscript(prev => [...prev, `❌ Failed to connect: ${error?.message || 'Unknown error'}`]);
    }
  };

  const endCall = () => {
    if (vapiRef.current) {
      vapiRef.current.stop();
      setCallStatus('ending');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen relative">
      <header className="pt-safe bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
        <div className="w-8"></div>
        <h1 className="text-base font-semibold text-slate-800">Your Vehicle Profile</h1>
        <div className="w-8"></div>
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto pb-24 z-0">
        {/* AI Voice Tester (Vapi-Powered) */}
        <div className="bg-brand-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden mb-6">
          <div className="relative z-10">
            <h2 className="text-xl font-bold mb-2">🎙️ Talk to Partfinder AI</h2>
            <p className="text-brand-100 text-sm mb-4 leading-relaxed">
              {callStatus === 'idle' 
                ? "Click below to start a voice conversation with the AI agent — right in your browser!" 
                : callStatus === 'connecting' 
                ? "Connecting..."
                : "AI Agent is listening. Speak naturally!"}
            </p>
            
            {callStatus === 'idle' ? (
              <button 
                onClick={startCall}
                className="w-full bg-white text-brand-600 font-bold py-3 rounded-xl hover:bg-brand-50 transition-all shadow-md active:scale-95"
              >
                Start Voice Call 🎤
              </button>
            ) : (
              <button 
                onClick={endCall}
                className="w-full bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition-all shadow-md active:scale-95 animate-pulse"
              >
                {callStatus === 'connecting' ? '⏳ Connecting...' : '🔴 End Call'}
              </button>
            )}

            {/* Live Transcript */}
            {transcript.length > 0 && (
              <div className="mt-4 bg-black/20 rounded-xl p-3 max-h-40 overflow-y-auto">
                {transcript.map((line, i) => (
                  <p key={i} className="text-xs text-white/90 mb-1 font-mono">{line}</p>
                ))}
              </div>
            )}
          </div>
          <div className="absolute -right-4 -bottom-4 text-white/10">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-2">My Garage</h2>
        <p className="text-sm text-slate-500 mb-6">Manage your vehicles for faster and more accurate AI part searches.</p>

        {/* Vehicle Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-800">2012 Nissan Tiida</h3>
                <p className="text-xs text-slate-500">1.5L HR15DE Engine</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Owner's Manual / Service Guide</h4>
            
            {manualUploaded ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <svg className="text-green-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  <div>
                    <p className="text-sm font-semibold text-green-800">Tiida_Service_Manual.pdf</p>
                    <p className="text-xs text-green-600">AI Context Active</p>
                  </div>
                </div>
                <button 
                  onClick={() => setManualUploaded(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors p-2"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-500 mb-3">Upload your vehicle's manual. Our AI will read it to find the exact OEM part numbers when contacting stores.</p>
                <label className={`w-full flex-col flex items-center justify-center h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${isUploading ? 'border-brand-300 bg-brand-50' : 'border-slate-300 hover:border-brand-500 hover:bg-slate-50'}`}>
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <svg className="animate-spin h-6 w-6 text-brand-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span className="text-xs font-semibold text-brand-600">Processing Manual...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <svg className="text-slate-400 mb-1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      <span className="text-sm font-semibold text-slate-600">Upload PDF Manual</span>
                    </div>
                  )}
                  <input type="file" className="hidden" accept=".pdf" onChange={handleUpload} disabled={isUploading} />
                </label>
              </div>
            )}
          </div>
        </div>

        <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3.5 rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Another Vehicle
        </button>
      </main>

      {/* Modern App Bottom Navigation Bar */}
      <nav className="fixed bottom-0 w-[min(100%,28rem)] left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border-t border-slate-100 pb-safe z-50">
        <div className="flex justify-around items-center p-4">
          <Link href="/" className="flex flex-col items-center gap-1 text-slate-400 hover:text-brand-600 transition-colors">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
             <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/catalog" className="flex flex-col items-center gap-1 text-slate-400 hover:text-brand-600 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span className="text-[10px] font-medium">Catalog</span>
          </Link>
          <Link href="/orders" className="flex flex-col items-center gap-1 text-slate-400 hover:text-brand-600 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <span className="text-[10px] font-medium">Orders</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 text-brand-600 transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
