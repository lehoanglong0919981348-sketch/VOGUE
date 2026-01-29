
import React from 'react';
import { JobStatus, TrackedFile, ImageJob } from '../types';
import { RetryIcon, ExternalLinkIcon, FolderIcon, TrashIcon, VideoIcon, LoaderIcon, CopyIcon, CogIcon } from './Icons';

interface TrackerTabProps {
    feedback: { type: 'error' | 'success' | 'info', message: string } | null;
    trackedFiles: TrackedFile[];
    handleOpenNewFile: () => void;
    activeTrackerFileIndex: number;
    setActiveTrackerFileIndex: (index: number) => void;
    handleCloseTrackerTab: (index: number) => void;
    stats: { completed: number; inProgress: number; failed: number; total: number; } | null;
    currentFile: TrackedFile | null;
    handleReloadVideos: () => void;
    handleRetryStuckJobs: () => void;
    handleOpenToolFlows: () => void;
    handleSetToolFlowsPath: () => void;
    handleOpenFolder: (path?: string) => void;
    handleCopyPath: (path?: string) => void;
    getFolderPath: (path?: string) => string;
    handleLinkVideo: (jobId: string, fileIndex: number) => void;
    handleShowInFolder: (path?: string) => void;
    handleDeleteVideo: (jobId: string, path?: string) => void;
    handleRetryJob: (jobId: string) => void;
}

const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'Pending': return "text-gray-400";
      case 'Processing': return "text-[#D4AF37] animate-pulse font-bold";
      case 'Generating': return "text-[#D4AF37] animate-pulse font-bold";
      case 'Completed': return "text-black font-bold";
      case 'Failed': return "text-red-600 font-bold";
      default: return "text-gray-400";
    }
};

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="flex flex-col border-l-2 border-gray-100 pl-6 pr-8">
        <span className="text-3xl font-serif text-black font-bold">{value}</span>
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{label}</span>
    </div>
);

