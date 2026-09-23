import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Link as LinkIcon,
  Clipboard,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  Film,
  Music,
  ExternalLink,
  RefreshCw,
  Server,
  Code2,
  History,
  ShieldCheck,
  ChevronRight,
  Info,
  Check,
  Copy,
  Zap,
  Globe,
  Settings,
  Sliders,
  Share2,
  Cpu
} from 'lucide-react';

interface MediaFormat {
  format_id: string;
  resolution: string;
  height: number | null;
  width: number | null;
  ext: string;
  filesize_approx: string | null;
  filesize_bytes: number | null;
  quality_label: string;
  format_note?: string | null;
  vcodec?: string | null;
  acodec?: string | null;
  type: string;
  has_audio: boolean;
  direct_url?: string | null;
  needs_merge?: boolean;
}

interface VideoInfo {
  id: string;
  title: string;
  thumbnail?: string | null;
  duration_string: string;
  duration_seconds?: number | null;
  platform: string;
  author?: string | null;
  view_count?: number | null;
  description?: string | null;
  original_url: string;
  formats: MediaFormat[];
  audio_formats: MediaFormat[];
}

interface HistoryItem {
  id: string;
  title: string;
  thumbnail?: string | null;
  platform: string;
  original_url: string;
  timestamp: number;
}

