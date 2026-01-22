import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  CheckCircle, 
  ShieldAlert, 
  Settings, 
  Trash2, 
  Bookmark, 
  ExternalLink, 
  Bot, 
  RotateCcw, 
  X,
  AlertTriangle,
  Search,
  ArrowRight,
  Filter
} from 'lucide-react';

// --- DATA MOCK (Simulation Base de données) ---
const INITIAL_JOBS = [
  {
    id: '1',
    title: 'Senior React Developer (Remote)',
    company: 'TechFlow Systems',
    location: 'Paris (Full Remote)',
    date: 'Il y a 2h',
    category: 'TARGET', // Match Whitelist
    status: 'INBOX',
    parserGrade: 'A',
    url: '#',
    tags: ['React', 'TypeScript']
  },
  {
    id: '2',
    title: 'Développeur Frontend Vue.js / React',
    company: 'Agence Digitale 360',
    location: 'Lyon',
    date: 'Il y a 4h',
    category: 'TARGET', 
    status: 'INBOX',
    parserGrade: 'B',
    url: '#',
    tags: ['Frontend', 'Agency']
  },
  {
    id: '3',
    title: 'Mission Freelance Wordpress Urgent - Refonte Site Vitrine',
    company: 'Balthazar & Co',
    location: 'Bordeaux',
    date: 'Il y a 5h',
    category: 'EXPLORE', // Pas de match -> Exploration
    status: 'INBOX',
    parserGrade: 'B',
    url: '#',
    tags: ['Wordpress']
  },
  {
    id: '4',
    title: 'Fullstack Dev // JAVA // SPRING // ANGULAR // NANTES // CDI',
    company: 'ESN Services',
    location: 'Nantes',
    date: 'Il y a 1j',
    category: 'EXPLORE',
    status: 'INBOX',
    parserGrade: 'C', // Grade C -> Police Mono
    rawString: 'Fullstack Dev // JAVA // SPRING // ANGULAR // NANTES // CDI - ESN Services',
    url: '#',
    tags: []
  },
  {
    id: '5',
    title: 'Stage Assistant Marketing Digital',
    company: 'StartUp Nation',
    location: 'Paris',
    date: 'Il y a 1j',
    category: 'FILTERED',
    status: 'INBOX', // Techniquement filtré
    parserGrade: 'A',
    url: '#',
    tags: ['Stage']
  },
  {
    id: '6',
    title: 'CTO - Chief Technical Officer',
    company: 'ScaleUp FinTech',
    location: 'Remote',
    date: 'Il y a 2j',
    category: 'TARGET',
    status: 'SAVED',
    parserGrade: 'A',
    url: '#',
    tags: ['Leadership', 'Fintech']
  }
];

