import { ShieldCheck, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePrivacyConsent } from '../hooks/usePrivacyConsent';
import { Link } from 'react-router-dom';

/**
 * Legal consent modal - non-dismissible GDPR compliance component
 * Blocks user access until they accept privacy terms
 */
export default function LegalModal() {
    const { acceptTerms, isAccepting } = usePrivacyConsent();

    const handleAccept = () => {
        acceptTerms();
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/95 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md mx-4 bg-zinc-800 rounded-lg shadow-2xl border border-zinc-700 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-b border-amber-500/20 p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <ShieldCheck className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                Consentimiento de Privacidad
                            </h2>
                            <p className="text-sm text-zinc-400 mt-1">
                                Requerido por RGPD
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700">
                        <p className="text-zinc-300 leading-relaxed text-sm">
                            Al utilizar <span className="font-semibold text-amber-500">Jose Vega - Personal Trainer</span>,
                            confirmas que eres mayor de edad y otorgas tu consentimiento para que tu entrenador
                            gestione tus datos de rendimiento físico (ejercicios, pesos y feedback) en esta
                            plataforma conforme al <span className="font-semibold">RGPD</span>.
                        </p>
                    </div>

                    <div className="text-xs text-zinc-500 space-y-1">
                        <p>
                            • Tus datos solo serán accesibles por tu entrenador asignado
                        </p>
                        <p>
                            • Puedes ejercer tus derechos ARCO en cualquier momento
                        </p>
                        <p>
                            • Lee nuestra{' '}
                            <Link
                                to="/legal-terms"
                                className="text-amber-500 hover:text-amber-400 underline"
                                target="_blank"
                            >
                                Política de Privacidad completa
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 bg-zinc-900/30 border-t border-zinc-700 flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleAccept}
                        disabled={isAccepting}
                        className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 
                     text-zinc-900 font-semibold py-3 px-6 rounded-lg 
                     transition-all duration-200 transform hover:scale-105 
                     disabled:transform-none disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
                    >
                        {isAccepting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                                <span>Procesando...</span>
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="w-4 h-4" />
                                <span>Aceptar y Continuar</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleSignOut}
                        disabled={isAccepting}
                        className="flex-1 sm:flex-none bg-zinc-700 hover:bg-zinc-600 
                     disabled:bg-zinc-700/50 text-zinc-300 font-medium 
                     py-3 px-6 rounded-lg transition-colors duration-200
                     disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
