
import React, { useState, useEffect } from 'react';
import { StatsData } from '../types';
import { ShieldIcon, ChartIcon, LoaderIcon, TrashIcon } from './Icons';

interface StatsModalProps {
    onClose: () => void;
    isAdmin: boolean;
    onDeleteHistory: (date: string) => void;
    onDeleteAll: () => void;
}

const isElectron = navigator.userAgent.toLowerCase().includes('electron');
const ipcRenderer = isElectron && (window as any).require ? (window as any).require('electron').ipcRenderer : null;

const StatsModal: React.FC<StatsModalProps> = ({ onClose, isAdmin, onDeleteHistory, onDeleteAll }) => {
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);

    const loadStats = () => {
        if (ipcRenderer) {
            ipcRenderer.invoke('get-stats').then((data: StatsData) => {
                setStats(data);
                setLoading(false);
            }).catch((err: any) => {
                console.error("Failed to load stats", err);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    const handleDelete = async (date: string) => {
        await onDeleteHistory(date);
        loadStats(); // Reload after delete
    };
    
    const handleDeleteAll = async () => {
        await onDeleteAll();
        loadStats();
    };

    const maxCount = stats?.history.reduce((max, item) => Math.max(max, item.count), 0) || 1;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className={`bg-gray-800 border ${isAdmin ? 'border-red-500' : 'border-gray-600'} rounded-xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
                <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-900">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        {isAdmin ? <ShieldIcon className="w-6 h-6 text-red-500" /> : <ChartIcon className="w-6 h-6 text-indigo-400" />}
                        {isAdmin ? 'Quản Trị Thống Kê (Admin)' : 'Thống kê Sản Xuất'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex justify-center py-10"><LoaderIcon /></div>
                    ) : !stats ? (
                        <p className="text-center text-gray-400">Không có dữ liệu thống kê.</p>
                    ) : (
                        <div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-gray-900 p-4 rounded-lg text-center border border-gray-700">
                                    <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Tổng Video</p>
                                    <p className="text-3xl font-bold text-emerald-400 mt-2">{stats.total}</p>
                                </div>
                                <div className="bg-gray-900 p-4 rounded-lg text-center border border-gray-700">
                                    <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Prompt Đã Tạo</p>
                                    <p className="text-3xl font-bold text-blue-400 mt-2">{stats.promptCount}</p>
                                </div>
                                <div className="bg-gray-900 p-4 rounded-lg text-center border border-gray-700">
                                    <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Credits</p>
                                    <p className="text-3xl font-bold text-yellow-400 mt-2">{stats.totalCredits}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">(1 Video = 10 Credits)</p>
                                </div>
                                <div className="bg-gray-900 p-4 rounded-lg text-center border border-gray-700">
                                    <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Mã Máy</p>
                                    <p className="text-xs font-mono text-gray-300 mt-2 bg-black/40 p-2 rounded break-all border border-gray-800">{stats.machineId}</p>
                                </div>
                            </div>

                            {isAdmin && (
                                <div className="mb-8 p-4 bg-gray-900 rounded-xl border border-gray-700">
                                    <h4 className="text-white font-semibold mb-4 flex items-center gap-2"><ChartIcon className="w-4 h-4"/> Biểu đồ sản lượng</h4>
                                    <div className="flex items-end gap-2 h-40 pt-4 pb-2 px-2 overflow-x-auto">
                                        {stats.history.length === 0 ? <p className="text-gray-500 w-full text-center">Chưa có dữ liệu biểu đồ</p> : 
                                            stats.history.slice(0, 14).reverse().map((item) => (
                                                <div key={item.date} className="flex flex-col items-center gap-1 group relative min-w-[40px] flex-1">
                                                    <div className="text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 bg-black px-2 py-1 rounded">{item.count}</div>
                                                    <div 
                                                        className="w-full bg-indigo-600 hover:bg-indigo-500 transition-all rounded-t-sm"
                                                        style={{ height: `${(item.count / maxCount) * 100}%`, minHeight: '4px' }}
                                                    ></div>
                                                    <div className="text-[10px] text-gray-500 rotate-0 truncate w-full text-center">{item.date.split('-').slice(1).join('/')}</div>
                                                </div>
                                            ))
                                        }
                                    </div>
                                    <div className="flex justify-end mt-2">
                                         <button 
                                            onClick={() => {
                                                if(confirm("Bạn có chắc chắn muốn xóa TOÀN BỘ lịch sử thống kê? Hành động này không thể hoàn tác.")) {
                                                    handleDeleteAll();
                                                }
                                            }}
                                            className="bg-red-700 hover:bg-red-600 text-white font-bold py-1 px-3 rounded transition text-xs flex items-center gap-2"
                                        >
                                            <TrashIcon className="w-3 h-3"/> Reset Dữ Liệu
                                        </button>
                                    </div>
                                </div>
                            )}

                            <h4 className="text-lg font-semibold text-white mb-3">Chi tiết lịch sử</h4>
                            <div className="overflow-hidden rounded-lg border border-gray-700 max-h-60 overflow-y-auto">
                                <table className="w-full text-left text-sm text-gray-300">
                                    <thead className="bg-gray-900 text-gray-400 uppercase font-semibold sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 border-b border-gray-700">Ngày</th>
                                            <th className="px-6 py-3 text-right border-b border-gray-700">Số lượng Video</th>
                                            {isAdmin && <th className="px-6 py-3 text-center border-b border-gray-700">Thao tác</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700 bg-gray-800">
                                        {stats.history.length === 0 ? (
                                            <tr><td colSpan={isAdmin ? 3 : 2} className="px-6 py-4 text-center">Chưa có dữ liệu</td></tr>
                                        ) : (
                                            stats.history.map((item) => (
                                                <tr key={item.date} className="hover:bg-gray-700 transition">
                                                    <td className="px-6 py-4 font-medium text-white">{item.date}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-emerald-400">{item.count}</td>
                                                    {isAdmin && (
                                                        <td className="px-6 py-4 text-center">
                                                            <button 
                                                                onClick={() => {
                                                                    if(confirm(`Xóa thống kê ngày ${item.date}?`)) {
                                                                        handleDelete(item.date);
                                                                    }
                                                                }}
                                                                className="text-red-400 hover:text-red-300 p-1"
                                                            >
                                                                <TrashIcon className="w-4 h-4"/>
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t border-gray-700 text-right bg-gray-900 rounded-b-xl">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition shadow-lg border border-gray-600"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StatsModal;