const TrackerTab: React.FC<TrackerTabProps> = (props) => {
    const { 
        feedback, trackedFiles, handleOpenNewFile,
        activeTrackerFileIndex, setActiveTrackerFileIndex, handleCloseTrackerTab, stats, currentFile,
        handleReloadVideos, handleRetryStuckJobs, handleOpenToolFlows, handleSetToolFlowsPath,
        handleOpenFolder, handleCopyPath, getFolderPath,
        handleLinkVideo, handleShowInFolder, handleDeleteVideo, handleRetryJob
    } = props;

    const renderResultCell = (job: ImageJob, fileIndex: number) => {
        if(job.status === 'Completed' && job.generatedFilePath) {
             return (
                <div className="relative group w-28 h-28 bg-gray-100 overflow-hidden cursor-pointer border border-gray-200 hover:border-black transition-all shadow-sm hover:shadow-md" onClick={() => handleShowInFolder(job.generatedFilePath!)}>
                    <img 
                        src={`file://${job.generatedFilePath}`}
                        alt="Result"
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500"
                    />
                </div>
              );
        }
        if (job.status === 'Processing' || job.status === 'Generating') return <div className="flex justify-center h-28 items-center text-[#D4AF37]"><LoaderIcon /></div>;
        if (job.status === 'Completed' && !job.generatedFilePath) return (
             <div className="flex flex-col items-center justify-center w-28 h-28 border border-red-200 bg-red-50 p-1">
                 <span className="text-[10px] font-bold text-red-600 uppercase mb-1">Thiếu File</span>
                 <button onClick={() => handleLinkVideo(job.id, fileIndex)} className="text-[10px] text-gray-500 hover:text-black uppercase tracking-wider underline">Link</button>
             </div>
        );
        return <div className="h-28 flex items-center justify-center text-gray-300 w-28 bg-gray-50"><span className="text-2xl">📷</span></div>;
    };

    return (
        <main className="h-full flex flex-col space-y-0 font-sans bg-white">
            {feedback && ( <div className={`fixed bottom-8 right-8 z-50 text-xs font-bold uppercase tracking-widest px-6 py-4 border shadow-lg ${ feedback.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-white border-black text-black' }`}>
                <span>{feedback.message}</span>
            </div> )}
            
            {trackedFiles.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
                    <h3 className="text-5xl font-serif text-gray-300 font-bold tracking-tight">V-FASHION</h3>
                    <p className="text-gray-400 mt-4 text-sm font-medium uppercase tracking-widest">Không có dự án nào đang mở</p>
                    <button onClick={handleOpenNewFile} className="mt-8 luxury-btn px-10 py-4 text-xs bg-white">
                        MỞ FILE DỰ ÁN
                    </button>
                </div>
            ) : (
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* LEFT SIDEBAR */}
                    <aside className="w-64 flex-none flex flex-col border-r border-gray-200 bg-gray-50/50">
                        <div className="p-6 border-b border-gray-200 bg-white">
                            <button onClick={handleOpenNewFile} className="w-full py-3 border-2 border-gray-200 hover:border-black text-gray-500 hover:text-black text-xs font-bold uppercase tracking-widest transition bg-transparent hover:bg-white">
                                + Dự Án Mới
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {trackedFiles.map((file, index) => {
                                const active = activeTrackerFileIndex === index;
                                const completedCount = file.jobs.filter(j => j.status === 'Completed').length;
                                const totalCount = file.jobs.length;
                                const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

                                return (
                                    <div key={`${file.path}-${index}`} 
                                        onClick={() => setActiveTrackerFileIndex(index)}
                                        className={`group relative p-6 cursor-pointer transition-all border-b border-gray-200 ${
                                            active ? 'bg-white border-l-4 border-l-black' : 'hover:bg-gray-100 border-l-4 border-l-transparent'
                                        }`} 
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-xs font-bold uppercase truncate tracking-wider ${active ? 'text-black' : 'text-gray-400 group-hover:text-gray-600'}`} title={file.name}>
                                                {file.name.replace('.xlsx', '')}
                                            </span>
                                            {active && <button onClick={(e) => { e.stopPropagation(); handleCloseTrackerTab(index); }} className="text-gray-400 hover:text-red-500">×</button>}
                                        </div>
                                        <div className="w-full bg-gray-200 h-1 mb-2 rounded-full overflow-hidden">
                                            <div className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-black' : 'bg-[#D4AF37]'}`} style={{ width: `${progress}%` }}></div>
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-mono">
                                            {completedCount.toString().padStart(2, '0')} / {totalCount.toString().padStart(2, '0')} PHOTOS
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </aside>

                    {/* RIGHT CONTENT */}
                    <section className="flex-1 flex flex-col min-w-0 bg-white">
                        {currentFile && stats && (
                            <>
                            <div className="flex-none p-8 border-b border-gray-200 bg-white shadow-sm z-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex">
                                        <StatCard label="HOÀN THÀNH" value={`${stats.completed}/${stats.total}`} />
                                        <StatCard label="ĐANG CHỜ" value={stats.inProgress} />
                                        <StatCard label="LỖI" value={stats.failed} />
                                    </div>
                                    
                                </div>

                                <div className="flex flex-wrap items-center gap-6">
                                    <button onClick={handleReloadVideos} className="text-gray-400 hover:text-black text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition group">
                                        <RetryIcon className="w-4 h-4 group-hover:rotate-180 transition-transform"/> LÀM MỚI
                                    </button>
                                    <button onClick={handleRetryStuckJobs} className="text-gray-400 hover:text-black text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition">
                                        SỬA LỖI KẸT
                                    </button>
                                    <div className="h-4 w-px bg-gray-200"></div>
                                    <button onClick={handleOpenToolFlows} className="text-gray-400 hover:text-black text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition">
                                        <ExternalLinkIcon className="w-4 h-4"/> TOOLFLOWS
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleSetToolFlowsPath(); }} className="text-gray-400 hover:text-black transition"><CogIcon className="w-3 h-3"/></button>
                                    <div className="h-4 w-px bg-gray-200"></div>
                                    <button onClick={() => handleOpenFolder(currentFile.path)} className="text-gray-400 hover:text-black text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition">
                                        THƯ MỤC
                                    </button>
                                    <button onClick={() => handleCopyPath(getFolderPath(currentFile.path))} className="text-gray-400 hover:text-black transition" title="Copy Folder Path">
                                        <CopyIcon className="w-3 h-3"/>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-hidden relative bg-gray-50/30">
                                <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-black">
                                        <thead className="bg-white text-gray-500 uppercase text-[10px] font-bold tracking-widest sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                                            <tr>
                                                <th className="px-8 py-5 text-left font-bold w-24 bg-gray-50">ID</th>
                                                <th className="px-8 py-5 text-left font-bold w-32 bg-gray-50">TRẠNG THÁI</th>
                                                <th className="px-8 py-5 text-left font-bold bg-gray-50">TÊN ẢNH</th>
                                                <th className="px-8 py-5 text-center font-bold w-48 bg-gray-50">PREVIEW</th>
                                                <th className="px-8 py-5 text-right font-bold w-40 bg-gray-50">THAO TÁC</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {currentFile.jobs.map(job => (
                                                <tr key={job.id} className="hover:bg-white transition-colors group">
                                                    <td className="px-8 py-6 font-mono text-xs text-gray-500 font-medium">{job.id}</td>
                                                    <td className="px-8 py-6 font-mono text-xs font-bold uppercase tracking-wide">
                                                        <span className={getStatusBadge(job.status)}>{job.status === 'Pending' ? 'Đang chờ' : job.status === 'Processing' ? 'Đang xử lý' : job.status === 'Generating' ? 'Đang tạo' : job.status === 'Completed' ? 'Hoàn thành' : 'Lỗi'}</span>
                                                    </td>
                                                    <td className="px-8 py-6 font-mono text-xs text-gray-700 font-medium">{job.fileName}</td>
                                                    <td className="px-8 py-6 flex justify-center">{renderResultCell(job, activeTrackerFileIndex)}</td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {job.generatedFilePath && (
                                                                <>
                                                                    <button onClick={() => handleShowInFolder(job.generatedFilePath)} className="text-gray-400 hover:text-black transition transform hover:scale-110" title="Mở thư mục"><FolderIcon className="w-4 h-4"/></button>
                                                                    <button onClick={() => handleDeleteVideo(job.id, job.generatedFilePath)} className="text-gray-400 hover:text-red-500 transition transform hover:scale-110" title="Xóa"><TrashIcon className="w-4 h-4"/></button>
                                                                </>
                                                            )}
                                                            <button onClick={() => handleRetryJob(job.id)} className="text-gray-400 hover:text-black transition transform hover:scale-110" title="Reset"><RetryIcon className="w-4 h-4"/></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            </>
                        )}
                    </section>
                </div>
            )}
        </main>
    );
};

export default TrackerTab;
