import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  CheckCircle, 
  ShieldAlert, 
  Settings, 
  Trash2, 
  Bookmark, 
  Bot, 
  RotateCcw, 
  X,
  AlertTriangle,
  Search,
  FilterX,
  Zap,
  Globe,
  EyeOff,
  Flame,
  Banknote,
  Briefcase,
  Target
} from 'lucide-react';

// --- DATA MOCK (Simulation Base de données) ---
const INITIAL_JOBS = [
  {
    id: '1',
    title: 'Senior React Developer (Remote)',
    company: 'TechFlow Systems',
    logoUrl: 'https://placehold.co/100x100?text=TF',
    location: 'Paris',
    country: 'France',
    createdAt: new Date().toISOString(),
    category: 'TARGET',
    status: 'INBOX',
    parserGrade: 'A',
    workMode: 'remote',
    salary: '65k-85k',
    isEasyApply: true,
    isHighMatch: true,
    isActiveRecruiting: true,
    url: '#',
    tags: ['React', 'TypeScript']
  },
  {
    id: '2',
    title: 'Développeur Frontend Vue.js / React',
    company: 'Agence Digitale 360',
    logoUrl: null,
    location: 'Lyon',
    country: 'France',
    createdAt: new Date(Date.now() - 1000 * 3600 * 4).toISOString(),
    category: 'TARGET', 
    status: 'INBOX',
    parserGrade: 'B',
    workMode: 'hybrid',
    isEasyApply: false,
    url: '#',
    tags: ['Frontend', 'Agency']
  },
  {
    id: '3',
    title: 'Mission Freelance Wordpress Urgent',
    company: 'Balthazar & Co',
    logoUrl: 'https://placehold.co/100x100?text=BC',
    location: 'Bordeaux',
    country: 'France',
    createdAt: new Date(Date.now() - 1000 * 3600 * 5).toISOString(),
    category: 'EXPLORE',
    status: 'INBOX',
    parserGrade: 'B',
    workMode: 'on-site',
    url: '#',
    tags: ['Wordpress']
  },
  {
    id: '4',
    title: 'Fullstack Dev // JAVA // SPRING // NANTES // CDI',
    company: 'ESN Services',
    location: 'Nantes',
    country: 'France',
    createdAt: new Date(Date.now() - 1000 * 3600 * 24).toISOString(),
    category: 'EXPLORE',
    status: 'INBOX',
    parserGrade: 'C', 
    rawString: 'Fullstack Dev // JAVA // SPRING // ANGULAR // NANTES // CDI - ESN Services',
    aiAnalysis: {
      isPlatformOrAgency: true,
      type: 'Cabinet de Recrutement / ESN',
      reason: "Nom d'entreprise associé à des services ESN."
    },
    url: '#',
    tags: []
  },
  {
    id: '5',
    title: 'Stage Assistant Marketing Digital',
    company: 'StartUp Nation',
    location: 'Paris',
    country: 'France',
    createdAt: new Date(Date.now() - 1000 * 3600 * 25).toISOString(),
    category: 'FILTERED',
    status: 'INBOX',
    parserGrade: 'A',
    url: '#',
    tags: ['Stage']
  },
  {
    id: '6',
    title: 'CTO - Chief Technical Officer',
    company: 'ScaleUp FinTech',
    location: 'London',
    country: 'UK',
    createdAt: new Date(Date.now() - 1000 * 3600 * 48).toISOString(),
    category: 'TARGET',
    status: 'SAVED',
    parserGrade: 'A',
    workMode: 'remote',
    isHighMatch: true,
    url: '#',
    tags: ['Leadership', 'Fintech']
  }
];