export default function JobStreamApp() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState('INBOX'); // INBOX, PROCESSED, FILTERED, SETTINGS
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [visitedIds, setVisitedIds] = useState(new Set()); // Suivi local des clics
  
  // Settings State
  const [whitelist, setWhitelist] = useState(['React', 'Node.js', 'CTO', 'TypeScript']);
  const [blacklist, setBlacklist] = useState(['Stage', 'Alternance', 'Wordpress', 'ESN Services']);
  const [newBlacklistTerm, setNewBlacklistTerm] = useState('');
  const [newWhitelistTerm, setNewWhitelistTerm] = useState('');

  // AI Detective State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [analyzingJob, setAnalyzingJob] = useState(null);
  const [aiResult, setAiResult] = useState(null); // null, 'loading', { result data }

  // --- ACTIONS ---

  const handleVisit = (id) => {
    const newVisited = new Set(visitedIds);
    newVisited.add(id);
    setVisitedIds(newVisited);
    // Simulation ouverture lien
    // window.open(url, '_blank');
  };

  const moveJob = (id, newStatus) => {
    setJobs(jobs.map(j => j.id === id ? { ...j, status: newStatus } : j));
  };

  const bulkCleanVisited = () => {
    // Déplace tous les items visités ET qui sont dans l'INBOX vers TRASH
    setJobs(jobs.map(j => 
      (j.status === 'INBOX' && visitedIds.has(j.id)) 
      ? { ...j, status: 'TRASH' } 
      : j
    ));
    setVisitedIds(new Set()); 
  };

  const restoreJob = (id) => {
    // Restaure un job filtré ou trash vers Inbox
    setJobs(jobs.map(j => j.id === id ? { ...j, status: 'INBOX', category: 'EXPLORE' } : j));
  };

  // AI Logic Simulation
  const openAiDetective = (e, job) => {
    e.stopPropagation();
    setAnalyzingJob(job);
    setAiModalOpen(true);
    setAiResult('loading');
    
    // Simulation Latence API
    setTimeout(() => {
      // Logique mockée pour la démo
      const isSuspect = job.company.includes('ESN') || job.company.includes('Service') || job.title.includes('Wordpress');
      
      setAiResult({
        isPlatformOrAgency: isSuspect,
        type: isSuspect ? 'Cabinet de Recrutement / ESN' : 'Entreprise Finale (Probable)',
        reason: isSuspect 
          ? "Utilisation de majuscules excessives, termes génériques et nom d'entreprise associé à des services ESN." 
          : "L'offre semble provenir directement de l'entreprise. Titre précis et contexte clair."
      });
    }, 1500);
  };

  const confirmBanAuthor = () => {
    if (!analyzingJob) return;
    // 1. Ajouter à la blacklist
    setBlacklist([...blacklist, analyzingJob.company]);
    // 2. Déplacer dans Filtrés
    setJobs(jobs.map(j => j.id === analyzingJob.id ? { ...j, category: 'FILTERED' } : j));
    // Fermer modal
    setAiModalOpen(false);
    setAnalyzingJob(null);
  };

  // --- SUB-COMPONENTS ---

  const StatusBadge = ({ category }) => {
    if (category === 'TARGET') return null;
    if (category === 'EXPLORE') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800 uppercase tracking-wide mr-2 border border-yellow-200">
          <AlertTriangle size={10} className="mr-1" />
          Exploration
        </span>
      );
    }
    return null;
  };

  const JobCard = ({ job, showActions = true, isFilteredView = false }) => {
    const isVisited = visitedIds.has(job.id) && job.status === 'INBOX';
    const isMono = job.parserGrade === 'C'; // Qualité technique faible

    return (
      <div className={`
        group relative bg-white border border-gray-200 rounded-xl p-4 mb-3 transition-all duration-300 shadow-sm hover:shadow-md
        ${isVisited ? 'opacity-60 grayscale-[0.8] bg-gray-50' : 'opacity-100'}
        ${isMono ? 'font-mono text-sm border-l-4 border-l-gray-300' : ''}
      `}>
        {/* Contenu Cliquable */}
        <div className="cursor-pointer" onClick={() => handleVisit(job.id)}>
          <div className="flex justify-between items-start mb-1">
             <div className="flex flex-wrap items-center gap-y-1">
                <StatusBadge category={job.category} />
                <h3 className={`font-semibold text-gray-900 group-hover:text-blue-600 transition-colors ${isMono ? 'text-xs leading-relaxed' : 'text-base'}`}>
                  {job.title || job.rawString}
                </h3>
             </div>
             {isVisited && <span className="text-xs text-gray-400 font-medium ml-2 shrink-0">Vu</span>}
          </div>

          <div className="flex items-center text-sm text-gray-500 mb-3 gap-2 flex-wrap">
            <span className="font-bold text-gray-700">{job.company}</span>
            <span className="text-gray-300">•</span>
            <span>{job.location}</span>
            <span className="text-gray-300">•</span>
            <span className={`text-xs ${job.date.includes('h') ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
              {job.date}
            </span>
          </div>
          
          {/* Tags (si dispo) */}
          {job.tags && job.tags.length > 0 && !isMono && (
             <div className="flex gap-2 mb-3">
               {job.tags.map(tag => (
                 <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                   #{tag}
                 </span>
               ))}
             </div>
          )}
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-1">
          
          {/* AI Detective Trigger (Only in Inbox & Standard View) */}
          {showActions && job.status === 'INBOX' && (
             <button 
               onClick={(e) => openAiDetective(e, job)}
               className="text-xs flex items-center text-indigo-600 hover:bg-indigo-50 px-2 py-1.5 rounded-md transition-colors font-medium"
             >
               <Bot size={14} className="mr-1.5" /> 
               {isMono ? "Scan ?" : "Analyser l'auteur ?"}
             </button>
          )}

          {isFilteredView && (
             <div className="text-xs text-red-500 font-medium flex items-center bg-red-50 px-2 py-1 rounded">
                <Filter size={12} className="mr-1"/> Bloqué par règle
             </div>
          )}

          {/* Main Decision Actions */}
          {showActions && (
            <div className="flex space-x-2 ml-auto">
              {isFilteredView ? (
                <button 
                  onClick={() => restoreJob(job.id)} 
                  className="flex items-center px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium shadow-sm"
                >
                  <RotateCcw size={12} className="mr-1.5"/> Repêcher
                </button>
              ) : (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); moveJob(job.id, 'TRASH'); }}
                    className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Jeter (Trash)"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); moveJob(job.id, 'SAVED'); }}
                    className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                    title="Garder (Save)"
                  >
                    <Bookmark size={16} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- VIEWS ---

  const InboxView = () => {
    // Filtre: INBOX et pas FILTERED
    const inboxJobs = jobs.filter(j => j.status === 'INBOX' && j.category !== 'FILTERED');
    const visitedCount = inboxJobs.filter(j => visitedIds.has(j.id)).length;

    return (
      <div className="relative pb-24">
        {/* Sub-header Inbox */}
        <div className="flex justify-between items-end mb-6 px-1">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Flux entrant</h2>
            <p className="text-xs text-gray-500">Toutes vos sources centralisées ici.</p>
          </div>
          <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">
            {inboxJobs.length} offres
          </span>
        </div>
        
        {inboxJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-green-100 p-4 rounded-full mb-4 animate-pulse">
              <CheckCircle size={48} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Inbox Zero !</h3>
            <p className="text-gray-500 max-w-xs">Toutes les offres ont été traitées. Prenez une pause ou ajustez vos sources.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {inboxJobs.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        )}

        {/* Floating Action Button (FAB) for Bulk Clean */}
        {visitedCount > 0 && (
          <div className="fixed bottom-6 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none">
            <button 
              onClick={bulkCleanVisited}
              className="pointer-events-auto group flex items-center bg-gray-900 hover:bg-black text-white px-6 py-3.5 rounded-full shadow-xl transition-all transform hover:scale-105 active:scale-95"
            >
              <Trash2 size={18} className="mr-2.5 text-gray-400 group-hover:text-white transition-colors" />
              <div className="text-sm font-medium">
                Nettoyer les visités <span className="bg-gray-700 ml-1 px-1.5 py-0.5 rounded text-xs">{visitedCount}</span>
              </div>
            </button>
          </div>
        )}
      </div>
    );
  };

  const ProcessedView = () => {
    const [subTab, setSubTab] = useState('SAVED'); // SAVED or TRASH
    const displayJobs = jobs.filter(j => j.status === subTab);

    return (
      <div>
        <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
          <button 
            onClick={() => setSubTab('SAVED')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${subTab === 'SAVED' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Sauvegardés ({jobs.filter(j => j.status === 'SAVED').length})
          </button>
          <button 
            onClick={() => setSubTab('TRASH')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${subTab === 'TRASH' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Corbeille ({jobs.filter(j => j.status === 'TRASH').length})
          </button>
        </div>
        
        {displayJobs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="bg-gray-50 inline-block p-4 rounded-full mb-3">
              {subTab === 'SAVED' ? <Bookmark size={32}/> : <Trash2 size={32}/>}
            </div>
            <p>Aucune offre ici pour le moment.</p>
          </div>
        ) : (
          displayJobs.map(job => (
            <JobCard key={job.id} job={job} showActions={false} />
          ))
        )}
      </div>
    );
  };

  const FilteredView = () => {
    const filteredJobs = jobs.filter(j => j.category === 'FILTERED');
    return (
      <div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 flex items-start">
          <ShieldAlert size={20} className="text-red-600 mt-0.5 mr-3 shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900 text-sm">Le Mur de Protection</h3>
            <p className="text-xs text-red-700 mt-1">
              Ces {filteredJobs.length} offres ont été interceptées automatiquement par vos règles de Blacklist.
            </p>
          </div>
        </div>
        {filteredJobs.length === 0 && (
           <p className="text-center text-gray-400 py-10 text-sm">Le filtre est vide. Tout est calme.</p>
        )}
        {filteredJobs.map(job => (
          <JobCard key={job.id} job={job} isFilteredView={true} showActions={true} />
        ))}
      </div>
    );
  };

  const SettingsView = () => {
    return (
      <div className="space-y-6 pb-20">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
          <h2 className="text-lg font-bold text-gray-800 mb-2">Le Cerveau</h2>
          <p className="text-sm text-gray-600">Configurez ici les règles qui trient automatiquement votre Inbox.</p>
        </div>

        {/* Whitelist Section */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-semibold text-green-700 flex items-center">
               <CheckCircle size={18} className="mr-2"/> Whitelist (Cibles)
             </h3>
             <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full">{whitelist.length} règles</span>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
            {whitelist.map(term => (
              <span key={term} className="px-3 py-1.5 bg-white text-gray-700 rounded-lg text-sm border border-green-200 shadow-sm flex items-center group">
                {term}
                <button onClick={() => setWhitelist(whitelist.filter(t => t !== term))} className="ml-2 text-green-300 hover:text-red-500 transition-colors">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input 
              value={newWhitelistTerm}
              onChange={(e) => setNewWhitelistTerm(e.target.value)}
              placeholder="Ajouter un mot-clé cible..." 
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" 
            />
            <button 
              onClick={() => {if(newWhitelistTerm) {setWhitelist([...whitelist, newWhitelistTerm]); setNewWhitelistTerm('');}}}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Ajouter
            </button>
          </div>
        </div>

        {/* Blacklist Section */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
             <h3 className="font-semibold text-red-700 flex items-center">
                <ShieldAlert size={18} className="mr-2"/> Blacklist (Exclusions)
             </h3>
             <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">{blacklist.length} règles</span>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
            {blacklist.map(term => (
              <span key={term} className="px-3 py-1.5 bg-white text-gray-700 rounded-lg text-sm border border-red-200 shadow-sm flex items-center">
                {term}
                <button onClick={() => setBlacklist(blacklist.filter(t => t !== term))} className="ml-2 text-red-300 hover:text-red-500 transition-colors">
                   <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input 
              value={newBlacklistTerm}
              onChange={(e) => setNewBlacklistTerm(e.target.value)}
              placeholder="Exclure un mot ou une entreprise..." 
              className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none" 
            />
            <button 
              onClick={() => {if(newBlacklistTerm) {setBlacklist([...blacklist, newBlacklistTerm]); setNewBlacklistTerm('');}}}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Ajouter
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- LAYOUT ---

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      {/* Top Navigation */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
              J
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 hidden sm:block">
              JobStream <span className="text-gray-300 text-sm font-light">v12</span>
            </h1>
          </div>
          
          <nav className="flex bg-gray-50 p-1 rounded-lg">
            {[
              { id: 'INBOX', icon: Inbox, label: 'Inbox' },
              { id: 'PROCESSED', icon: CheckCircle, label: 'Traitées' },
              { id: 'FILTERED', icon: ShieldAlert, label: 'Filtrés' },
              { id: 'SETTINGS', icon: Settings, label: 'Réglages' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  relative px-3 sm:px-4 py-2 rounded-md transition-all duration-200 text-xs font-medium flex items-center justify-center
                  ${activeTab === tab.id 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}
                `}
              >
                <tab.icon size={18} className="sm:mr-2" />
                <span className="hidden sm:inline">{tab.label}</span>
                {/* Petit dot pour notifier dans l'inbox (optionnel) */}
                {tab.id === 'INBOX' && jobs.filter(j => j.status === 'INBOX' && j.category !== 'FILTERED').length > 0 && activeTab !== 'INBOX' && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full sm:hidden"></span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-6">
        {activeTab === 'INBOX' && <InboxView />}
        {activeTab === 'PROCESSED' && <ProcessedView />}
        {activeTab === 'FILTERED' && <FilteredView />}
        {activeTab === 'SETTINGS' && <SettingsView />}
      </main>

      {/* --- MODAL AI DETECTIVE --- */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setAiModalOpen(false)}></div>
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
            {/* Header Modal */}
            <div className="bg-indigo-600 p-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                   <Bot size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">AI Detective</h3>
                  <p className="text-indigo-200 text-xs">Analyse sémantique de l'auteur</p>
                </div>
              </div>
              <button onClick={() => setAiModalOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6">
              {aiResult === 'loading' ? (
                <div className="text-center py-10 space-y-4">
                  <div className="relative mx-auto w-16 h-16">
                     <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                     <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <p className="text-gray-500 font-medium animate-pulse">L'IA analyse {analyzingJob?.company}...</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className={`p-5 rounded-xl border ${aiResult.isPlatformOrAgency ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                       {aiResult.isPlatformOrAgency ? <AlertTriangle className="text-orange-600" size={20}/> : <CheckCircle className="text-green-600" size={20}/>}
                       <h4 className={`font-bold ${aiResult.isPlatformOrAgency ? 'text-orange-800' : 'text-green-800'}`}>
                         {aiResult.type}
                       </h4>
                    </div>
                    <p className={`text-sm leading-relaxed ${aiResult.isPlatformOrAgency ? 'text-orange-700' : 'text-green-700'}`}>
                      "{aiResult.reason}"
                    </p>
                  </div>
                  
                  {aiResult.isPlatformOrAgency ? (
                    <>
                      <p className="text-gray-600 text-sm">
                        L'IA recommande de bannir <strong>{analyzingJob?.company}</strong> pour nettoyer votre flux futur.
                      </p>
                      <div className="flex gap-3 pt-2">
                        <button 
                          onClick={() => setAiModalOpen(false)}
                          className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                        >
                          Ignorer
                        </button>
                        <button 
                          onClick={confirmBanAuthor}
                          className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md shadow-red-200 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          <ShieldAlert size={18} />
                          Bannir l'auteur
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="pt-2">
                      <button 
                        onClick={() => setAiModalOpen(false)}
                        className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-black transition-colors"
                      >
                        Compris, retour à l'Inbox
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}