// Burmese & English dictionary
const TRANSLATIONS = {
  en: {
    badge: 'Universal Social Media & 4K Extractor',
    titleMain: 'Download Any Social Video',
    titleGrad: 'Without Limits or Watermarks',
    desc: 'Extract source video directly from TikTok, Instagram Reels, YouTube, and Facebook with custom audio tracks and FFmpeg merging.',
    placeholder: 'Paste TikTok, Instagram, YouTube, or Facebook video URL...',
    fetchBtn: 'Fetch Media',
    extracting: 'Extracting...',
    paste: 'Paste',
    clear: 'Clear',
    quickLinks: 'Sample links:',
    videoTab: 'Video Formats (MP4)',
    audioTab: 'MP3 Audio Only',
    qualityCol: 'Quality Label',
    containerCol: 'Container',
    sizeCol: 'Est. Size',
    audioTrackCol: 'Audio Track',
    actionCol: 'Action',
    downloadBtn: 'Download',
    mergingBtn: 'Merge & Save',
    saveMp3Btn: 'Download MP3',
    audioIncluded: 'Audio Included',
    videoOnly: 'Video Only',
    needsMergeNote: 'Auto-merges with FFmpeg',
    historyTitle: 'Recent Downloads',
    noHistory: 'No downloads yet. Paste a link to get started!',
    clearHistory: 'Clear History',
    settingsTitle: 'Engine & Proxy Configuration',
    settingsDesc: 'Configure residential proxy and cookies for restricted social platforms.',
    proxyLabel: 'Custom Proxy URL (Optional)',
    proxyPlaceholder: 'http://user:pass@host:port or socks5://...',
    cookiesLabel: 'Session Cookies (Optional - for Login-Restricted Videos)',
    cookiesPlaceholder: 'Paste Netscape cookies.txt content here...',
    saveSettings: 'Save Settings',
    installApp: 'Install App',
    deployBtn: 'Setup & Deploy Guide',
    healthOnline: 'Pro Engine Online',
  },
  my: {
    badge: 'TikTok, Reels, YouTube 4K ဒေါင်းလုဒ်စနစ်',
    titleMain: 'မည်သည့် Social Video မဆို',
    titleGrad: 'Watermark မပါဘဲ HD/4K ဒေါင်းလုဒ်ရယူပါ',
    desc: 'TikTok, Instagram Reels, YouTube 4K နှင့် Facebook မှ ရုပ်သံနှင့် သီချင်းများကို မူရင်းအရည်အသွေးအတိုင်း အလွယ်တကူ ရယူနိုင်ပါသည်။',
    placeholder: 'TikTok, Instagram, YouTube သို့မဟုတ် Facebook link ကို ဤနေရာတွင် paste လုပ်ပါ...',
    fetchBtn: 'ရှာဖွေထုတ်ယူမည်',
    extracting: 'စစ်ဆေးနေပါသည်...',
    paste: 'ကူးထည့်မည်',
    clear: 'ဖျက်မည်',
    quickLinks: 'စမ်းသပ်ရန် link များ:',
    videoTab: 'ဗီဒီယို ဖိုင်များ (MP4)',
    audioTab: 'အသံသီးသန့် (MP3)',
    qualityCol: 'အရည်အသွေး',
    containerCol: 'အမျိုးအစား',
    sizeCol: 'ဖိုင်ဆိုဒ် ခန့်မှန်း',
    audioTrackCol: 'အသံပါဝင်မှု',
    actionCol: 'ဒေါင်းလုဒ်',
    downloadBtn: 'ဒေါင်းလုဒ်ဆွဲမည်',
    mergingBtn: 'ပေါင်းစပ်ပြီး ဒေါင်းမည်',
    saveMp3Btn: 'MP3 သီးသန့်ယူမည်',
    audioIncluded: 'အသံပါဝင်သည်',
    videoOnly: 'ရုပ်သံသီးသန့်',
    needsMergeNote: 'FFmpeg ဖြင့် အသံ+ရုပ် ပေါင်းစပ်ပေးမည်',
    historyTitle: 'ယခင်ဒေါင်းလုဒ်မှတ်တမ်း',
    noHistory: 'မှတ်တမ်း မရှိသေးပါ။ link ထည့်ပြီး စတင်လိုက်ပါ!',
    clearHistory: 'မှတ်တမ်းဖျက်မည်',
    settingsTitle: 'Proxy နှင့် System Setting များ',
    settingsDesc: 'တားမြစ်ထားသော video များအတွက် Proxy နှင့် Cookies များ သတ်မှတ်နိုင်ပါသည်။',
    proxyLabel: 'Proxy URL (လိုအပ်ပါက ထည့်ရန်)',
    proxyPlaceholder: 'http://user:pass@host:port သို့မဟုတ် socks5://...',
    cookiesLabel: 'Session Cookies (Login တောင်းသော video များအတွက်)',
    cookiesPlaceholder: 'Netscape cookies.txt အချက်အလက်များ ထည့်ရန်...',
    saveSettings: 'သိမ်းဆည်းမည်',
    installApp: 'App အဖြစ် သွင်းမည်',
    deployBtn: 'အသုံးပြုပုံနှင့် Deploy လမ်းညွှန်',
    healthOnline: 'စနစ်အဆင်သင့်ဖြစ်ပါသည်',
  }
};

