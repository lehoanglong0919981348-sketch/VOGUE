
import React from 'react';

interface AlertModalProps {
  title: string;
  message: string;
  type: 'completion' | 'update';
  onClose: () => void;
  onConfirm?: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({ title, message, type, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-gray-800 border-2 border-yellow-500 rounded-xl max-w-md w-full shadow-2xl transform scale-100 transition-all animate-bounce-small">
        <div className="p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-900/30 mb-4 border border-yellow-500/50">
             {type === 'update' ? (
                <svg className="h-10 w-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
             ) : (
                <svg className="h-10 w-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
             )}
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-300 mb-6">{message}</p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition border border-gray-600"
            >
              Đóng
            </button>
            {onConfirm && (
              <button 
                onClick={onConfirm}
                className="px-6 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold transition"
              >
                {type === 'update' ? 'Cập nhật ngay' : 'OK'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlertModal;
