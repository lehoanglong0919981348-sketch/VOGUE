
import React from 'react';
import { FormData, Preset, ImagePrompt } from '../types';
import { TrashIcon, LoaderIcon, LockIcon } from './Icons';
import Results from './Results';

interface GeneratorTabProps {
    formData: FormData;
    setFormData: React.Dispatch<React.SetStateAction<FormData>>;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    handleFashionImagesUpload: (e: React.ChangeEvent<HTMLInputElement>, index: number) => void;
    handleRemoveFashionImage: (index: number) => void;
    
    presets: Preset[];
    handlePresetSelect: (id: string) => void;
    handleDeletePreset: () => void;
    handleSavePreset: () => void;
    newPresetName: string;
    setNewPresetName: (name: string) => void;
    selectedPresetId: string;
    setSelectedPresetId: (id: string) => void;
    
    generatePrompts: () => void;
    isLoading: boolean;
    generatedImages: ImagePrompt[];
    startProcess: () => void;
    feedback: { type: 'error' | 'success' | 'info', message: string } | null;
    handleOpenImage: (path: string) => void;
}

const ModernInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-transparent border-b-2 border-gray-200 focus:border-black p-2 text-black placeholder-gray-400 focus:outline-none transition-colors font-mono text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed" />
);

const ModernTextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} className="w-full bg-transparent border-2 border-gray-200 focus:border-black p-3 text-black placeholder-gray-400 focus:outline-none transition-colors font-mono text-sm resize-none rounded-none disabled:opacity-50 disabled:cursor-not-allowed" />
);

const ModernSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <div className="relative">
        <select {...props} className="w-full bg-transparent border-b-2 border-gray-200 focus:border-black p-2 text-black focus:outline-none transition-colors font-mono text-sm appearance-none cursor-pointer rounded-none font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:border-transparent">
            {props.children}
        </select>
    </div>
);

