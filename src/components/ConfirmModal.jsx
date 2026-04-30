import { X, AlertTriangle } from 'lucide-react'
import { createPortal } from 'react-dom'

export default function ConfirmModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = 'Confirmar', 
    cancelText = 'Cancelar', 
    isDestructive = false,
    closeOnConfirm = true 
}) {
    if (!isOpen) return null

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
            
            <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-gray-900 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-gold-500/10 text-gold-500'}`}>
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-bold text-white">{title}</h3>
                    </div>
                    
                    <p className="text-sm text-gray-400 leading-relaxed mb-6">
                        {message}
                    </p>
                    
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 h-12 rounded-xl bg-gray-800 text-sm font-bold text-gray-300 hover:bg-gray-700 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm()
                                if (closeOnConfirm) onClose()
                            }}
                            className={`flex-1 h-12 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                                isDestructive 
                                ? 'bg-red-500 text-white hover:bg-red-400 shadow-lg shadow-red-500/20' 
                                : 'bg-gold-500 text-black hover:bg-gold-400 shadow-lg shadow-gold-500/20'
                            }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.getElementById('portal-root') || document.body)
}