export default function JobStreamApp() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('INBOX'); // INBOX, PROCESSED, FILTERED, SETTINGS
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [visitedIds, setVisitedIds] = useState(new Set()); 
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterWorkMode, setFilterWorkMode] = useState("all");
  const [filterEasyApply, setFilterEasyApply] = useState(false);
  const [filterCountry, setFilterCountry] = useState("all");

  // Settings State
  const [whitelist, setWhitelist] = useState(['React', 'Node.js', 'CTO', 'TypeScript']);
  const [blacklist, setBlacklist] = useState(['Stage', 'Alternance', 'Wordpress', 'ESN Services']);
  const [newBlacklistTerm, setNewBlacklistTerm] = useState('');
  const [newWhitelistTerm, setNewWhitelistTerm] = useState('');

  // AI Detective State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [analyzingJob, setAnalyzingJob] = useState(null);
  const [aiResult, setAiResult] = useState(null); 

  // Toasts State
  const [showBulkCleanToast, setShowBulkCleanToast] = useState(true);
  const [lastTrashedJob, setLastTrashedJob] = useState(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  // --- ACTIONS ---

  const handleVisit = (id) => {
    const newVisited = new Set(visitedIds);
    newVisited.add(id);
    setVisitedIds(newVisited);
  };

  const handleUnvisit = (id) => {
    const newVisited = new Set(visitedIds);
    newVisited.delete(id);
    setVisitedIds(newVisited);
  };

  const moveJob = (id, newStatus) => {
    const jobToMove = jobs.find(j => j.id === id);
    if (!jobToMove) return;

    if (newStatus === 'TRASH') {
      setLastTrashedJob(jobToMove);
      setShowUndoToast(true);
      setTimeout(() => setShowUndoToast(false), 5000);
    }
    setJobs(jobs.map(j => j.id === id ? { ...j, status: newStatus } : j));
  };

  const handleUndoTrash = () => {
    if (!lastTrashedJob) return;
    setJobs(jobs.map(j => j.id === lastTrashedJob.id ? { ...j, status: 'INBOX' } : j));
    setLastTrashedJob(null);
    setShowUndoToast(false);
  };

  const bulkCleanVisited = () => {
    setJobs(jobs.map(j => 
      (j.status === 'INBOX' && visitedIds.has(j.id)) 
      ? { ...j, status: 'TRASH' } 
      : j
    ));
    setVisitedIds(new Set()); 
  };

  const restoreJob = (id) => {
    setJobs(jobs.map(j => j.id === id ? { ...j, status: 'INBOX', category: 'EXPLORE' } : j));
  };

  const openAiDetective = (e, job) => {
    e.stopPropagation();
    setAnalyzingJob(job);
    setAiModalOpen(true);
    setAiResult('loading');
    
    setTimeout(() => {
      const isSuspect = job.company.includes('ESN') || job.company.includes('Service') || job.title.includes('Wordpress');
      setAiResult({
        isPlatformOrAgency: isSuspect,
        type: isSuspect ? 'Cabinet de Recrutement / ESN' : 'Entreprise Finale (Probable)',
        reason: isSuspect 
          ? "Détecté via heuristiques basées sur le nom d'entreprise." 
          : "L'offre semble provenir directement de l'entreprise."
      });
    }, 1000);
  };

  const confirmBanAuthor = () => {
    if (!analyzingJob) return;
    setBlacklist([...blacklist, analyzingJob.company]);
    setJobs(jobs.map(j => j.company === analyzingJob.company ? { ...j, category: 'FILTERED' } : j));
    setAiModalOpen(false);
    setAnalyzingJob(null);
  };

  // --- SUB-COMPONENTS ---

  const WorkModeBadge = ({ workMode }) => {
    if (!workMode) return null;
    let style = "bg-gray-100 text-gray-600 border-gray-200";
    let label = "Sur site";
    if (workMode === "remote") {
      style = "bg-indigo-50 text-indigo-700 border-indigo-100";
      label = "À distance";
    } else if (workMode === "hybrid") {
      style = "bg-purple-50 text-purple-700 border-purple-100";
      label = "Hybride";
    }
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 border ${style}`}>
        <Briefcase size={10} />
        {label}
      </span>
    );
  };

  const JobCard = ({ job, showActions = true, isFilteredView = false }) => {
    const isVisited = visitedIds.has(job.id);
    const isMono = job.parserGrade === 'C';

    return (
      <div className={`
        group relative bg-white border border-gray-200 rounded-xl p-4 mb-3 transition-all duration-300 shadow-sm hover:shadow-md
        ${isVisited && job.status === 'INBOX' ? 'opacity-60 grayscale-[0.8] bg-gray-50' : 'opacity-100'}
        ${isMono ? 'font-mono text-sm border-l-4 border-l-gray-300' : ''}
      `}>
        <div className="cursor-pointer" onClick={() => handleVisit(job.id)}>
          <div className="flex items-start gap-4 mb-3">
            {/* Logo Fallback */}
            <div className="shrink-0 mt-1">
              {job.logoUrl ? (
                <img src={job.logoUrl} alt={job.company} className="w-12 h-12 object-contain rounded-lg border border-gray-100 bg-white" />
              ) : (
                <div className="w-12 h-12 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center font-bold text-gray-500 text-lg">
                  {job.company.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1 gap-2">
                 <h3 className={`font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight ${isMono ? 'text-xs' : 'text-base'}`}>
                    {job.title || job.rawString}
                 </h3>
                 <div className="flex items-center gap-1 shrink-0 ml-auto">
                    {isVisited && job.status === 'INBOX' && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium uppercase tracking-wider">Vu</span>}
                    {showActions && (
                      <div className="flex items-center gap-1">
                        {isVisited && job.status === 'INBOX' && (
                          <button onClick={(e) => { e.stopPropagation(); handleUnvisit(job.id); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
                            <EyeOff size={14} />
                          </button>
                        )}
                        {isFilteredView ? (
                          <button onClick={(e) => { e.stopPropagation(); restoreJob(job.id); }} className="flex items-center px-2 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-[10px] font-bold uppercase tracking-tight shadow-sm">
                            <RotateCcw size={10} className="mr-1"/> Repêcher
                          </button>
                        ) : (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setBlacklistTerm(job.company); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full">
                              <ShieldAlert size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); moveJob(job.id, 'TRASH'); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full">
                              <Trash2 size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); moveJob(job.id, 'SAVED'); }} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full">
                              <Bookmark size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                 </div>
              </div>

              <div className="flex items-center text-sm text-gray-500 gap-2 flex-wrap mb-2">
                <span className="font-bold text-gray-700">{job.company}</span>
                <span className="text-gray-300">•</span>
                <span>{job.location}{job.country ? `, ${job.country}` : ''}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <WorkModeBadge workMode={job.workMode} />
                {job.salary && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700 border border-green-100 flex items-center gap-1"><Banknote size={10} />{job.salary}</span>}
                {job.isActiveRecruiting && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-50 text-orange-700 border border-orange-100 flex items-center gap-1"><Flame size={10} />Actif</span>}
                {job.isEasyApply && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1"><Zap size={10} />Simplifiée</span>}
                {job.isHighMatch && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1"><Target size={10} />Top Match</span>}
              </div>
            </div>
          </div>
        </div>

        {/* AI Warning Footer */}
        {job.aiAnalysis?.isPlatformOrAgency && (
          <div className="pt-3 border-t border-gray-100 mt-1">
             <div className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 font-medium flex items-center gap-1.5">
               <AlertTriangle size={12} />
               Détecté comme : {job.aiAnalysis.type} — {job.aiAnalysis.reason}
             </div>
          </div>
        )}
      </div>
    );
  };

  // --- VIEWS ---

  const InboxView = () => {
    const baseInboxJobs = jobs.filter(j => j.status === 'INBOX' && j.category !== 'FILTERED');
    
    // Application des filtres simulés
    const filtered = baseInboxJobs.filter(job => {
      if (searchQuery && !job.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterWorkMode !== 'all' && job.workMode !== filterWorkMode) return false;
      if (filterEasyApply && !job.isEasyApply) return false;
      if (filterCountry !== 'all' && job.country !== filterCountry) return false;
      return true;
    });

    const visitedCount = baseInboxJobs.filter(j => visitedIds.has(j.id)).length;
    const countries = Array.from(new Set(baseInboxJobs.map(j => j.country))).filter(Boolean);

    return (
      <div className="relative pb-24">
        <div className="flex justify-between items-end mb-6 px-1">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Flux entrant</h2>
            <p className="text-xs text-gray-500">Toutes vos sources centralisées ici.</p>
          </div>
          <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">
            {filtered.length} offres
          </span>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher..."
            className="block w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {['all', 'remote', 'hybrid', 'on-site'].map(mode => (
              <button key={mode} onClick={() => setFilterWorkMode(mode)} className={`px-3 py-1.5 text-xs font-medium rounded-md ${filterWorkMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {mode === 'all' ? 'Tous' : mode === 'remote' ? 'À distance' : mode === 'hybrid' ? 'Hybride' : 'Sur site'}
              </button>
            ))}
          </div>
          <button onClick={() => setFilterEasyApply(!filterEasyApply)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${filterEasyApply ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600'}`}>
            <Zap size={14} /> Candidature simplifiée
          </button>
          <div className="relative">
            <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 appearance-none outline-none">
              <option value="all">Tous les pays</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Globe size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
             <CheckCircle size={48} className="mb-4 opacity-20" />
             <p>Aucune offre ne correspond à ces critères.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        )}

        {/* Floating Action Bar (Bulk Clean) */}
        {visitedCount > 0 && showBulkCleanToast && (
          <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center px-4">
            <div className="bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-6 border border-gray-800">
              <div className="flex items-center gap-3">
                <CheckCircle size={18} className="text-blue-400" />
                <span className="text-sm font-medium">{visitedCount} offres visitées</span>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={bulkCleanVisited} className="text-xs font-bold text-blue-400 uppercase tracking-widest hover:text-blue-300">Tout nettoyer</button>
                <div className="w-[1px] h-4 bg-gray-700"></div>
                <button onClick={() => setShowBulkCleanToast(false)}><X size={18} className="text-gray-500"/></button>
              </div>
            </div>
          </div>
        )}

        {/* Undo Trash Toast */}
        {showUndoToast && (
          <div className="fixed bottom-24 left-0 right-0 z-50 flex justify-center px-4 animate-in slide-in-from-bottom-5">
            <div className="bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-6 border border-gray-800">
              <div className="flex items-center gap-3">
                <Trash2 size={18} className="text-red-400" />
                <span className="text-sm font-medium">Annonce supprimée</span>
              </div>
              <button onClick={handleUndoTrash} className="text-xs font-bold text-blue-400 uppercase tracking-widest">Annuler</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const SettingsView = () => {
    return (
      <div className="space-y-6 pb-20">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
          <h2 className="text-lg font-bold text-gray-800 mb-2">Le Cerveau</h2>
          <p className="text-sm text-gray-600">Configuration des règles de tri automatique.</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-green-700 flex items-center mb-4"><CheckCircle size={18} className="mr-2"/> Whitelist (Cibles)</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {whitelist.map(term => (
              <span key={term} className="px-3 py-1.5 bg-white text-gray-700 rounded-lg text-sm border border-green-200 shadow-sm flex items-center">
                {term}
                <button onClick={() => setWhitelist(whitelist.filter(t => t !== term))} className="ml-2 text-green-300 hover:text-red-500"><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newWhitelistTerm} onChange={(e) => setNewWhitelistTerm(e.target.value)} placeholder="Ajouter..." className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-500" />
            <button onClick={() => {if(newWhitelistTerm) {setWhitelist([...whitelist, newWhitelistTerm]); setNewWhitelistTerm('');}}} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Ajouter</button>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-red-700 flex items-center mb-4"><ShieldAlert size={18} className="mr-2"/> Blacklist (Exclusions)</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {blacklist.map(term => (
              <span key={term} className="px-3 py-1.5 bg-white text-gray-700 rounded-lg text-sm border border-red-200 shadow-sm flex items-center">
                {term}
                <button onClick={() => setBlacklist(blacklist.filter(t => t !== term))} className="ml-2 text-red-300 hover:text-red-500"><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newBlacklistTerm} onChange={(e) => setNewBlacklistTerm(e.target.value)} placeholder="Ajouter..." className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500" />
            <button onClick={() => {if(newBlacklistTerm) {setBlacklist([...blacklist, newBlacklistTerm]); setNewBlacklistTerm('');}}} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Ajouter</button>
          </div>
        </div>
      </div>
    );
  };

  // --- LAYOUT ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">I</div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 hidden sm:block">intrai</h1>
          </div>
          <nav className="flex bg-gray-50 p-1 rounded-lg">
            {[
              { id: 'INBOX', icon: Inbox, label: 'Inbox' },
              { id: 'PROCESSED', icon: CheckCircle, label: 'Traitées' },
              { id: 'FILTERED', icon: ShieldAlert, label: 'Filtrés' },
              { id: 'SETTINGS', icon: Settings, label: 'Réglages' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-3 sm:px-4 py-2 rounded-md transition-all text-xs font-medium flex items-center ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>
                <tab.icon size={18} className="sm:mr-2" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6">
        {activeTab === 'INBOX' && <InboxView />}
        {activeTab === 'PROCESSED' && <div className="text-center py-20 text-gray-400">Vue Traitées (simulation)</div>}
        {activeTab === 'FILTERED' && <div className="text-center py-20 text-gray-400">Vue Filtrés (simulation)</div>}
        {activeTab === 'SETTINGS' && <SettingsView />}
      </main>

      {/* AI Modal Simulation */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3"><Bot size={24}/><div><h3 className="font-bold">AI Detective</h3></div></div>
              <button onClick={() => setAiModalOpen(false)}><X size={20}/></button>
            </div>
            <div className="p-6 text-center">
              {aiResult === 'loading' ? <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto my-10"></div> : 
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border ${aiResult.isPlatformOrAgency ? 'bg-orange-50 border-orange-100 text-orange-800' : 'bg-green-50 border-green-100 text-green-800'}`}>
                    <h4 className="font-bold mb-1">{aiResult.type}</h4>
                    <p className="text-sm opacity-90">{aiResult.reason}</p>
                  </div>
                  <button onClick={() => setAiModalOpen(false)} className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium">Fermer</button>
                </div>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
