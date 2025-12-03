
import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { LoaderIcon, CopyIcon, MusicIcon, UserIcon, UploadIcon } from './Icons';

interface MusicGeneratorProps {
  apiKey: string;
}

interface SongResult {
  song_title: string;
  style_description: string;
  lyrics: string;
  exclude_styles: string;
  weirdness: string;
  style_influence: string;
}

// Data Categories (Same as before)
const genreCategories = {
    "Healing & Tần số (Chakra & Frequency)": [
        "174Hz (Pain Relief)", "285Hz (Healing Tissues)", "396Hz (Liberating Guilt)", 
        "417Hz (Undoing Situations)", "528Hz (Miracle/DNA Repair)", "639Hz (Connecting Relationships)", 
        "741Hz (Awakening Intuition)", "852Hz (Returning to Spiritual Order)", "963Hz (Divine Consciousness)",
        "432Hz (Universe Frequency)",
        "Alpha Waves (Focus/Relax)", "Theta Waves (Deep Meditation)", "Delta Waves (Deep Sleep)", 
        "Binaural Beats", "Sound Bath", "Nature Sounds", "Ethereal Choir", "Deep Space Ambient",
        "Tibetan Singing Bowls"
    ],
    "Pop & Thịnh hành": [
        "Pop", "K-Pop", "C-Pop", "Vietnamese Pop Ballad", 
        "Indie Pop", "Bedroom Pop", "Pop cổ điển", "Dance"
    ],
    "Hip Hop / R&B": [
        "Hip Hop", "Rap", "Trap", "R&B", "Neo Soul", "Lofi Hip Hop"
    ],
    "Nhạc Điện tử (EDM)": [
        "EDM", "Amapiano", "Deep House", "Chill House", "Techno", "Phonk", 
        "Synthwave", "Hyperpop", "Nu-Disco", "Industrial", "Remix Pop/Dance"
    ],
    "Rock / Indie": [
        "Rock", "Punk", "Metal", "Indie", "Alternative Rock"
    ],
    "Jazz / Soul / Funk": [
        "Jazz Ballad", "Classic Jazz", "Smooth Jazz", "Bossa Nova", 
        "Soul", "Funk", "Blues", "Lounge", "Noir Jazz"
    ],
    "Dân gian & Thế giới": [
        "Worship Music", "Brazilian Catholic Music", "Country", "Folk", "Afrobeats", "Reggaeton", "Gospel", 
        "Nhạc Trịnh", "Bolero", "Latin"
    ],
    "Cổ điển & Nhạc phim": [
        "Epic Orchestral", "Ambient", "Cinematic", "Classical", "Neo-Classical"
    ]
};

const instrumentsList = [
    "Acoustic Guitar", "Electric Guitar", "Bass Guitar", "Drums", "Piano", 
    "Violin", "Saxophone", "Flute", "Synthesizer", "808 Bass", 
    "Tibetan Bowl", "Harp", "Strings", "Nature Sounds", "Wind Chimes",
    "Cello", "Trumpet", "Kalimba", "Koto", "Erhu", "Organ", "Choir",
    "Handpan", "Didgeridoo", "Gong", "Chimes", "Rainstick"
];

