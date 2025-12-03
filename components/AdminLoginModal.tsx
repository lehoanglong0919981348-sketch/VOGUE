
import React, { useState } from 'react';
import { LockIcon, LoaderIcon } from './Icons';

interface AdminLoginModalProps {
    onClose: () => void;
    onLoginSuccess: () => void;
}

const isElectron = navigator.userAgent.toLowerCase().includes('electron');
const ipcRenderer = isElectron && (window as any).require ? (window as any).require('electron').ipcRenderer : null;

const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onClose, onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (ipcRenderer) {
            const result = await ipcRenderer.invoke('verify-admin', { username, password });
            if (result.success) {
                onLoginSuccess();
            } else {
                setError(result.error || 'Đăng nhập thất bại');
            }
        } else {
            // Dev mode bypass
            if (username === 'bescuong' && password === '285792684') {
                onLoginSuccess();
            } else {
                 setError('Sai thông tin đăng nhập');
            }
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-gray-800 border border-indigo-500/50 rounded-xl max-w-sm w-full shadow-2xl p-6">
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-900/50 mb-4 border border-indigo-500/30">
                        <LockIcon className="w-6 h-6 text-indigo-300" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Đăng Nhập Quản Trị</h3>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Tên đăng nhập"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Mật khẩu"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                            required
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    
                    <div className="flex gap-3 mt-6">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition border border-gray-600"
                        >
                            Hủy
                        </button>
                        <button 
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition disabled:bg-gray-600"
                        >
                            {loading ? <LoaderIcon /> : 'Đăng nhập'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLoginModal;
