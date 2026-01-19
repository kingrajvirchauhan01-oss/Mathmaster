
import React, { useState, useEffect, useCallback } from 'react';
import { solveMathProblem, analyzeImage } from './services/geminiService';
import { MathSolution, HistoryItem, Theme, Language, AppError } from './types';
impoimportrt { CameraModal } from './components/CameraModal';
importScriptsimportScriptsimportScripts
const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [solution, setSolution] = useState<MathSolution | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [theme, setTheme] = useState<Theme>(Theme.LIGHT);
  const [lang, setLang] = useState<Language>(Language.EN);
  const [isCameraOpen, ssetIsCameraOpenetIsCameraOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'solver' | 'history' | 'favorites'>('solver');
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('math_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) setTheme(savedTheme);

    const savedLang = localStorage.getItem('lang') as Language;
    if (savedLang) setLang(savedLang);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === Theme.DARK);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const addToHistory = (sol: MathSolution) => {
    setHistory(prev => {
      // Check if this problem already exists in history
      const existingIndex = prev.findIndex(item => item.problem.trim() === sol.problem.trim());
      
      let updatedHistory: HistoryItem[];
      
      if (existingIndex !== -1) {
        // Move existing item to top and update with latest solution/timestamp
        const existingItem = prev[existingIndex];
        const updatedItem: HistoryItem = {
          ...existingItem,
          timestamp: Date.now(),
          solution: sol // Ensure we have the latest solution data
        };
        updatedHistory = [updatedItem, ...prev.filter((_, i) => i !== existingIndex)];
      } else {
        // Create new history item
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          problem: sol.problem,
          timestamp: Date.now(),
          isFavorite: false,
          solution: sol
        };
        updatedHistory = [newItem, ...prev];
      }

      // Limit history to 50 items
      const finalHistory = updatedHistory.slice(0, 50);
      localStorage.setItem('math_history', JSON.stringify(finalHistory));
      return finalHistory;
    });
  };

  const handleSolve = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setSolution(null);
    try {
      const result = await solveMathProblem(input, lang);
      setSolution(result);
      addToHistory(result);
    } catch (err: any) {
      setError(err as AppError);
    } finally {
      setLoading(false);
    }
  };

  const handleCameraCapture = async (base64: string) => {
    setIsCameraOpen(false);
    setLoading(true);
    setError(null);
    setSolution(null);
    try {
      const result = await analyzeImage(base64, lang);
      setInput(result.problem);
      setSolution(result);
      addToHistory(result);
    } catch (err: any) {
      setError(err as AppError);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (id: string) => {
    setHistory(prev => {
      const updated = prev.map(item => 
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      );
      localStorage.setItem('math_history', JSON.stringify(updated));
      return updated;
    });
  };

  const renderErrorBanner = () => {
    if (!error) return null;
    
    const icon = error.type === 'NETWORK' ? 'fa-wifi' : 
                 error.type === 'API_LIMIT' ? 'fa-hourglass-half' :
                 error.type === 'INVALID_INPUT' ? 'fa-shield-halved' : 'fa-circle-exclamation';

    return (
      <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4 rounded-2xl mb-6 flex items-center gap-4">
        <div className="bg-red-100 dark:bg-red-800/30 p-3 rounded-full text-red-600 dark:text-red-400">
          <i className={`fa-solid ${icon}`}></i>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-red-700 dark:text-red-300">
            {lang === Language.EN ? 'Problem Encountered' : 'समस्या आई'}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">{error.message}</p>
        </div>
        {error.type === 'NETWORK' && (
          <button 
            onClick={handleSolve}
            className="text-xs font-bold bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-300 px-3 py-1 rounded-lg"
          >
            {lang === Language.EN ? 'RETRY' : 'पुनः प्रयास'}
          </button>
        )}
        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
    );
  };

  const renderSolver = () => (
    <div className="space-y-6">
      {renderErrorBanner()}
      
      <div className="math-glass p-6 rounded-3xl shadow-xl transition-all duration-300">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <i className="fa-solid fa-calculator text-blue-500"></i>
          {lang === Language.EN ? 'Enter Problem' : 'सवाल दर्ज करें'}
        </h2>
        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (error) setError(null);
          }}
          placeholder={lang === Language.EN ? "Type math problem here (e.g., 2x + 5 = 15)..." : "गणित की समस्या यहाँ लिखें..."}
          className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 min-h-[120px] focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
        />
        <div className="flex gap-3 mt-4">
          <button 
            onClick={handleSolve}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>
            ) : (
              <i className="fa-solid fa-bolt mr-2"></i>
            )}
            {lang === Language.EN ? 'Solve Step-by-Step' : 'हल देखें'}
          </button>
          <button 
            onClick={() => setIsCameraOpen(true)}
            className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 px-6 rounded-2xl hover:bg-indigo-200 transition-colors"
          >
            <i className="fa-solid fa-camera text-xl"></i>
          </button>
        </div>
      </div>

      {solution && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="math-glass p-6 rounded-3xl shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <span className="bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {solution.category}
              </span>
              <button 
                onClick={() => {
                  const item = history.find(h => h.problem.trim() === solution.problem.trim());
                  if (item) toggleFavorite(item.id);
                }}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <i className={`fa-${history.find(h => h.problem.trim() === solution.problem.trim())?.isFavorite ? 'solid' : 'regular'} fa-heart text-xl`}></i>
              </button>
            </div>
            
            <h3 className="text-lg font-bold mb-4">{lang === Language.EN ? 'Steps' : 'चरण'}</h3>
            <div className="space-y-4">
              {solution.steps.map((step, idx) => (
                <div key={idx} className="flex gap-4 items-start group">
                  <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                    {idx + 1}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 pt-1 leading-relaxed">
                    {step}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500 mb-1">{lang === Language.EN ? 'Final Result' : 'अंतिम परिणाम'}</p>
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                {solution.finalAnswer}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderHistory = (onlyFavorites = false) => {
    const list = onlyFavorites ? history.filter(h => h.isFavorite) : history;
    
    if (list.length === 0) {
      return (
        <div className="text-center py-20 text-slate-400">
          <i className="fa-solid fa-box-open text-6xl mb-4 opacity-20"></i>
          <p>{lang === Language.EN ? (onlyFavorites ? 'No favorites yet' : 'No history found') : (onlyFavorites ? 'कोई पसंदीदा नहीं मिला' : 'कोई इतिहास नहीं मिला')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {list.map(item => (
          <div 
            key={item.id} 
            className="math-glass p-5 rounded-2xl shadow-md cursor-pointer hover:border-blue-300 transition-all border-l-4 border-l-transparent hover:border-l-blue-500"
            onClick={() => {
              setSolution(item.solution);
              setInput(item.problem);
              setActiveTab('solver');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="bg-slate-100 dark:bg-slate-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase text-slate-500">
                  {item.solution.category}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(item.timestamp).toLocaleDateString()}
                </span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(item.id);
                }}
                className={`${item.isFavorite ? 'text-red-500' : 'text-slate-300'} p-1`}
              >
                <i className={`fa-${item.isFavorite ? 'solid' : 'regular'} fa-heart`}></i>
              </button>
            </div>
            <p className="font-bold truncate dark:text-white">{item.problem}</p>
            <p className="text-blue-500 font-bold mt-1">{item.solution.finalAnswer}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`min-h-screen pb-24 ${theme === Theme.DARK ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <header className="sticky top-0 z-40 math-glass px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-xl">
            <i className="fa-solid fa-square-root-variable text-white"></i>
          </div>
          <h1 className="text-xl font-black tracking-tight">MathMaster</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              const newLang = lang === Language.EN ? Language.HI : Language.EN;
              setLang(newLang);
              localStorage.setItem('lang', newLang);
            }}
            className="text-xs font-bold uppercase tracking-widest bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full"
          >
            {lang === Language.EN ? 'EN' : 'HI'}
          </button>
          <button 
            onClick={() => setTheme(theme === Theme.LIGHT ? Theme.DARK : Theme.LIGHT)}
            className="text-slate-600 dark:text-slate-300"
          >
            <i className={`fa-solid fa-${theme === Theme.LIGHT ? 'moon' : 'sun'} text-xl`}></i>
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6">
        {activeTab === 'solver' && renderSolver()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'favorites' && renderHistory(true)}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 math-glass border-t border-slate-200 dark:border-slate-800 px-6 py-3 flex justify-around items-center safe-area-bottom">
        <button 
          onClick={() => setActiveTab('solver')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'solver' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <i className="fa-solid fa-house-chimney text-xl"></i>
          <span className="text-[10px] font-bold uppercase">{lang === Language.EN ? 'Solver' : 'समाधान'}</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <i className="fa-solid fa-clock-rotate-left text-xl"></i>
          <span className="text-[10px] font-bold uppercase">{lang === Language.EN ? 'History' : 'इतिहास'}</span>
        </button>
        <button 
          onClick={() => setActiveTab('favorites')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'favorites' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <i className="fa-solid fa-star text-xl"></i>
          <span className="text-[10px] font-bold uppercase">{lang === Language.EN ? 'Favorites' : 'पसंदीदा'}</span>
        </button>
      </nav>

      {isCameraOpen && (
        <CameraModal 
          onCapture={handleCameraCapture} 
          onClose={() => setIsCameraOpen(false)} 
        />
      )}
    </div>
  );
};

export default App;
