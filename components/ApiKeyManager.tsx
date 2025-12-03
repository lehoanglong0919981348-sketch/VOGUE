
import React, { useState } from 'react';
import { ApiKey } from '../types';
import { KeyIcon, TrashIcon } from './Icons';

interface ApiKeyManagerProps {
  apiKeys: ApiKey[];
  onKeySelect: (key: ApiKey) => void;
  onKeyAdd: (key: ApiKey) => void;
  onKeyDelete: (keyId: string) => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ apiKeys, onKeySelect, onKeyAdd, onKeyDelete }) => {
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyValue, setNewKeyValue] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!newKeyName.trim() || !newKeyValue.trim()) {
            setError('Biệt danh và giá trị khóa không được để trống.');
            return;
        }
        if (apiKeys.some(k => k.name === newKeyName.trim())) {
            setError('Biệt danh này đã tồn tại. Vui lòng chọn một biệt danh khác.');
            return;
        }
        onKeyAdd({
            id: crypto.randomUUID(),
            name: newKeyName.trim(),
            value: newKeyValue.trim(),
        });
        setNewKeyName('');
        setNewKeyValue('');
    };

    const truncateKey = (key: string) => `${key.slice(0, 5)}...${key.slice(-4)}`;

    return (
        <div className="text-gray-100 min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-2xl mx-auto">
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 sm:p-8 shadow-2xl">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-center text-white">
                        Quản lý API Keys
                    </h1>
                    <p className="text-gray-400 mb-6 text-center">
                        Thêm, xóa, hoặc chọn một Google AI API Key để sử dụng.
                    </p>

                    {apiKeys.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-gray-200 mb-3">Khóa đã lưu</h2>
                            <div className="space-y-3 key-list">
                                {apiKeys.map(key => (
                                    <div key={key.id} className="key-item">
                                        <div className="flex items-center gap-3">
                                            <KeyIcon className="w-5 h-5 text-indigo-400" />
                                            <div>
                                                <p className="font-semibold text-white">{key.name}</p>
                                                <p className="text-sm text-gray-400 font-mono">{truncateKey(key.value)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => onKeySelect(key)}
                                                className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-full transition text-sm"
                                            >
                                                Sử dụng
                                            </button>
                                            <button
                                                onClick={() => onKeyDelete(key.id)}
                                                className="p-2 text-red-400 hover:bg-red-900/30 rounded-full transition"
                                                title="Xóa khóa"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-200 mb-4">Thêm khóa mới</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="keyName" className="block text-sm font-medium text-gray-300 mb-2">
                                    Biệt danh (Nickname)
                                </label>
                                <input
                                    id="keyName"
                                    type="text"
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                    placeholder="Ví dụ: Key cá nhân, Key công ty"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="keyValue" className="block text-sm font-medium text-gray-300 mb-2">
                                    Giá trị API Key
                                </label>
                                <input
                                    id="keyValue"
                                    type="password"
                                    value={newKeyValue}
                                    onChange={(e) => setNewKeyValue(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                    placeholder="Dán API Key của bạn vào đây"
                                    required
                                />
                            </div>
                            {error && <p className="text-red-400 text-sm">{error}</p>}
                            <button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full transition-transform transform hover:scale-105 shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-900"
                            >
                                Thêm và Lưu khóa
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyManager;
