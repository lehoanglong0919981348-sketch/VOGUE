
import React from 'react';
import { FormData, Preset, Scene } from '../types';
import { TrashIcon, LoaderIcon } from './Icons';
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
    generatedScenes: Scene[];
    startProcess: () => void;
    feedback: { type: 'error' | 'success' | 'info', message: string } | null;
    lastCombinedVideoPath: string | null;
    handlePlayVideo: (path: string) => void;
}

const ModernInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="w-full bg-transparent border-b border-gray-300 focus:border-black p-2 text-black placeholder-gray-400 focus:outline-none transition-colors font-mono text-sm" />
);

const ModernTextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} className="w-full bg-transparent border border-gray-300 focus:border-black p-3 text-black placeholder-gray-400 focus:outline-none transition-colors font-mono text-sm resize-none rounded-none" />
);

const ModernSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <div className="relative">
        <select {...props} className="w-full bg-transparent border-b border-gray-300 focus:border-black p-2 text-black focus:outline-none transition-colors font-mono text-sm appearance-none cursor-pointer rounded-none">
            {props.children}
        </select>
    </div>
);

const GeneratorTab: React.FC<GeneratorTabProps> = (props) => {
    const { 
        formData, handleInputChange, handleFashionImagesUpload, handleRemoveFashionImage,
        presets, handlePresetSelect, handleDeletePreset, handleSavePreset, 
        newPresetName, setNewPresetName, selectedPresetId, setSelectedPresetId,
        generatePrompts, isLoading, generatedScenes, startProcess, feedback,
        lastCombinedVideoPath, handlePlayVideo
    } = props;

    const getImageLabel = (index: number) => {
        switch(index) {
            case 0: return { title: "01. NGƯỜI MẪU", desc: "Gương mặt & Dáng" };
            case 1: return { title: "02. TRANG PHỤC", desc: "Quần áo & Phụ kiện" };
            case 2: return { title: "03. BỐI CẢNH", desc: "Môi trường" };
            default: return { title: `ẢNH ${index + 1}`, desc: "" };
        }
    };

    return (
        <main className="space-y-16 pb-20 font-sans">
            
            <section className="flex flex-col md:flex-row gap-8 items-end justify-between border-b border-gray-200 pb-8">
                <div className="w-full md:w-1/3">
                    <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">CÀI ĐẶT NHANH</label>
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
                    <button onClick={handleSavePreset} className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-black border-b border-transparent hover:border-black pb-1 transition">LƯU</button>
                </div>
            </section>

            <section>
                <div className="mb-8">
                    <h3 className="text-3xl font-serif text-black">Nguyên Liệu</h3>
                    <p className="text-gray-400 mt-1 font-mono text-xs uppercase">TẢI ẢNH THAM KHẢO</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[0, 1, 2].map((index) => {
                        const image = formData.fashionImages[index];
                        const label = getImageLabel(index);
                        return (
                            <div key={index} className="flex flex-col gap-4">
                                <div className="flex justify-between items-end border-b border-gray-200 pb-2">
                                    <h4 className="text-black font-bold text-sm tracking-widest">{label.title}</h4>
                                    <p className="text-gray-400 text-[10px] uppercase">{label.desc}</p>
                                </div>
                                <div className="relative group w-full aspect-[3/4] bg-gray-50 border border-gray-200 hover:border-black transition-colors flex flex-col items-center justify-center overflow-hidden">
                                    {image ? (
                                        <>
                                            <img src={image.preview} alt={`Upload ${index+1}`} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                            <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                 <button onClick={() => handleRemoveFashionImage(index)} className="text-black hover:text-red-500 transition"><TrashIcon className="w-6 h-6"/></button>
                                            </div>
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
                                            <span className="text-gray-300 text-4xl font-serif font-thin group-hover:text-black transition">+</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>

            <section>
                <div className="mb-8">
                    <h3 className="text-3xl font-serif text-black">Chỉ Đạo</h3>
                    <p className="text-gray-400 mt-1 font-mono text-xs uppercase">THÔNG SỐ KỊCH BẢN</p>
                </div>

                <div className="grid grid-cols-1 gap-12">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Ý Tưởng Sáng Tạo</label>
                        <ModernTextArea name="idea" value={formData.idea} onChange={handleInputChange} rows={2} placeholder="MÔ TẢ CHỦ ĐỀ BỘ SƯU TẬP..." />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Phong Cách</label>
                            <ModernSelect name="fashionStyle" value={formData.fashionStyle} onChange={handleInputChange}>
                                <option value="High Fashion / Editorial" className="bg-white text-black">Thời trang cao cấp (High Fashion)</option>
                                <option value="Streetwear / Urban" className="bg-white text-black">Đường phố (Streetwear)</option>
                                <option value="Minimalist / Chic" className="bg-white text-black">Tối giản (Minimalist)</option>
                                <option value="Vintage / Retro" className="bg-white text-black">Cổ điển (Vintage)</option>
                                <option value="Sportswear / Active" className="bg-white text-black">Thể thao (Sportswear)</option>
                                <option value="Avant-Garde" className="bg-white text-black">Phá cách (Avant-Garde)</option>
                            </ModernSelect>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Nhân Vật</label>
                            <ModernSelect name="modelDemographic" value={formData.modelDemographic} onChange={handleInputChange}>
                                <option value="Female Model" className="bg-white text-black">Người mẫu Nữ</option>
                                <option value="Male Model" className="bg-white text-black">Người mẫu Nam</option>
                                <option value="Diverse Group" className="bg-white text-black">Nhóm người mẫu</option>
                                <option value="No Model (Clothing Only)" className="bg-white text-black">Không người (Chỉ quần áo)</option>
                            </ModernSelect>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Bối Cảnh</label>
                            <ModernSelect name="setting" value={formData.setting} onChange={handleInputChange}>
                                <option value="Studio / Minimalist" className="bg-white text-black">Studio / Phông trơn</option>
                                <option value="Runway / Catwalk" className="bg-white text-black">Sàn diễn (Runway)</option>
                                <option value="Urban Street / City" className="bg-white text-black">Đường phố</option>
                                <option value="Nature / Beach" className="bg-white text-black">Thiên nhiên / Biển</option>
                                <option value="Neon / Cyberpunk" className="bg-white text-black">Neon / Cyberpunk</option>
                            </ModernSelect>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Tông Màu / Cảm Xúc</label>
                            <ModernSelect name="cameraMood" value={formData.cameraMood} onChange={handleInputChange}>
                                <option value="Dynamic / Fast Paced" className="bg-white text-black">Năng động / Nhịp nhanh</option>
                                <option value="Slow Motion / Cinematic" className="bg-white text-black">Slow Motion / Điện ảnh</option>
                                <option value="Handheld / Raw" className="bg-white text-black">Cầm tay / Tự nhiên (Raw)</option>
                                <option value="Detailed / Macro" className="bg-white text-black">Chi tiết / Cận cảnh (Macro)</option>
                            </ModernSelect>
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-t border-gray-200 pt-8">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Số Lượng Scene</label>
                        <ModernInput 
                            type="number" 
                            name="sceneCount" 
                            value={formData.sceneCount} 
                            onChange={handleInputChange} 
                            placeholder="5" 
                            min={1} 
                            max={50}
                        />
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Tên Dự Án</label>
                         <ModernInput name="projectName" value={formData.projectName} onChange={handleInputChange} placeholder="TEN_DU_AN" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">AI Model</label>
                        <ModernSelect name="model" value={formData.model} onChange={handleInputChange}>
                            <option value="gemini-2.5-flash" className="bg-white text-black">Gemini 2.5 Flash</option>
                            <option value="gemini-3-pro-preview" className="bg-white text-black">Gemini 3 Pro</option>
                        </ModernSelect>
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Độ Sáng Tạo</label>
                         <input type="range" name="temperature" min="0.1" max="1.0" step="0.1" value={formData.temperature} onChange={handleInputChange} className="w-full h-1 bg-gray-200 rounded-none appearance-none cursor-pointer accent-black mt-4"/>
                    </div>
                 </div>
            </section>

            <section className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-200 p-6 flex justify-center gap-6 z-50">
                <button 
                    onClick={generatePrompts} 
                    disabled={isLoading} 
                    className="luxury-btn px-12 py-4 text-sm disabled:opacity-50"
                >
                    {isLoading ? <LoaderIcon /> : 'TẠO KỊCH BẢN'}
                </button>
                {generatedScenes.length > 0 && (
                    <button 
                        onClick={startProcess} 
                        className="luxury-btn px-12 py-4 text-sm bg-gray-100 border-gray-300 hover:bg-black hover:text-white hover:border-black"
                    >
                        XUẤT FILE EXCEL
                    </button>
                )}
            </section>

            {feedback && ( 
                <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 text-xs font-bold uppercase tracking-widest px-6 py-3 border shadow-lg ${ feedback.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-white border-black text-black' }`}>
                    {feedback.message}
                    {feedback.type === 'success' && lastCombinedVideoPath && (
                        <button onClick={() => handlePlayVideo(lastCombinedVideoPath)} className="ml-4 underline font-black">MỞ VIDEO</button>
                    )}
                </div> 
            )}

            <Results scenes={generatedScenes} />
        </main>
    );
};

export default GeneratorTab;