export default function App() {
  const [lang, setLang] = useState<'en' | 'my'>('my');
  const t = TRANSLATIONS[lang];

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [mergingFormatId, setMergingFormatId] = useState<string | null>(null);
  const [error, setError] = useState<{ title: string; detail: string } | null>(null);
  const [videoData, setVideoData] = useState<VideoInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'video' | 'audio'>('video');
  
  // Modals
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [previewStreamUrl, setPreviewStreamUrl] = useState<string | null>(null);
  const [showDeployGuide, setShowDeployGuide] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Custom Settings (Proxy & Cookies)
  const [customProxy, setCustomProxy] = useState(() => localStorage.getItem('omnistream_proxy') || '');
  const [customCookies, setCustomCookies] = useState(() => localStorage.getItem('omnistream_cookies') || '');
  
  // PWA Install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // System Health
  const [backendHealth, setBackendHealth] = useState<{
    status: string;
    yt_dlp_version?: string;
    ffmpeg_available?: boolean;
  } | null>(null);

  // History state
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('omnistream_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // PWA beforeinstallprompt capture
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  // Health check on mount
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 'healthy') {
          setBackendHealth(data);
        }
      })
      .catch(() => {
        setBackendHealth({ status: 'connecting' });
      });
  }, []);

  // Save history
  useEffect(() => {
    try {
      localStorage.setItem('omnistream_history', JSON.stringify(history.slice(0, 20)));
    } catch (e) {
      console.error(e);
    }
  }, [history]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        if (inputRef.current) inputRef.current.focus();
      }
    } catch {
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const handleClear = () => {
    setUrl('');
    setError(null);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleSubmit = async (e?: React.FormEvent, overrideUrl?: string) => {
    if (e) e.preventDefault();
    const targetUrl = (overrideUrl || url).trim();

    if (!targetUrl) {
      setError({
        title: lang === 'my' ? 'Link မရှိပါ' : 'Empty URL',
        detail: lang === 'my' 
          ? 'ကျေးဇူးပြု၍ TikTok, Instagram, YouTube သို့မဟုတ် Facebook link တစ်ခုခုကို ကူးယူထည့်သွင်းပေးပါ။' 
          : 'Please paste or enter a valid video link from TikTok, Instagram, YouTube, or Facebook.',
      });
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingStep(lang === 'my' ? 'Extractor စနစ်သို့ ချိတ်ဆက်နေပါသည်...' : 'Connecting to extractor backend...');

    try {
      setLoadingStep(lang === 'my' ? 'ဗီဒီယို အချက်အလက်နှင့် formats များကို ထုတ်ယူနေပါသည်...' : 'Extracting formats and metadata with yt-dlp...');
      const response = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: targetUrl,
          custom_proxy: customProxy || undefined 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Failed to extract video information');
      }

      setVideoData(data);

      // Add to history
      const newItem: HistoryItem = {
        id: data.id,
        title: data.title,
        thumbnail: data.thumbnail,
        platform: data.platform,
        original_url: targetUrl,
        timestamp: Date.now(),
      };
      setHistory((prev) => [newItem, ...prev.filter((item) => item.original_url !== targetUrl)]);
    } catch (err: any) {
      setError({
        title: lang === 'my' ? 'ဗီဒီယို ထုတ်ယူ၍မရပါ' : 'Media Extraction Failed',
        detail: err.message || (lang === 'my' ? 'Link မှန်ကန်မှုရှိမရှိနှင့် Public ဖြစ်မဖြစ် စစ်ဆေးပေးပါ။' : 'Please check if video is public and accessible.'),
      });
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const executeDownload = async (format: MediaFormat, isAudio: boolean) => {
    if (!videoData) return;

    // If format needs FFmpeg server-side merging (e.g. YouTube 1080p/4K without combined audio)
    if (format.needs_merge) {
      setMergingFormatId(format.format_id);
      try {
        const queryParams = new URLSearchParams({
          url: videoData.original_url,
          format_id: format.format_id,
          ext: 'mp4',
          audio_only: 'false',
        });
        
        // Trigger server merge download
        window.location.href = `/api/merge-download?${queryParams.toString()}`;
      } finally {
        setTimeout(() => setMergingFormatId(null), 3000);
      }
      return;
    }

    // Direct CDN download if available & not expiring
    if (format.direct_url && !format.direct_url.includes('googlevideo.com')) {
      const a = document.createElement('a');
      a.href = format.direct_url;
      a.download = `${videoData.title.slice(0, 40)}.${format.ext}`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Call /api/download
    try {
      const queryParams = new URLSearchParams({
        url: videoData.original_url,
        format_id: format.format_id,
        type: isAudio ? 'audio' : 'video',
        ext: format.ext,
        needs_merge: String(Boolean(format.needs_merge))
      });

      const res = await fetch(`/api/download?${queryParams.toString()}`);
      const info = await res.json();

      if (info.proxy_download_url) {
        window.location.href = info.proxy_download_url;
      } else if (info.direct_url) {
        const a = document.createElement('a');
        a.href = info.direct_url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.download = info.filename || `media.${format.ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        window.open(videoData.original_url, '_blank');
      }
    } catch (err: any) {
      alert('Download error: ' + err.message);
    }
  };

  const handlePreview = (streamUrl?: string | null) => {
    if (streamUrl) {
      setPreviewStreamUrl(streamUrl);
      setShowPlayerModal(true);
    } else if (videoData?.formats[0]?.direct_url) {
      setPreviewStreamUrl(videoData.formats[0].direct_url);
      setShowPlayerModal(true);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const saveCustomSettings = () => {
    localStorage.setItem('omnistream_proxy', customProxy);
    localStorage.setItem('omnistream_cookies', customCookies);
    setShowSettingsModal(false);
  };

  const getPlatformBadgeColor = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('tiktok')) return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
    if (p.includes('instagram')) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    if (p.includes('youtube')) return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (p.includes('facebook')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-44 left-1/2 -translate-x-1/2 w-[850px] h-[500px] bg-purple-600/15 blur-[140px] rounded-full" />
        <div className="absolute top-1/4 -left-36 w-[550px] h-[550px] bg-indigo-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-12 -right-36 w-[600px] h-[600px] bg-pink-600/10 blur-[160px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-600/25">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                  OmniStream
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  v1.1 FFmpeg
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">FastAPI & yt-dlp Video Extractor</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'my' ? 'en' : 'my')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <span>{lang === 'my' ? '🇲🇲 မြန်မာ' : '🇬🇧 EN'}</span>
            </button>

            {/* PWA Install Button */}
            {isInstallable && (
              <button
                onClick={handleInstallPWA}
                className="hidden sm:flex px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.installApp}</span>
              </button>
            )}

            {/* Settings (Proxy & Cookies) */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Proxy & Cookies Configuration"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* History Button */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
              title={t.historyTitle}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.historyTitle}</span>
              {history.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {history.length}
                </span>
              )}
            </button>

            {/* Deploy / Guide */}
            <button
              onClick={() => setShowDeployGuide(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 hover:text-purple-200 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{t.deployBtn}</span>
              <span className="lg:hidden">Guide</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 relative z-10">
        
        {/* Hero title */}
        <div className="text-center space-y-4 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-purple-500/30 text-purple-300 text-xs font-semibold shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>{t.badge}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {t.titleMain} <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300">
              {t.titleGrad}
            </span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            {t.desc}
          </p>
        </div>

        {/* Platform tags */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {[
            { name: 'TikTok (No Watermark)', dot: 'bg-pink-500' },
            { name: 'Instagram Reels', dot: 'bg-purple-500' },
            { name: 'YouTube 4K & Shorts', dot: 'bg-red-500' },
            { name: 'Facebook HD', dot: 'bg-blue-500' },
            { name: 'MP3 (320kbps)', dot: 'bg-emerald-500' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-medium text-slate-300 shadow-sm"
            >
              <span className={`w-2 h-2 rounded-full ${item.dot}`} />
              <span>{item.name}</span>
            </div>
          ))}
        </div>

        {/* Input Form Box */}
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-2xl p-3 sm:p-5 shadow-2xl shadow-purple-950/20">
          <form onSubmit={(e) => handleSubmit(e)} className="space-y-3">
            <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <LinkIcon className="w-5 h-5 text-slate-500" />
                </div>
                <input
                  ref={inputRef}
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t.placeholder}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl pl-11 pr-24 py-3.5 text-sm sm:text-base text-slate-100 placeholder-slate-500 transition-all outline-none"
                />

                {/* Inside Input Action Buttons */}
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1.5">
                  {url && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                      title={t.clear}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                    {t.paste}
                  </button>
                </div>
              </div>

              {/* Submit / Fetch Button */}
              <button
                type="submit"
                disabled={loading}
                className="relative group overflow-hidden px-7 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm sm:text-base shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 transition-all duration-200 flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{t.extracting}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>{t.fetchBtn}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo links */}
          <div className="mt-3.5 pt-3.5 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
            <span className="font-medium flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              {t.quickLinks}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setUrl('https://www.youtube.com/watch?v=aqz-KE-bpKQ');
                  handleSubmit(undefined, 'https://www.youtube.com/watch?v=aqz-KE-bpKQ');
                }}
                className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition cursor-pointer"
              >
                Big Buck Bunny (4K 60fps)
              </button>
              <span>•</span>
              <button
                onClick={() => {
                  setUrl('https://www.youtube.com/watch?v=21X5lGlDOfg');
                  handleSubmit(undefined, 'https://www.youtube.com/watch?v=21X5lGlDOfg');
                }}
                className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition cursor-pointer"
              >
                Space Reel
              </button>
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="mt-6 p-6 rounded-2xl bg-slate-900/60 border border-purple-500/20 backdrop-blur-md text-center space-y-3">
            <div className="inline-flex p-3 rounded-full bg-purple-500/10 text-purple-400 animate-pulse">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <h4 className="font-bold text-white text-base">
              {lang === 'my' ? 'ဗီဒီယို လင့်ခ်ကို စစ်ဆေးနေပါသည်' : 'Processing Video Link'}
            </h4>
            <p className="text-xs sm:text-sm text-purple-300 font-mono">{loadingStep}</p>
            <div className="w-48 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" />
            </div>
          </div>
        )}

        {/* Error Alert Box */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-200 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-300">{error.title}</h4>
              <p className="text-xs sm:text-sm text-red-200/90 mt-0.5">{error.detail}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Video Result Card */}
        {videoData && !loading && (
          <div className="mt-8 space-y-6">
            
            {/* Overview Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 backdrop-blur-md shadow-xl">
              <div className="flex flex-col md:flex-row gap-5 items-start">
                
                {/* Thumbnail Preview */}
                <div className="relative w-full md:w-72 aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 group">
                  <img
                    src={videoData.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'}
                    alt={videoData.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                    <button
                      onClick={() => handlePreview()}
                      className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition cursor-pointer"
                      title="Preview"
                    >
                      <Play className="w-5 h-5 ml-0.5" />
                    </button>
                  </div>
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-xs font-mono font-medium backdrop-blur-sm">
                    {videoData.duration_string}
                  </span>
                  <span
                    className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-md ${getPlatformBadgeColor(
                      videoData.platform
                    )}`}
                  >
                    {videoData.platform}
                  </span>
                </div>

                {/* Meta details */}
                <div className="flex-1 min-w-0 space-y-3">
                  <h2 className="text-lg sm:text-xl font-bold text-white leading-snug line-clamp-2">
                    {videoData.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span className="font-medium text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      {videoData.author || 'Author'}
                    </span>
                    {videoData.view_count && (
                      <span className="flex items-center gap-1">
                        👁️ {Number(videoData.view_count).toLocaleString()} views
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-mono text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" /> Direct Verified
                    </span>
                  </div>

                  {videoData.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {videoData.description}
                    </p>
                  )}

                  {/* Format Category Tabs */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('video')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        activeTab === 'video'
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" />
                      {t.videoTab} ({videoData.formats.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('audio')}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        activeTab === 'audio'
                          ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Music className="w-3.5 h-3.5" />
                      {t.audioTab} ({videoData.audio_formats.length})
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Video Formats Table */}
            {activeTab === 'video' && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md">
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-purple-400" />
                    <h3 className="font-bold text-sm text-white">
                      {lang === 'my' ? 'ရယူနိုင်သော ရုပ်ထွက်အရည်အသွေးများ' : 'Available Video Resolutions'}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">MP4 • 1080p / 4K Ultra HD</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-xs font-semibold text-slate-400 bg-slate-950/60 border-b border-slate-800/80">
                        <th className="py-3.5 px-4 sm:px-6">{t.qualityCol}</th>
                        <th className="py-3.5 px-4">{t.containerCol}</th>
                        <th className="py-3.5 px-4">{t.sizeCol}</th>
                        <th className="py-3.5 px-4">{t.audioTrackCol}</th>
                        <th className="py-3.5 px-4 sm:px-6 text-right">{t.actionCol}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {videoData.formats.map((f, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 sm:px-6 font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <span>{f.quality_label}</span>
                              {f.height && f.height >= 1080 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                                  HD
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">{f.resolution}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-300 uppercase">
                            {f.ext}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-400">
                            {f.filesize_approx || 'Adaptive Stream'}
                          </td>
                          <td className="py-3.5 px-4">
                            {f.has_audio ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" /> {t.audioIncluded}
                              </span>
                            ) : (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                                  {t.videoOnly}
                                </span>
                                <span className="text-[10px] text-purple-400 font-mono flex items-center gap-0.5">
                                  <Cpu className="w-3 h-3" /> {t.needsMergeNote}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 sm:px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {f.direct_url && (
                                <button
                                  onClick={() => handlePreview(f.direct_url)}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                                  title="Quick Preview"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                disabled={mergingFormatId === f.format_id}
                                onClick={() => executeDownload(f, false)}
                                className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                                  f.needs_merge
                                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
                                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20'
                                }`}
                              >
                                {mergingFormatId === f.format_id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Merging...</span>
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-3.5 h-3.5" />
                                    <span>{f.needs_merge ? t.mergingBtn : t.downloadBtn}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Audio Formats Table */}
            {activeTab === 'audio' && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md">
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-pink-400" />
                    <h3 className="font-bold text-sm text-white">
                      {lang === 'my' ? 'ရယူနိုင်သော သီချင်း/အသံဖိုင်များ' : 'Extracted Audio Tracks'}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">MP3 • 320kbps Stereo</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-xs font-semibold text-slate-400 bg-slate-950/60 border-b border-slate-800/80">
                        <th className="py-3.5 px-4 sm:px-6">{t.qualityCol}</th>
                        <th className="py-3.5 px-4">{t.containerCol}</th>
                        <th className="py-3.5 px-4">{t.sizeCol}</th>
                        <th className="py-3.5 px-4 sm:px-6 text-right">{t.actionCol}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {videoData.audio_formats.map((f, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 sm:px-6 font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <span>{f.quality_label}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-mono">
                                STEREO
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">{f.format_note}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-300 uppercase">
                            {f.ext}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-400">
                            {f.filesize_approx || 'Fast Audio Stream'}
                          </td>
                          <td className="py-3.5 px-4 sm:px-6 text-right">
                            <button
                              onClick={() => executeDownload(f, true)}
                              className="px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-xs shadow-md shadow-pink-600/20 transition flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {t.saveMp3Btn}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Feature Cards Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs">
              TT
            </div>
            <h4 className="font-semibold text-white text-sm">TikTok (No Watermark)</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'my'
                ? 'TikTok ရုပ်သံများတွင် logo နှင့် username မပါဘဲ မူရင်း HD အတိုင်း တိုက်ရိုက်ဒေါင်းလုဒ်ရယူနိုင်ပါသည်။'
                : "Extract clean high-bitrate video directly from TikTok's CDN without watermark logos or handles."}
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
              IG
            </div>
            <h4 className="font-semibold text-white text-sm">Instagram Reels & Posts</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'my'
                ? 'Reels, Posts နှင့် အများပြည်သူကြည့်ရှုခွင့်ရှိသော ဗီဒီယိုများကို 1080p MP4 ဖြင့် သိမ်းဆည်းနိုင်ပါသည်။'
                : 'Supports single reels and video posts in full framerate 1080p MP4 format.'}
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs">
              YT
            </div>
            <h4 className="font-semibold text-white text-sm">YouTube 4K & MP3</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'my'
                ? 'Shorts နှင့် ဗီဒီယိုရှည်များကို 4K Ultra HD အထိ သို့မဟုတ် 320kbps MP3 အသံသီးသန့် ရယူနိုင်ပါသည်။'
                : 'Extract Shorts and full videos up to 4K UHD 60fps, or convert directly into crisp 320kbps MP3 tracks.'}
            </p>
          </div>
        </div>

        {/* Standalone Link Banner */}
        <div className="mt-8 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              {lang === 'my'
                ? 'Build tool မပါဘဲ Single-file အနေဖြင့် သုံးချင်ပါက Standalone HTML ကို ဖွင့်ပါ'
                : 'Need the pure Vanilla HTML version without build tools?'}
            </span>
          </div>
          <a
            href="/standalone"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 underline font-medium flex items-center gap-1"
          >
            Standalone HTML <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </main>

      {/* Settings Modal (Proxy & Cookies) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">{t.settingsTitle}</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">{t.settingsDesc}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.proxyLabel}
                </label>
                <input
                  type="text"
                  value={customProxy}
                  onChange={(e) => setCustomProxy(e.target.value)}
                  placeholder={t.proxyPlaceholder}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.cookiesLabel}
                </label>
                <textarea
                  rows={4}
                  value={customCookies}
                  onChange={(e) => setCustomCookies(e.target.value)}
                  placeholder={t.cookiesPlaceholder}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-xl p-3 text-xs text-slate-200 outline-none font-mono resize-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveCustomSettings}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
              >
                {t.saveSettings}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Slide-over Drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowHistory(false)}
          />
          <div className="absolute inset-y-0 right-0 max-w-md w-full bg-slate-900 border-l border-slate-800 shadow-2xl p-6 flex flex-col z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-white text-base">{t.historyTitle}</h3>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">{t.noHistory}</div>
              ) : (
                history.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setUrl(item.original_url);
                      handleSubmit(undefined, item.original_url);
                      setShowHistory(false);
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-purple-500/50 hover:bg-slate-950 transition cursor-pointer group"
                  >
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-16 h-11 object-cover rounded-lg bg-slate-900 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-11 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                        <Film className="w-4 h-4 text-slate-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-purple-300">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {item.platform}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 shrink-0" />
                  </div>
                ))
              )}
            </div>

            {history.length > 0 && (
              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={() => setHistory([])}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-400 text-xs font-medium transition cursor-pointer"
                >
                  {t.clearHistory}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {showPlayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white truncate max-w-md">
                {videoData?.title || 'Video Preview'}
              </h3>
              <button
                onClick={() => {
                  setShowPlayerModal(false);
                  setPreviewStreamUrl(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              {previewStreamUrl ? (
                <video src={previewStreamUrl} controls autoPlay className="w-full h-full object-contain">
                  Your browser does not support video playback.
                </video>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  Preview not available for this stream. Please use Download.
                </div>
              )}
            </div>
            <div className="p-3 bg-slate-950 text-right flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowPlayerModal(false);
                  setPreviewStreamUrl(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deployment & Setup Guide Modal */}
      {showDeployGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {lang === 'my' ? 'သင်ပြုလုပ်ရန် လိုအပ်သည်များနှင့် Deploy လမ်းညွှန်' : 'Backend & Deployment Guide'}
                  </h3>
                  <p className="text-xs text-slate-400">FastAPI + yt-dlp + FFmpeg Production Architecture</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeployGuide(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-300">
              {/* Requirements for User */}
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/40 space-y-2">
                <h4 className="font-bold text-purple-200 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  {lang === 'my' ? 'သင်လုပ်ဆောင်ပေးရန် လိုအပ်သောအချက်များ (Checklist):' : 'What You Need to Do:'}
                </h4>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
                  <li>
                    <strong>FFmpeg တပ်ဆင်ထားခြင်း:</strong> YouTube 1080p/4K ၏ အသံနှင့်ရုပ်သံကို server ပေါ်တွင် ပေါင်းစပ်ရန် သင့်စက်တွင် FFmpeg ရှိရန် လိုအပ်ပါသည်။ (Ubuntu: <code className="bg-slate-800 px-1 py-0.5 rounded text-purple-300">sudo apt install ffmpeg</code> | Mac: <code className="bg-slate-800 px-1 py-0.5 rounded text-purple-300">brew install ffmpeg</code> | Windows: <code className="bg-slate-800 px-1 py-0.5 rounded text-purple-300">winget install ffmpeg</code>)
                  </li>
                  <li>
                    <strong>Instagram/Facebook Login တောင်းသော video များ:</strong> သင့် browser မှ <code className="bg-slate-800 px-1 py-0.5 rounded text-purple-300">cookies.txt</code> export ထုတ်ပြီး project folder ထဲ ထည့်ပေးပါ (Settings ထဲတွင်လည်း paste လုပ်နိုင်သည်)။
                  </li>
                  <li>
                    <strong>Render/Cloud ပေါ် တင်ပါက:</strong> Datacenter IP block မခံရစေရန် Proxy တစ်ခုခု (ဥပမာ- Webshare သို့မဟုတ် IPRoyal) ကို <code className="bg-slate-800 px-1 py-0.5 rounded text-purple-300">PROXY_URL</code> အဖြစ် ထည့်ပေးပါက ၁၀၀% စိတ်ချရပါသည်။
                  </li>
                </ul>
              </div>

              {/* Local Command */}
              <div>
                <h4 className="font-bold text-white flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">
                    1
                  </span>
                  Run Locally
                </h4>
                <div className="relative bg-slate-950 rounded-xl p-3 font-mono text-xs text-slate-300 border border-slate-800">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        '# Install packages\npip install -r requirements.txt\n\n# Run FastAPI server on port 8000\nuvicorn main:app --host 0.0.0.0 --port 8000 --reload',
                        'cmd-local'
                      )
                    }
                    className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                  >
                    {copiedCode === 'cmd-local' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <pre className="overflow-x-auto leading-relaxed">
{`# Install packages
pip install -r requirements.txt

# Run FastAPI server on port 8000
uvicorn main:app --host 0.0.0.0 --port 8000 --reload`}
                  </pre>
                </div>
              </div>

              {/* Deploy on Render */}
              <div>
                <h4 className="font-bold text-white flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                    2
                  </span>
                  Free Deploy on Render.com (Backend)
                </h4>
                <ol className="list-decimal pl-5 space-y-1 text-slate-300 text-xs">
                  <li>Render.com တွင် <strong>New Web Service</strong> ဖွင့်ပြီး GitHub ချိတ်ပါ။</li>
                  <li>Build Command: <code className="bg-slate-800 px-1 py-0.5 rounded text-purple-300">pip install -r requirements.txt</code></li>
                  <li>Start Command: <code className="bg-slate-800 px-1 py-0.5 rounded text-purple-300">uvicorn main:app --host 0.0.0.0 --port $PORT</code></li>
                  <li>Free Plan ရွေးပြီး Deploy နှိပ်ပါ။</li>
                </ol>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowDeployGuide(false)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs cursor-pointer"
              >
                {lang === 'my' ? 'နားလည်ပါပြီ' : 'Got It'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/80 text-xs text-slate-500 py-6 text-center">
        <p>OmniStream — Production Full-Stack Social Video Downloader (FastAPI + yt-dlp + FFmpeg).</p>
        <p className="mt-1 text-slate-600">
          {lang === 'my'
            ? 'ကိုယ်ပိုင်အသုံးပြုရန်နှင့် ပညာရေးရည်ရွယ်ချက်ဖြင့် ဖန်တီးထားပါသည်။'
            : 'Designed for personal backup and educational use. Respect creator copyright.'}
        </p>
      </footer>
    </div>
  );
}
