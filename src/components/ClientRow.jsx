import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    MoreVertical,
    Edit2,
    Trash2,
    ShieldCheck,
    ShieldAlert,
    Dumbbell,
    Link,
    Loader2
} from 'lucide-react';

export default function ClientRow({
    client,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    onToggleStatus,
    onAssignRoutine,
    onGenerateMagicLink
}) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuStyles, setMenuStyles] = useState({});
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        if (!isMenuOpen) return;

        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target) &&
                triggerRef.current && !triggerRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

    // Update position when opening
    useEffect(() => {
        if (isMenuOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Positioning the menu relative to the viewport for portal usage
            setMenuStyles({
                top: `${rect.bottom + 8}px`,
                right: `${window.innerWidth - rect.right}px`,
            });
        }
    }, [isMenuOpen]);

    const handleAction = (e, callback) => {
        e.preventDefault();
        e.stopPropagation();
        setIsMenuOpen(false);
        if (callback) callback();
    };

    const toggleMenu = (e) => {
        e.stopPropagation();
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <div
            role="row"
            aria-label={client.full_name}
            onClick={() => onSelect(client.id)}
            data-testid={`client-card-${client.full_name}`}
            className={`group relative flex items-center gap-4 rounded-2xl border p-3 transition-all cursor-pointer ${isSelected
                ? 'bg-gold-500/5 border-gold-500/30 shadow-lg shadow-gold-500/10'
                : 'bg-gray-900/50 border-gray-800 hover:border-gray-700 hover:bg-gray-800'
                } ${client.is_active === false ? 'opacity-50 grayscale' : ''} ${isMenuOpen ? 'z-50' : ''}`}
            data-active={client.is_active !== false}
        >
            <div className="relative">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-800 border-2 border-gray-700 group-hover:border-gold-500/50 transition-colors">
                    <img
                        src={client.avatar_url || `https://ui-avatars.com/api/?name=${client.full_name}&background=random`}
                        alt={client.full_name}
                        className="h-full w-full object-cover"
                    />
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-semibold truncate ${isSelected ? 'text-gold-500' : 'text-gray-200'}`}>
                    {client.full_name}
                </h3>
                <p className="text-[10px] text-gray-500 truncate lowercase italic">
                    {client.email || 'Sin email'}
                </p>
            </div>

            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {/* Always visible action */}
                <button
                    onClick={(e) => handleAction(e, onAssignRoutine)}
                    data-testid="action-assign"
                    className="p-2 rounded-xl text-gray-400 hover:text-gold-500 hover:bg-gray-800 transition-all border border-transparent active:scale-95"
                    title="Gestionar Rutinas"
                >
                    <Dumbbell className="h-5 w-5" />
                </button>

                {/* Dropdown Menu Trigger */}
                <div className="relative">
                    <button
                        ref={triggerRef}
                        onClick={toggleMenu}
                        data-testid="actions-trigger"
                        className="p-2 rounded-xl text-gray-400 hover:text-gold-500 hover:bg-gray-800 transition-all border border-transparent active:scale-95"
                        title="Acciones"
                    >
                        <MoreVertical className="h-5 w-5" />
                    </button>

                    {isMenuOpen && (
                        <div
                            ref={menuRef}
                            className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl bg-gray-950 border border-gray-800 shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100 ring-1 ring-white/5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={(e) => handleAction(e, onGenerateMagicLink)}
                                data-testid="action-magic-link"
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-gray-800 hover:text-gold-500 transition-colors"
                            >
                                <Link className="h-4 w-4" />
                                Generar Acceso (Magic Link)
                            </button>

                            <button
                                onClick={(e) => handleAction(e, onToggleStatus)}
                                data-testid="action-deactivate"
                                className={`flex w-full items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors ${client.is_active === false
                                    ? 'text-emerald-400 hover:bg-emerald-500/10'
                                    : 'text-gray-300 hover:bg-gray-800 hover:text-gold-500'
                                    }`}
                            >
                                {client.is_active === false ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                                {client.is_active === false ? 'Activar Acceso' : 'Desactivar Acceso'}
                            </button>

                            <button
                                onClick={(e) => handleAction(e, onEdit)}
                                data-testid="action-edit"
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-gray-800 hover:text-gold-500 transition-colors"
                            >
                                <Edit2 className="h-4 w-4" />
                                Editar Perfil
                            </button>

                            <div className="h-px bg-gray-800 my-1" />

                            <button
                                onClick={(e) => handleAction(e, onDelete)}
                                data-testid="action-delete"
                                className="flex w-full items-center gap-3 px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                                Eliminar Cliente
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