const GeneratorTab: React.FC<GeneratorTabProps> = (props) => {
    const { 
        formData, handleInputChange, handleFashionImagesUpload, handleRemoveFashionImage,
        presets, handlePresetSelect, handleDeletePreset, handleSavePreset, 
        newPresetName, setNewPresetName, selectedPresetId, setSelectedPresetId,
        generatePrompts, isLoading, generatedImages, startProcess, feedback
    } = props;

    // SMART LOGIC: Check for existence of specific images to lock fields
    const hasModelImage = !!formData.fashionImages[0];   // Image 1 overrides Model Demographic
    const hasOutfitImage = !!formData.fashionImages[1];  // Image 2 overrides Fashion Style
    const hasSettingImage = !!formData.fashionImages[2]; // Image 3 overrides Setting

    const getImageLabel = (index: number) => {
        switch(index) {
            case 0: return { title: "01. NGƯỜI MẪU", desc: "Gương mặt" };
            case 1: return { title: "02. TRANG PHỤC", desc: "Đồ chính" };
            case 2: return { title: "03. BỐI CẢNH", desc: "Background" };
            case 3: return { title: "04. PHỤ KIỆN 1", desc: "Túi / Mũ" };
            case 4: return { title: "05. PHỤ KIỆN 2", desc: "Giày / Dép" };
            case 5: return { title: "06. PHỤ KIỆN 3", desc: "Trang sức" };
            case 6: return { title: "07. PHỤ KIỆN 4", desc: "Khác" };
            case 7: return { title: "08. PHỤ KIỆN 5", desc: "Khác" };
            case 8: return { title: "09. PHỤ KIỆN 6", desc: "Khác" };
            case 9: return { title: "10. PHỤ KIỆN 7", desc: "Khác" };
            default: return { title: `ẢNH ${index + 1}`, desc: "" };
        }
    };

    return (
        <main className="space-y-12 pb-20 font-sans">
            
            <section className="flex flex-col md:flex-row gap-8 items-end justify-between border-b border-gray-200 pb-6">
                <div className="w-full md:w-1/3">
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 block font-bold">CÀI ĐẶT NHANH</label>
                    <div className="flex gap-2">
                         <ModernSelect value={selectedPresetId} onChange={e => { setSelectedPresetId(e.target.value); handlePresetSelect(e.target.value); }}>
                            <option value="" className="bg-white text-black">CHỌN CÀI ĐẶT</option>
                            {presets.map(p => <option key={p.id} value={p.id} className="bg-white text-black">{p.name}</option>)}
                        </ModernSelect>
                        <button onClick={handleDeletePreset} disabled={!selectedPresetId} className="text-gray-400 hover:text-red-500 transition"><TrashIcon className="w-4 h-4"/></button>
                    </div>
                </div>
                <div className="w-full md:w-1/3 flex gap-2 items-end">
                    <ModernInput 
                        type="text"
                        value={newPresetName}
                        onChange={e => setNewPresetName(e.target.value)}
                        placeholder="TÊN CÀI ĐẶT MỚI..."
                    />
                    <button onClick={handleSavePreset} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-black border-b border-transparent hover:border-black pb-1 transition">LƯU</button>
                </div>
            </section>

            <section>
                <div className="mb-4">
                    <h3 className="text-2xl font-serif text-black font-bold">Nguyên Liệu</h3>
                    <p className="text-gray-400 mt-1 font-mono text-[10px] uppercase font-bold tracking-wider">TẢI ẢNH THAM KHẢO & PHỤ KIỆN (TỐI ĐA 10 ẢNH)</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => {
                        const image = formData.fashionImages[index];
                        const label = getImageLabel(index);
                        return (
                            <div key={index} className="flex flex-col gap-2">
                                <div className="flex justify-between items-end border-b border-gray-100 pb-1">
                                    <h4 className="text-black font-bold text-[10px] tracking-widest truncate">{label.title}</h4>
                                </div>
                                <div className={`relative group w-full aspect-square bg-gray-50 border border-gray-200 hover:border-black transition-colors flex flex-col items-center justify-center overflow-hidden ${image ? 'border-black' : ''}`}>
                                    {image ? (
                                        <>
                                            <img src={image.preview} alt={`Upload ${index+1}`} className="w-full h-full object-cover transition-all duration-500" />
                                            <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                 <button onClick={() => handleRemoveFashionImage(index)} className="text-black hover:text-red-500 transition"><TrashIcon className="w-5 h-5"/></button>
                                            </div>
                                            {index <= 2 && (
                                                <div className="absolute bottom-0 right-0 bg-black text-white text-[8px] font-bold px-1.5 py-0.5 flex items-center gap-1">
                                                    <LockIcon className="w-2 h-2 text-[#D4AF37]" /> LOCKED
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <label htmlFor={`img-upload-${index}`} className="absolute inset-0 cursor-pointer"></label>
                                            <input 
                                                type="file" 
                                                id={`img-upload-${index}`} 
                                                onChange={(e) => handleFashionImagesUpload(e, index)} 
                                                accept="image/*" 
                                                className="hidden" 
                                            />
                                            <div className="text-center">
                                                <span className="text-gray-300 text-2xl font-serif font-thin group-hover:text-black transition block">+</span>
                                                <span className="text-[8px] text-gray-400 uppercase font-bold mt-1 block">{label.desc}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>

            <section>
                <div className="mb-6">
                    <h3 className="text-2xl font-serif text-black font-bold">Chỉ Đạo</h3>
                    <p className="text-gray-400 mt-1 font-mono text-[10px] uppercase font-bold tracking-wider">THÔNG SỐ CHỤP ẢNH</p>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Ý Tưởng Bộ Ảnh</label>
                        <ModernTextArea name="idea" value={formData.idea} onChange={handleInputChange} rows={1} placeholder="MÔ TẢ CHỦ ĐỀ PHOTO SHOOT..." />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                        {/* FASHION STYLE - SMART LOCK */}
                        <div className="relative">
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    Phong Cách
                                </label>
                                {hasOutfitImage && (
                                    <div className="flex items-center gap-1 bg-[#D4AF37] text-black px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider">
                                        <LockIcon className="w-2 h-2" /> THEO ẢNH 02
                                    </div>
                                )}
                            </div>
                            <ModernSelect 
                                name="fashionStyle" 
                                value={hasOutfitImage ? "LOCKED" : formData.fashionStyle} 
                                onChange={handleInputChange}
                                disabled={hasOutfitImage}
                                className={hasOutfitImage ? "opacity-100 bg-gray-100 font-bold" : ""}
                            >
                                {hasOutfitImage ? (
                                     <option value="LOCKED">Đã khóa: Theo ảnh trang phục</option>
                                ) : (
                                    <>
                                        <option value="High Fashion / Editorial" className="bg-white text-black">Thời trang cao cấp (High Fashion)</option>
                                        <option value="Streetwear / Urban" className="bg-white text-black">Đường phố (Streetwear)</option>
                                        <option value="Minimalist / Chic" className="bg-white text-black">Tối giản (Minimalist)</option>
                                        <option value="Vintage / Retro" className="bg-white text-black">Cổ điển (Vintage)</option>
                                        <option value="Sportswear / Active" className="bg-white text-black">Thể thao (Sportswear)</option>
                                        <option value="Avant-Garde" className="bg-white text-black">Phá cách (Avant-Garde)</option>
                                    </>
                                )}
                            </ModernSelect>
                        </div>

                        {/* MODEL - SMART LOCK */}
                        <div className="relative">
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    Người Mẫu
                                </label>
                                {hasModelImage && (
                                    <div className="flex items-center gap-1 bg-[#D4AF37] text-black px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider">
                                        <LockIcon className="w-2 h-2" /> THEO ẢNH 01
                                    </div>
                                )}
                            </div>
                            <ModernSelect 
                                name="modelDemographic" 
                                value={hasModelImage ? "LOCKED" : formData.modelDemographic} 
                                onChange={handleInputChange}
                                disabled={hasModelImage}
                                className={hasModelImage ? "opacity-100 bg-gray-100 font-bold" : ""}
                            >
                                {hasModelImage ? (
                                    <option value="LOCKED">Đã khóa: Theo ảnh người mẫu</option>
                                ) : (
                                    <>
                                        <option value="Female Model" className="bg-white text-black">Người mẫu Nữ</option>
                                        <option value="Male Model" className="bg-white text-black">Người mẫu Nam</option>
                                        <option value="Diverse Group" className="bg-white text-black">Nhóm người mẫu</option>
                                        <option value="No Model (Clothing Only)" className="bg-white text-black">Không người (Chỉ quần áo)</option>
                                    </>
                                )}
                            </ModernSelect>
                        </div>

                        {/* SETTING - SMART LOCK */}
                        <div className="relative">
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    Bối Cảnh
                                </label>
                                {hasSettingImage && (
                                    <div className="flex items-center gap-1 bg-[#D4AF37] text-black px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider">
                                        <LockIcon className="w-2 h-2" /> THEO ẢNH 03
                                    </div>
                                )}
                            </div>
                            <ModernSelect 
                                name="setting" 
                                value={hasSettingImage ? "LOCKED" : formData.setting} 
                                onChange={handleInputChange}
                                disabled={hasSettingImage}
                                className={hasSettingImage ? "opacity-100 bg-gray-100 font-bold" : ""}
                            >
                                {hasSettingImage ? (
                                     <option value="LOCKED">Đã khóa: Theo ảnh bối cảnh</option>
                                ) : (
                                    <>
                                        <option value="Studio / Minimalist" className="bg-white text-black">Studio / Phông trơn</option>
                                        <option value="Runway / Catwalk" className="bg-white text-black">Sàn diễn (Runway)</option>
                                        <option value="Urban Street / City" className="bg-white text-black">Đường phố</option>
                                        <option value="Nature / Beach" className="bg-white text-black">Thiên nhiên / Biển</option>
                                        <option value="Neon / Cyberpunk" className="bg-white text-black">Neon / Cyberpunk</option>
                                    </>
                                )}
                            </ModernSelect>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Ánh Sáng / Mood</label>
                            <ModernSelect name="cameraMood" value={formData.cameraMood} onChange={handleInputChange}>
                                <option value="Natural / Soft" className="bg-white text-black">Tự nhiên / Mềm mại</option>
                                <option value="Cinematic / Dramatic" className="bg-white text-black">Điện ảnh / Kịch tính</option>
                                <option value="High Key / Bright" className="bg-white text-black">High Key / Sáng rực</option>
                                <option value="Low Key / Moody" className="bg-white text-black">Low Key / Tâm trạng</option>
                            </ModernSelect>
                        </div>

                        {/* NEW: ASPECT RATIO */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Tỉ Lệ Khung Hình</label>
                            <ModernSelect name="aspectRatio" value={formData.aspectRatio} onChange={handleInputChange}>
                                <option value="9:16" className="bg-white text-black">9:16 (Chân dung/TikTok)</option>
                                <option value="16:9" className="bg-white text-black">16:9 (Ngang/Youtube)</option>
                                <option value="3:4" className="bg-white text-black">3:4 (Editorial)</option>
                                <option value="4:3" className="bg-white text-black">4:3 (Landscape)</option>
                                <option value="1:1" className="bg-white text-black">1:1 (Vuông/Instagram)</option>
                            </ModernSelect>
                        </div>

                        {/* NEW: SHOT ANGLE */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Góc Chụp</label>
                            <ModernSelect name="shotAngle" value={formData.shotAngle} onChange={handleInputChange}>
                                <option value="Mixed" className="bg-white text-black">Hỗn hợp / Random</option>
                                <option value="Full Body" className="bg-white text-black">Toàn thân (Full Body)</option>
                                <option value="Knee Up (Cowboy)" className="bg-white text-black">Từ đầu gối (Cowboy)</option>
                                <option value="Waist Up" className="bg-white text-black">Bán thân (Waist Up)</option>
                                <option value="Close Up" className="bg-white text-black">Cận cảnh (Close Up)</option>
                                <option value="Extreme Close Up" className="bg-white text-black">Cực cận (Chi tiết)</option>
                                <option value="Dynamic / Varied" className="bg-white text-black">Góc động / Đa dạng</option>
                            </ModernSelect>
                        </div>
                        
                        {/* NEW: QUALITY */}
                         <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Chất Lượng Ảnh</label>
                            <ModernSelect name="quality" value={formData.quality} onChange={handleInputChange}>
                                <option value="4K" className="bg-white text-black">4K Resolution</option>
                                <option value="2K" className="bg-white text-black">2K Resolution</option>
                                <option value="8K" className="bg-white text-black">8K (Siêu nét)</option>
                            </ModernSelect>
                        </div>

                        {/* NEW: FACE STRENGTH */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-1">
                             <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 flex justify-between">
                                <span>Độ Giống Mặt</span>
                                <span>{formData.faceStrength}%</span>
                             </label>
                             <input 
                                type="range" 
                                name="faceStrength" 
                                min="0" 
                                max="100" 
                                step="5" 
                                value={formData.faceStrength} 
                                onChange={handleInputChange} 
                                className="w-full h-1 bg-gray-200 rounded-none appearance-none cursor-pointer accent-black mt-2"
                             />
                             <p className="text-[9px] text-gray-400 mt-1">100% = Giữ nguyên nét | 50% = Giống tương đối</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-t border-gray-200 pt-6">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Số Lượng Ảnh</label>
                        <ModernInput 
                            type="number" 
                            name="imageCount" 
                            value={formData.imageCount} 
                            onChange={handleInputChange} 
                            placeholder="5" 
                            min={1} 
                            max={50}
                        />
                    </div>
                    <div>
                         <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Tên Dự Án</label>
                         <ModernInput name="projectName" value={formData.projectName} onChange={handleInputChange} placeholder="TEN_DU_AN" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">AI Model</label>
                        <ModernSelect name="model" value={formData.model} onChange={handleInputChange}>
                            <option value="gemini-2.5-flash" className="bg-white text-black">Gemini 2.5 Flash</option>
                            <option value="gemini-flash-lite-latest" className="bg-white text-black">Gemini 2.5 Flash Lite</option>
                        </ModernSelect>
                    </div>
                    <div>
                         <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Độ Sáng Tạo</label>
                         <input type="range" name="temperature" min="0.1" max="1.0" step="0.1" value={formData.temperature} onChange={handleInputChange} className="w-full h-1 bg-gray-200 rounded-none appearance-none cursor-pointer accent-black mt-3"/>
                    </div>
                 </div>
            </section>

            <section className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-200 p-6 flex justify-center gap-6 z-50 shadow-2xl">
                <button 
                    onClick={generatePrompts} 
                    disabled={isLoading} 
                    className="luxury-btn px-16 py-3 text-xs disabled:opacity-50 tracking-widest"
                >
                    {isLoading ? <LoaderIcon /> : 'TẠO PROMPT ẢNH'}
                </button>
                {generatedImages.length > 0 && (
                    <button 
                        onClick={startProcess} 
                        className="luxury-btn px-12 py-3 text-xs bg-white text-black border-2 border-black hover:bg-black hover:text-white hover:border-black tracking-widest"
                    >
                        XUẤT FILE EXCEL
                    </button>
                )}
            </section>

            {feedback && ( 
                <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 text-xs font-bold uppercase tracking-widest px-6 py-3 border shadow-lg ${ feedback.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-white border-black text-black' }`}>
                    {feedback.message}
                </div> 
            )}

            <Results images={generatedImages} />
        </main>
    );
};

export default GeneratorTab;
