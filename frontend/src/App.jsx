import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'

function App() {
  const [messages, setMessages] = useState([])
  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState('vc')
  const [availableVoices, setAvailableVoices] = useState([]) // TRACK 1 FIX: Stores system voice assets
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [evaluation, setEvaluation] = useState(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  
  const chatEndRef = useRef(null)
  const recognitionRef = useRef(null)
  const fileInputRef = useRef(null)

  const scenarios = {
    vc: { name: 'Venture Capital', label: 'Institutional Investor', color: 'from-emerald-500 to-teal-500' },
    journalist: { name: 'Journalist', label: 'Investigative Press', color: 'from-red-500 to-orange-500' },
    politician: { name: 'Congress', label: 'Oversight Committee', color: 'from-blue-500 to-indigo-500' },
    ceo: { name: 'Board Member', label: 'Corporate Director', color: 'from-purple-500 to-pink-500' }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // TRACK 1 FIX: Load and populate available voices array dynamically
  useEffect(() => {
    const loadVoices = () => {
      if (!window.speechSynthesis) return
      const voices = window.speechSynthesis.getVoices()
      setAvailableVoices(voices)
      
      const femaleVoice = voices.find(v => 
        v.name.includes('Google UK English Female') ||
        v.name.includes('Samantha') ||
        v.name.includes('Zira')
      )
      setSelectedVoice(femaleVoice || voices.find(v => v.lang === 'en-US') || voices[0] || null)
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices
      loadVoices()
    }
  }, [])

  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition architecture not supported in this browser pipeline.')
      return null
    }
    
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript
      setIsListening(false)
      if (transcript.trim()) {
        await transmitVoicePayload(transcript)
      }
    }
    
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    
    return recognition
  }

  const toggleVoiceCapture = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }
    if (!recognitionRef.current) {
      recognitionRef.current = initSpeechRecognition()
    }
    if (recognitionRef.current) {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  const speakText = (text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    if (selectedVoice) utterance.voice = selectedVoice
    window.speechSynthesis.speak(utterance)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = (event) => {
      setFileContent(event.target.result)
    }
    reader.readAsText(file)
  }

  const transmitVoicePayload = async (spokenText) => {
    const userMessage = { role: 'user', content: spokenText }
    const updatedHistory = [...messages, userMessage]
    
    setMessages(updatedHistory)
    setIsLoading(true)
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/chat`, {
        history: updatedHistory,
        scenario: selectedScenario,
        file_context: fileContent || null
      })
      
      const aiMessage = { role: 'assistant', content: response.data.reply }
      setMessages(prev => [...prev, aiMessage])
      speakText(response.data.reply)
      
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'System error. Failed to map transmission context.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const triggerEvaluation = async () => {
    if (messages.length < 2) return
    setIsEvaluating(true)
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/evaluate`, {
        history: messages,
        scenario: selectedScenario
      })
      setEvaluation(response.data)
    } catch (error) {
      alert('Metrics evaluation compilation failure.')
    } finally {
      setIsEvaluating(false)
    }
  }

  // TRACK 1 View-Mutation Method: Wipes SQLite profile context completely from backend memory agents
  const handleStartFresh = async () => {
    if (!window.confirm("CRITICAL WARNING: This action will completely purge the backend long-term vulnerability profile archive. Proceed?")) return
    setIsResetting(true)
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/reset-memory`)
      clearChat()
      alert("Database Purged: Your execution profile has been reset to an absolute blank slate.")
    } catch (error) {
      alert("Failed to wipe remote database profile infrastructure.")
    } finally {
      setIsResetting(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    setFileContent('')
    setUploadedFile(null)
    setEvaluation(null)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans">
      <div className="max-w-6xl w-full mx-auto px-6 py-8 flex-1 flex flex-col">
        
        {/* Header Layout */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-4 mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              DEAL<span className="text-yellow-400">COACH</span>.AUDIO
            </h1>
            <p className="text-xs text-slate-400">Zero-Typing Adaptive Response Simulator</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* TRACK 1 INTERFACE UPGRADE: The "Start Fresh" trigger panel */}
            <button
              onClick={handleStartFresh}
              disabled={isResetting}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-mono tracking-wide transition-all disabled:opacity-40"
            >
              {isResetting ? "PURGING MEMORY..." : "START FRESH (WIPE MEMORY)"}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs transition-all"
            >
              Document Context Ingestion
            </button>
            <input ref={fileInputRef} type="file" accept=".txt,.md,.json" onChange={handleFileUpload} className="hidden" />
            {uploadedFile && <span className="text-xs text-emerald-400 font-mono">✓ System Ingested</span>}
          </div>
        </div>

        {/* Workspace Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 items-stretch">
          
          {/* Audio Interface Column */}
          <div className="lg:col-span-2 flex flex-col justify-between bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            
            <div className="space-y-4">
              {/* Active Settings */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(scenarios).map(([key, sc]) => (
                  <button
                    key={key}
                    disabled={messages.length > 0}
                    onClick={() => setSelectedScenario(key)}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      selectedScenario === key
                        ? `bg-gradient-to-br ${sc.color} text-white border-transparent shadow-lg`
                        : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 disabled:opacity-30'
                    }`}
                  >
                    <div className="text-xs uppercase font-mono tracking-widest opacity-60">Role</div>
                    <div className="text-sm font-bold truncate">{sc.name}</div>
                  </button>
                ))}
              </div>

              {/* TRACK 1 INTERFACE UPGRADE: Adversarial Voice Changer Dropdown */}
              <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-slate-400 font-semibold">
                    Adversarial Voice Engine
                  </label>
                  <p className="text-[11px] text-slate-500">Mutate the voice configuration pipeline for your adversary.</p>
                </div>
                <select
                  value={selectedVoice ? selectedVoice.name : ''}
                  onChange={(e) => {
                    const voice = availableVoices.find(v => v.name === e.target.value);
                    if (voice) setSelectedVoice(voice);
                  }}
                  className="w-full sm:w-64 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-yellow-400 transition-all"
                >
                  {availableVoices.length === 0 ? (
                    <option>No system voices cached</option>
                  ) : (
                    availableVoices.map((voice) => (
                      <option key={voice.name} value={voice.name}>
                        {voice.name} ({voice.lang})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Immersive Audio Visualizer Module */}
            <div className="my-auto py-12 flex flex-col items-center justify-center relative">
              <div className="w-48 h-48 flex items-center justify-center relative">
                
                {/* Visualizer Waves */}
                <AnimatePresence>
                  {(isListening || isLoading) && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.2, opacity: [0.1, 0.4, 0.1] }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      className={`absolute inset-0 rounded-full bg-gradient-to-r ${scenarios[selectedScenario].color} blur-xl`}
                    />
                  )}
                </AnimatePresence>

                {/* Secondary Wave for 3D depth effect */}
                {isListening && (
                  <div className="absolute inset-4 rounded-full border border-yellow-400/30 animate-ping duration-1000" />
                )}

                {/* Main Interactive Orb Trigger */}
                <button
                  onClick={toggleVoiceCapture}
                  disabled={isLoading || !!evaluation}
                  className={`w-32 h-32 rounded-full flex flex-col items-center justify-center border transition-all z-10 relative shadow-2xl ${
                    isListening 
                      ? 'bg-red-600 border-transparent text-white' 
                      : 'bg-slate-900 border-white/10 hover:border-yellow-400 text-slate-300'
                  }`}
                >
                  {isListening ? (
                    <div className="text-center">
                      <div className="text-xs font-mono tracking-widest animate-pulse">STREAMING</div>
                      <span className="text-xs opacity-60">Tap to stop</span>
                    </div>
                  ) : isLoading ? (
                    <div className="flex gap-1 items-center">
                      <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-8 h-8 mx-auto mb-1 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <span className="text-[10px] uppercase font-mono tracking-widest font-semibold">Open Channel</span>
                    </div>
                  )}
                </button>
              </div>

              {/* Status Text Block */}
              <p className="text-xs font-mono text-slate-400 mt-6 tracking-wide h-4">
                {isListening ? "Listening... Speak clearly now." : isLoading ? "Qwen generating strategic vocal output..." : "Channel closed. Tap to answer adversarial inquiry."}
              </p>
            </div>

            {/* Termination Trigger */}
            <div className="flex justify-end border-t border-white/5 pt-4">
              {messages.length >= 2 && !evaluation && (
                <button
                  onClick={triggerEvaluation}
                  disabled={isEvaluating}
                  className="px-6 py-2 bg-red-950/40 hover:bg-red-900 border border-red-800 text-red-200 font-mono rounded-xl text-xs tracking-widest transition-all"
                >
                  {isEvaluating ? 'COMPILING DATA...' : 'TERMINATE & ASSESS SESSION'}
                </button>
              )}
            </div>
          </div>

          {/* Diagnostics Column Panel */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-mono tracking-widest uppercase text-slate-400 border-b border-white/10 pb-3 flex justify-between items-center">
                <span>Session Scorecard</span>
                {evaluation && <span className="text-lg font-bold text-yellow-400">{evaluation.score} pts</span>}
              </h3>

              <AnimatePresence mode="wait">
                {isEvaluating && (
                  <div className="py-24 text-center space-y-3">
                    <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-mono text-slate-500">Processing transactional behavioral patterns...</p>
                  </div>
                )}

                {!evaluation && !isEvaluating && (
                  <div className="py-24 text-center text-xs text-slate-500 font-mono px-4">
                    Complete at least one multi-turn dialog sequence and hit Terminate to stream diagnostics data maps.
                  </div>
                )}

                {evaluation && !isEvaluating && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 mt-4 text-xs leading-relaxed">
                    
                    {/* Metrics Progress bars */}
                    <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/5">
                      {Object.entries(evaluation.breakdown).map(([metric, val]) => (
                        <div key={metric} className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono uppercase text-slate-400">
                            <span>{metric.replace('_', ' ')}</span>
                            <span>{val}%</span>
                          </div>
                          <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                            <div className="bg-yellow-400 h-full" style={{ width: `${val}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Fatal Flaw Details */}
                    <div>
                      <h4 className="font-mono text-red-400 text-[10px] uppercase tracking-wider mb-1">Structural Flaw Identified:</h4>
                      <p className="text-slate-300 font-light p-3 bg-red-950/10 border border-red-900/20 rounded-xl">
                        {evaluation.critical_mistake}
                      </p>
                    </div>

                    {/* Operational Tips */}
                    <div>
                      <h4 className="font-mono text-emerald-400 text-[10px] uppercase tracking-wider mb-1">Remedial Action Directives:</h4>
                      <ul className="space-y-1.5 list-disc list-inside text-slate-300 font-light">
                        {evaluation.actionable_tips.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="w-full mt-6 py-2 rounded-xl bg-white/5 text-slate-400 text-xs hover:text-white transition-all font-mono tracking-widest uppercase text-center"
              >
                Clear State Matrix
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

export default App