const MusicGenerator: React.FC<MusicGeneratorProps> = ({ apiKey }) => {
  // Tabs: Inspiration (Artists), Custom (Lyrics), Audio (Reference File)
  const [activeTab, setActiveTab] = useState<'inspiration' | 'custom' | 'audio'>('inspiration');
  
  // Selection State
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedExcludeInstruments, setSelectedExcludeInstruments] = useState<string[]>([]);
  
  // Audio Upload State
  const [uploadedAudio, setUploadedAudio] = useState<{ base64: string, mimeType: string, name: string } | null>(null);
  const [audioAnalysis, setAudioAnalysis] = useState<string>('');
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generation State
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SongResult[]>([]);
  const [activeResultTab, setActiveResultTab] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [customLyrics, setCustomLyrics] = useState('');
  const [additionalDescription, setAdditionalDescription] = useState('');
  const [language, setLanguage] = useState('Vietnamese');
  const [vocals, setVocals] = useState('Female Vocal');
  const [aiModel, setAiModel] = useState('gemini-2.5-flash');
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [creativity, setCreativity] = useState(50);
  const [songQuantity, setSongQuantity] = useState(1);
  const [searchInput, setSearchInput] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'artists' | 'songs' | 'search'>('artists');
  const [modalTitle, setModalTitle] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalItems, setModalItems] = useState<any[]>([]);
  const [selectedModalItems, setSelectedModalItems] = useState<any[]>([]);
  const [finalInspirationSongs, setFinalInspirationSongs] = useState<{title:string, artist:string}[]>([]);

  // Helpers
  const toggleSelection = (item: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const getCreativityLabel = (val: number) => {
    if (val < 10) return "Bản sao lời (Giống 90%)";
    if (val < 40) return "Phóng tác theo chủ đề";
    if (val < 75) return "Cân bằng & Sáng tạo";
    return "Sáng tạo đột phá & Dị";
  };

  const copyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch (e) { console.error("Copy failed", e); }
  };

  const callGemini = async (prompt: string, schemaType?: any, audioPart?: any) => {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const parts: any[] = [{ text: prompt }];
      if (audioPart) parts.push(audioPart);

      const config: any = { responseMimeType: "application/json" };
      if (schemaType) config.responseSchema = schemaType;

      const response = await ai.models.generateContent({
          model: aiModel,
          contents: { parts: parts },
          config: config
      });
      return JSON.parse(response.text || '[]');
  };

  // Handlers (Audio, Search, Generate) - Same Logic, updated UI below
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) { setError("File quá lớn. Vui lòng chọn file dưới 20MB."); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
          if (typeof reader.result === 'string') {
              const base64Data = reader.result.split(',')[1];
              setUploadedAudio({ base64: base64Data, mimeType: file.type, name: file.name });
              setAudioAnalysis('');
          }
      };
      reader.readAsDataURL(file);
  };

  const handleAnalyzeAudio = async () => {
      if (!uploadedAudio) return;
      setIsAnalyzingAudio(true); setError(null);
      try {
          const ai = new GoogleGenAI({ apiKey: apiKey });
          const prompt = "Hãy nghe đoạn nhạc này và phân tích chi tiết: 1. Thể loại (Genre). 2. Tâm trạng (Mood/Vibe). 3. Nhạc cụ nổi bật (Instruments). 4. Cấu trúc bài hát (Structure). 5. Tốc độ (BPM/Tempo). Hãy tóm tắt ngắn gọn các yếu tố này để dùng làm 'Prompt' cho nhạc sĩ AI.";
          const response = await ai.models.generateContent({
            model: aiModel,
            contents: { parts: [{ text: prompt }, { inlineData: { mimeType: uploadedAudio.mimeType, data: uploadedAudio.base64 } }] }
          });
          setAudioAnalysis(response.text || "Không thể phân tích.");
      } catch (e: any) { setError(`Lỗi phân tích audio: ${e.message}`); } finally { setIsAnalyzingAudio(false); }
  };

  const handleFindArtists = async () => {
    if (selectedGenres.length === 0) { setError("Vui lòng chọn ít nhất một thể loại nhạc ở Bước 1."); return; }
    setError(null); setShowModal(true); setModalMode('artists'); setModalTitle('Chọn nghệ sĩ gợi ý (có thể chọn nhiều)'); setModalLoading(true); setSelectedModalItems([]);
    const prompt = `Gợi ý 15 nghệ sĩ nổi tiếng phù hợp với thể loại: "${selectedGenres.join(', ')}", ngôn ngữ "${language}". Mô tả thêm: "${additionalDescription}". Trả về mảng JSON tên nghệ sĩ (String).`;
    try { const data = await callGemini(prompt, { type: Type.ARRAY, items: { type: Type.STRING } }); setModalItems(data); } catch (e: any) { setError(e.message); } finally { setModalLoading(false); }
  };

  const handleManualSearch = async () => {
      if(!searchInput.trim()) return;
      setError(null); setShowModal(true); setModalMode('search'); setModalTitle(`Kết quả tìm kiếm cho "${searchInput}"`); setModalLoading(true); setSelectedModalItems([]);
      const prompt = `Tìm bài hát: "${searchInput}". Trả về mảng JSON object {artist, title}.`;
      try { const data = await callGemini(prompt, { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { artist: { type: Type.STRING }, title: { type: Type.STRING } }, required: ['artist', 'title'] } }); setModalItems(data); } catch (e: any) { setError(e.message); } finally { setModalLoading(false); }
  };

  const handleModalConfirm = async () => {
      if (modalMode === 'artists') {
          setModalMode('songs'); setModalTitle('Chọn bài hát tiêu biểu'); setModalLoading(true); const artists = selectedModalItems; setSelectedModalItems([]); 
          const prompt = `15 bài hát hit của: ${artists.join(', ')}. Trả về mảng JSON object {artist, title}.`;
          try { const data = await callGemini(prompt, { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { artist: { type: Type.STRING }, title: { type: Type.STRING } }, required: ['artist', 'title'] } }); setModalItems(data); } catch (e: any) { setError(e.message); setShowModal(false); } finally { setModalLoading(false); }
      } else { setFinalInspirationSongs(prev => [...prev, ...selectedModalItems]); setShowModal(false); }
  };

  const handleGenerateSong = async () => {
    setIsLoading(true); setResults([]); setActiveResultTab(0); setError(null);
    let inspirationContext = '';
    if (activeTab === 'inspiration') {
        if (finalInspirationSongs.length > 0) inspirationContext += `\n- Dựa trên phong cách các bài hát: ${finalInspirationSongs.map(s => `"${s.title}" (${s.artist})`).join(', ')}.`;
        else inspirationContext += `\n- Không có bài hát mẫu cụ thể. Hãy tự do sáng tạo dựa trên Thể loại và Mô tả.`;
    } else if (activeTab === 'audio') {
        if (audioAnalysis) inspirationContext += `\n- Dựa trên PHÂN TÍCH AUDIO MẪU người dùng đã tải lên: "${audioAnalysis}". Hãy cố gắng tái tạo vibe, tempo và cấu trúc này.`;
        else { setError("Vui lòng phân tích file audio trước hoặc chuyển tab khác."); setIsLoading(false); return; }
    } else if (activeTab === 'custom') {
        if (!customLyrics.trim()) { setError("Vui lòng nhập lời bài hát."); setIsLoading(false); return; }
        inspirationContext += `\n- Dựa trên lời bài hát gốc do người dùng cung cấp:\n${customLyrics}`;
    }

    const creativityText = getCreativityLabel(creativity);
    const lyricsInstruction = isInstrumental
        ? "BÀI HÁT NÀY LÀ KHÔNG LỜI (INSTRUMENTAL). Phần 'lyrics' BẮT BUỘC phải là các thẻ cấu trúc và mô tả âm thanh, và TẤT CẢ phải được đặt trong dấu ngoặc vuông [ ]. Ví dụ: [Intro]\n[Soft piano melody starts]\n[Verse 1]\n[Drums kick in]. TUYỆT ĐỐI KHÔNG viết lời bài hát để hát."
        : `Viết lời bài hát bằng ngôn ngữ: ${language}. YÊU CẦU ĐỊNH DẠNG NGHIÊM NGẶT: 1. Cấu trúc bài hát rõ ràng: [Verse 1], [Chorus]... 2. BẮT BUỘC XUỐNG DÒNG sau mỗi câu hát. 3. Mỗi dòng lyric chỉ chứa 1 câu. 4. Hát bè đặt trong ngoặc đơn (). 5. Chỉ dẫn nhạc cụ trong ngoặc vuông []. 6. Ngôn ngữ Trung/Hàn/Nhật phải xuống dòng câu ngắn.`;

    const styleInstruction = "Write a professional, smooth, and detailed paragraph describing the musical style in ENGLISH (Max 1000 chars). Describe the combination of instruments, mood, tempo, and emotion in a poetic way. IMPORTANT: DO NOT use specific artist names or song titles in this description.";

    const prompt = `Bạn là chuyên gia tạo prompt cho Suno AI. Hãy sáng tác ${songQuantity} bài hát mới.
            1. THÔNG TIN CƠ BẢN:
            - Thể loại: ${selectedGenres.join(', ') || 'Tự chọn theo mô tả'}
            - Ngôn ngữ: ${language}
            - Giọng hát: ${isInstrumental ? 'Không (Instrumental)' : vocals}
            2. NGUỒN CẢM HỨNG: ${inspirationContext}
            - Mô tả ý tưởng: "${additionalDescription}"
            3. CẤU HÌNH:
            - Chế độ: ${isInstrumental ? 'Instrumental Only' : 'Có lời'}
            - Độ sáng tạo: "${creativityText}"
            - Nhạc cụ Include: ${selectedInstruments.join(', ')}
            - Nhạc cụ Exclude: ${selectedExcludeInstruments.join(', ')}

            YÊU CẦU ĐẦU RA (JSON Array):
            Mỗi bài hát là một object: "song_title", "style_description" (${styleInstruction}), "lyrics" (${lyricsInstruction}), "exclude_styles", "weirdness", "style_influence".`;

    try {
        const schema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { song_title: { type: Type.STRING }, style_description: { type: Type.STRING }, lyrics: { type: Type.STRING }, exclude_styles: { type: Type.STRING }, weirdness: { type: Type.STRING }, style_influence: { type: Type.STRING } }, required: ["song_title", "style_description", "lyrics", "exclude_styles", "weirdness", "style_influence"] } };
        const data = await callGemini(prompt, schema);
        setResults(data);
    } catch (e: any) { setError(e.message); } finally { setIsLoading(false); }
  };

  // --- UI Render ---
  const renderTagButton = (label: string, list: string[], setList: any, activeColor: string) => {
      const isSelected = list.includes(label);
      const activeStyle = activeColor === 'teal' 
        ? 'bg-[#2ed573] text-white border-[#2ed573] shadow-md transform -translate-y-0.5 font-bold' 
        : 'bg-[#ff6b81] text-white border-[#ff6b81] shadow-md transform -translate-y-0.5 font-bold';

      return (
      <button 
        key={label}
        onClick={() => toggleSelection(label, list, setList)}
        className={`px-3 py-1.5 rounded-xl text-xs transition-all 
            ${isSelected 
                ? activeStyle
                : `bg-white/5 border border-transparent text-gray-400 hover:bg-white/10 hover:text-white`}`}
      >
        {label}
      </button>
  )};

  const renderInstrumentButton = (label: string, type: 'include' | 'exclude') => {
      const list = type === 'include' ? selectedInstruments : selectedExcludeInstruments;
      const setList = type === 'include' ? setSelectedInstruments : setSelectedExcludeInstruments;
      const isActive = list.includes(label);
      const colorClass = type === 'include' 
        ? (isActive ? 'bg-[#2ed573] text-white' : 'bg-black/20 text-gray-400 hover:text-[#2ed573]')
        : (isActive ? 'bg-[#ff4757] text-white' : 'bg-black/20 text-gray-400 hover:text-[#ff4757]');

      return (
          <button 
            key={`${type}-${label}`}
            onClick={() => toggleSelection(label, list, setList)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${colorClass} ${isActive ? 'shadow-md transform -translate-y-0.5' : 'hover:bg-white/10'}`}
          >
            {label}
          </button>
      );
  }

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6 font-cute">
        
        {/* Left Controls */}
        <div className="lg:col-span-5 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pr-2">
            
            {/* 1. STYLE */}
            <div className="snow-card p-5">
                <h3 className="text-sm font-bold text-[#ffa502] border-b border-white/10 pb-3 mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <span className="bg-[#ffa502] text-black text-[10px] px-2 py-0.5 rounded-full font-bold">1</span> 
                    Định hình Phong cách
                </h3>
                <div className="space-y-6">
                    {Object.entries(genreCategories).map(([category, genres]) => (
                        <div key={category}>
                            <h4 className={`text-xs font-bold uppercase mb-2 tracking-wide ${category.includes("Healing") ? "text-[#2ed573]" : "text-[#1e90ff]"}`}>{category}</h4>
                            <div className="flex flex-wrap gap-2">
                                {genres.map(g => renderTagButton(g, selectedGenres, setSelectedGenres, category.includes("Healing") ? 'teal' : 'purple'))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t border-white/10">
                    <div>
                        <label className="text-xs text-[#ffa502] font-bold uppercase mb-1 ml-1 block">Ngôn ngữ</label>
                        <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-black/20 border-2 border-transparent focus:border-[#ffa502] rounded-xl p-2.5 text-sm text-white outline-none">
                            {['Vietnamese','English','Portuguese','Spanish','Korean','Japanese','Chinese','French','German','Italian','Russian','Instrumental'].map(l => <option key={l} value={l} className="bg-slate-800">{l}</option>)}
                        </select>
                    </div>
                    <div>
                            <label className="text-xs text-[#ffa502] font-bold uppercase mb-1 ml-1 block">Giọng hát</label>
                            <select disabled={isInstrumental} value={vocals} onChange={e => setVocals(e.target.value)} className={`w-full bg-black/20 border-2 border-transparent focus:border-[#ffa502] rounded-xl p-2.5 text-sm text-white outline-none ${isInstrumental ? 'opacity-50' : ''}`}>
                            {['Female Vocal','Male Vocal','Duet'].map(v => <option key={v} value={v} className="bg-slate-800">{v}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* 2. INSPIRATION */}
            <div className="snow-card p-5">
                <h3 className="text-sm font-bold text-[#2ed573] border-b border-white/10 pb-3 mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <span className="bg-[#2ed573] text-black text-[10px] px-2 py-0.5 rounded-full font-bold">2</span> 
                    Cảm Hứng & Audio
                </h3>
                
                <div className="mb-4">
                    <label className="text-xs text-[#2ed573] font-bold uppercase mb-2 ml-1 block">Mô tả ý tưởng:</label>
                    <textarea 
                        value={additionalDescription}
                        onChange={(e) => setAdditionalDescription(e.target.value)}
                        rows={2}
                        className="w-full bg-black/20 border-2 border-transparent focus:border-[#2ed573] rounded-xl p-3 text-sm text-white placeholder-gray-500 outline-none resize-none"
                        placeholder="VD: Nhịp điệu sôi động, buồn bã..."
                    />
                </div>

                <div className="flex bg-black/30 rounded-xl p-1 mb-4">
                    <button onClick={() => setActiveTab('inspiration')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === 'inspiration' ? 'bg-[#2ed573] text-white shadow' : 'text-gray-400 hover:text-white'}`}>Nghệ sĩ</button>
                    <button onClick={() => setActiveTab('audio')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === 'audio' ? 'bg-[#ff6b81] text-white shadow' : 'text-gray-400 hover:text-white'}`}>Audio Mẫu</button>
                    <button onClick={() => setActiveTab('custom')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === 'custom' ? 'bg-[#1e90ff] text-white shadow' : 'text-gray-400 hover:text-white'}`}>Lyrics</button>
                </div>

                {activeTab === 'inspiration' && (
                    <div className="space-y-3">
                         {finalInspirationSongs.length > 0 ? (
                            <div className="bg-[#2ed573]/10 p-3 rounded-xl border border-[#2ed573]/30">
                                <div className="text-xs text-[#2ed573] font-bold mb-2">Đã chọn ({finalInspirationSongs.length}):</div>
                                <div className="flex flex-wrap gap-2">
                                    {finalInspirationSongs.map((s, i) => (
                                        <div key={i} className="flex items-center gap-1 bg-[#2ed573] text-white text-[10px] px-2 py-1 rounded-lg shadow-sm">
                                            <span>{s.title}</span>
                                            <button onClick={() => setFinalInspirationSongs(prev => prev.filter((_, idx) => idx !== i))} className="text-white hover:text-black font-bold ml-1">&times;</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                         ) : <div className="text-xs text-gray-500 italic p-2">Chưa chọn bài hát nào.</div>}

                         <button onClick={handleFindArtists} className="w-full py-2 bg-[#2ed573]/20 hover:bg-[#2ed573] text-[#2ed573] hover:text-white text-xs font-bold rounded-xl border-2 border-[#2ed573] transition flex items-center justify-center gap-2">
                            <UserIcon className="w-4 h-4" /> AI Gợi Ý Nghệ Sĩ
                         </button>
                         <div className="flex gap-2">
                             <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Nhập tên bài hát..." className="flex-1 bg-black/20 border-2 border-transparent focus:border-[#2ed573] rounded-xl px-3 text-xs text-white" onKeyDown={e => e.key === 'Enter' && handleManualSearch()} />
                             <button onClick={handleManualSearch} className="px-4 bg-[#2ed573] hover:bg-[#26af61] text-white text-xs font-bold rounded-xl transition">Tìm</button>
                         </div>
                    </div>
                )}
                
                {activeTab === 'audio' && (
                     <div className="space-y-3">
                         <div className="relative group cursor-pointer border-2 border-dashed border-[#ff6b81]/50 rounded-xl p-4 bg-[#ff6b81]/10 hover:bg-[#ff6b81]/20 transition">
                            <input type="file" ref={fileInputRef} onChange={handleAudioUpload} accept="audio/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                            <div className="flex flex-col items-center gap-2 text-center">
                                <UploadIcon className="w-6 h-6 text-[#ff6b81]" />
                                <span className="text-xs text-[#ff6b81] font-bold">{uploadedAudio ? uploadedAudio.name : "Tải lên file nhạc mẫu (MP3/WAV)"}</span>
                            </div>
                         </div>
                         {uploadedAudio && (
                             <button onClick={handleAnalyzeAudio} disabled={isAnalyzingAudio} className="w-full py-2 bg-[#ff6b81] hover:bg-[#ff4757] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2">
                                 {isAnalyzingAudio ? <LoaderIcon /> : "Phân tích Audio"}
                             </button>
                         )}
                         {audioAnalysis && <div className="bg-black/40 p-3 rounded-xl border border-white/10 text-[10px] text-gray-300 max-h-32 overflow-y-auto whitespace-pre-wrap">{audioAnalysis}</div>}
                     </div>
                )}

                {activeTab === 'custom' && (
                     <textarea value={customLyrics} onChange={e => setCustomLyrics(e.target.value)} rows={6} className="w-full bg-black/20 border-2 border-transparent focus:border-[#1e90ff] rounded-xl p-3 text-sm text-white placeholder-gray-500 outline-none resize-none" placeholder="Nhập lời bài hát..." />
                )}
            </div>

            {/* 3. CONFIG */}
            <div className="snow-card p-5">
                <h3 className="text-sm font-bold text-[#ff6b81] border-b border-white/10 pb-3 mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <span className="bg-[#ff6b81] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">3</span> 
                    Cấu hình
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                     <div>
                        <label className="text-xs text-[#ff6b81] font-bold uppercase mb-1 ml-1 block">AI Model</label>
                        <select value={aiModel} onChange={e => setAiModel(e.target.value)} className="w-full bg-black/20 border-2 border-transparent focus:border-[#ff6b81] rounded-xl p-2 text-xs text-white outline-none">
                            <option value="gemini-2.5-flash" className="bg-slate-800">Gemini 2.5 Flash</option>
                            <option value="gemini-flash-lite-latest" className="bg-slate-800">Flash Lite</option>
                            <option value="gemini-3-pro-preview" className="bg-slate-800">Gemini 3 Pro</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-xs text-[#ff6b81] font-bold uppercase mb-1 ml-1 block">Số lượng</label>
                        <input type="number" min="1" max="10" value={songQuantity} onChange={e => setSongQuantity(parseInt(e.target.value))} className="w-full bg-black/20 border-2 border-transparent focus:border-[#ff6b81] rounded-xl p-2 text-xs text-white outline-none text-center" />
                     </div>
                </div>

                <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5 mb-4">
                     <span className="text-xs text-white font-bold ml-1">Không Lời (Instrumental)</span>
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={isInstrumental} onChange={e => setIsInstrumental(e.target.checked)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ffa502]"></div>
                     </label>
                </div>

                <div className="mb-4">
                    <label className="text-xs text-[#ff6b81] font-bold uppercase mb-1 ml-1 block flex justify-between">
                        <span>Độ sáng tạo</span>
                        <span className="text-[#ffa502]">{getCreativityLabel(creativity)}</span>
                    </label>
                    <input type="range" min="0" max="100" value={creativity} onChange={e => setCreativity(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#ff6b81]" />
                </div>

                <div className="space-y-3">
                    <div>
                        <span className="text-[10px] text-[#2ed573] font-bold uppercase mb-1 block">Nhạc cụ (Include)</span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                             {instrumentsList.map(inst => renderInstrumentButton(inst, 'include'))}
                        </div>
                    </div>
                    <div>
                        <span className="text-[10px] text-[#ff4757] font-bold uppercase mb-1 block">Nhạc cụ (Exclude)</span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                             {instrumentsList.map(inst => renderInstrumentButton(inst, 'exclude'))}
                        </div>
                    </div>
                </div>
            </div>

            <button 
                onClick={handleGenerateSong} 
                disabled={isLoading}
                className="w-full py-4 bg-[#ff4757] hover:bg-[#ff6b81] text-white font-bold rounded-2xl shadow-[0_10px_20px_rgba(255,71,87,0.4)] border-4 border-[#ff6b81] transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:transform-none flex flex-col items-center justify-center gap-1"
            >
                {isLoading ? <LoaderIcon /> : <span className="text-sm uppercase tracking-widest">🎵 Sáng Tác Ngay</span>}
            </button>

            {error && <div className="p-3 bg-red-500 text-white text-xs rounded-xl text-center font-bold shadow-lg">{error}</div>}
        </div>

        {/* Right Results */}
        <div className="lg:col-span-7 h-full overflow-hidden flex flex-col bg-black/20 rounded-3xl border border-white/5 backdrop-blur-md relative">
            {results.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-10 text-center">
                    <MusicIcon className="w-24 h-24 mb-4 opacity-20" />
                    <p className="text-lg font-bold">Trống trơn...</p>
                    <p className="text-sm">Hãy nhấn nút "Sáng Tác Ngay" để bắt đầu!</p>
                </div>
            ) : (
                <>
                    <div className="flex-none bg-black/20 border-b border-white/5 p-3 flex overflow-x-auto custom-scrollbar gap-2">
                         {results.map((song, idx) => (
                             <button
                                key={idx}
                                onClick={() => setActiveResultTab(idx)}
                                className={`flex-none px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap shadow-sm ${
                                    activeResultTab === idx 
                                    ? 'bg-[#2ed573] text-white transform scale-105' 
                                    : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                                }`}
                             >
                                #{idx + 1} {song.song_title.slice(0, 15)}...
                             </button>
                         ))}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                        {results[activeResultTab] && (
                            <div className="animate-fade-in space-y-6">
                                <div className="flex items-center justify-between bg-black/30 p-5 rounded-2xl border-l-4 border-[#ffa502]">
                                    <div>
                                        <h2 className="text-2xl font-bold text-[#ffa502]">{results[activeResultTab].song_title}</h2>
                                        <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-wider">Song Title</p>
                                    </div>
                                    <button onClick={() => copyToClipboard(results[activeResultTab].song_title)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[#ffa502] transition" title="Copy Title">
                                        <CopyIcon className="w-5 h-5"/>
                                    </button>
                                </div>

                                <div className="bg-black/20 rounded-2xl overflow-hidden border border-white/5">
                                    <div className="bg-black/30 p-3 border-b border-white/5 flex justify-between items-center">
                                        <h3 className="text-xs font-bold text-[#1e90ff] uppercase">Style Prompt</h3>
                                        <button onClick={() => copyToClipboard(results[activeResultTab].style_description)} className="text-[10px] bg-[#1e90ff] hover:bg-blue-400 px-3 py-1 rounded-full text-white font-bold transition">Copy</button>
                                    </div>
                                    <div className="p-4 text-sm text-gray-300 font-serif italic leading-relaxed">{results[activeResultTab].style_description}</div>
                                </div>

                                <div className="bg-black/20 rounded-2xl overflow-hidden border border-white/5 flex-1">
                                    <div className="bg-black/30 p-3 border-b border-white/5 flex justify-between items-center">
                                        <h3 className="text-xs font-bold text-[#2ed573] uppercase">Lyrics</h3>
                                        <button onClick={() => copyToClipboard(results[activeResultTab].lyrics)} className="text-[10px] bg-[#2ed573] hover:bg-green-400 px-3 py-1 rounded-full text-white font-bold transition">Copy</button>
                                    </div>
                                    <div className="p-5 text-sm text-gray-200 font-mono whitespace-pre-wrap leading-loose">{results[activeResultTab].lyrics}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>

        {/* Modal (Reuse styles) */}
        {showModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-[#1e272e] border-2 border-[#2ed573] rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
                    <div className="p-5 border-b border-white/10 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white">{modalTitle}</h3>
                        <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>
                    <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-2">
                        {modalLoading ? <div className="flex justify-center py-10"><LoaderIcon /></div> : modalItems.map((item: any, idx) => {
                             const val = typeof item === 'string' ? item : item;
                             const display = typeof item === 'string' ? item : `${item.title} - ${item.artist}`;
                             const isSelected = selectedModalItems.includes(val);
                             return (
                                <div key={idx} onClick={() => isSelected ? setSelectedModalItems(prev => prev.filter(i => i !== val)) : setSelectedModalItems(prev => [...prev, val])} className={`p-3 rounded-xl cursor-pointer border-2 transition flex items-center justify-between ${isSelected ? 'bg-[#2ed573]/20 border-[#2ed573] text-white' : 'bg-black/20 border-transparent text-gray-400 hover:bg-white/5'}`}>
                                    <span className="text-sm font-bold">{display}</span>
                                    {isSelected && <span className="text-[#2ed573]">✔</span>}
                                </div>
                             )
                        })}
                    </div>
                    <div className="p-5 border-t border-white/10">
                         <button onClick={handleModalConfirm} disabled={selectedModalItems.length === 0} className="w-full py-3 bg-[#2ed573] hover:bg-[#26af61] text-white font-bold rounded-xl transition disabled:opacity-50 shadow-lg">Xác nhận ({selectedModalItems.length})</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default MusicGenerator;
