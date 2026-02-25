import { ArrowLeft, Shield, Mail, FileText, Lock, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Privacy Policy page - GDPR compliant privacy information
 * Adapted for personal training app in Spain
 */
export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-zinc-900 text-zinc-100">
            {/* Header */}
            <div className="bg-zinc-800 border-b border-zinc-700 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link
                        to="/app"
                        className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <Shield className="w-6 h-6 text-amber-500" />
                        <h1 className="text-xl font-bold">Política de Privacidad</h1>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* Introduction */}
                <section className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                    <div className="flex items-start gap-3">
                        <FileText className="w-6 h-6 text-amber-500 mt-1 flex-shrink-0" />
                        <div>
                            <h2 className="text-2xl font-bold mb-3">Aviso Legal</h2>
                            <p className="text-zinc-300 leading-relaxed">
                                En cumplimiento del Reglamento General de Protección de Datos (RGPD) y la
                                Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los
                                en la plataforma <span className="font-semibold text-amber-500">Jose Vega - Personal Trainer</span>.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Responsable */}
                <section className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                    <div className="flex items-start gap-3">
                        <UserCheck className="w-6 h-6 text-amber-500 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold mb-3">Responsable del Tratamiento</h2>
                            <div className="space-y-2 text-zinc-300">
                                <p><span className="font-semibold text-white">Identidad:</span> Jose Vega</p>
                                <p><span className="font-semibold text-white">Actividad:</span> Entrenador Personal</p>
                                <p><span className="font-semibold text-white">Contacto:</span> A través de la plataforma o correo electrónico proporcionado por tu entrenador</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Finalidad */}
                <section className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                    <h2 className="text-2xl font-bold mb-4">Finalidad del Tratamiento</h2>
                    <div className="space-y-3 text-zinc-300">
                        <p>Tus datos personales serán tratados con las siguientes finalidades:</p>
                        <ul className="list-disc list-inside space-y-2 ml-4">
                            <li>Gestión de tu programa de entrenamiento personalizado</li>
                            <li>Registro y seguimiento de tu rendimiento físico (ejercicios, pesos, repeticiones)</li>
                            <li>Análisis de progreso y evolución deportiva</li>
                            <li>Comunicación entre tú y tu entrenador personal</li>
                            <li>Asignación de rutinas y planes de entrenamiento</li>
                        </ul>
                    </div>
                </section>

                {/* Legitimación */}
                <section className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                    <h2 className="text-2xl font-bold mb-4">Base Legal</h2>
                    <p className="text-zinc-300 leading-relaxed">
                        El tratamiento de tus datos se basa en tu <span className="font-semibold text-white">consentimiento expreso</span>,
                        otorgado al aceptar esta política de privacidad y en la <span className="font-semibold text-white">ejecución
                            del contrato</span> de servicios de entrenamiento personal que mantienes con Jose Vega.
                    </p>
                </section>

                {/* Derechos ARCO */}
                <section className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                    <h2 className="text-2xl font-bold mb-4">Tus Derechos (ARCO)</h2>
                    <div className="space-y-3 text-zinc-300">
                        <p>Como titular de tus datos, tienes derecho a:</p>
                        <div className="grid sm:grid-cols-2 gap-3 mt-4">
                            <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700">
                                <h3 className="font-semibold text-amber-500 mb-2">Acceso</h3>
                                <p className="text-sm">Obtener información sobre qué datos tuyos estamos tratando</p>
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700">
                                <h3 className="font-semibold text-amber-500 mb-2">Rectificación</h3>
                                <p className="text-sm">Corregir datos inexactos o incompletos</p>
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700">
                                <h3 className="font-semibold text-amber-500 mb-2">Supresión</h3>
                                <p className="text-sm">Solicitar la eliminación de tus datos personales</p>
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700">
                                <h3 className="font-semibold text-amber-500 mb-2">Oposición</h3>
                                <p className="text-sm">Oponerte al tratamiento de tus datos</p>
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700">
                                <h3 className="font-semibold text-amber-500 mb-2">Portabilidad</h3>
                                <p className="text-sm">Recibir tus datos en formato estructurado</p>
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700">
                                <h3 className="font-semibold text-amber-500 mb-2">Limitación</h3>
                                <p className="text-sm">Solicitar la limitación del tratamiento</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Seguridad */}
                <section className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                    <div className="flex items-start gap-3">
                        <Lock className="w-6 h-6 text-amber-500 mt-1 flex-shrink-0" />
                        <div>
                            <h2 className="text-2xl font-bold mb-3">Seguridad de los Datos</h2>
                            <p className="text-zinc-300 leading-relaxed mb-3">
                                Hemos implementado medidas técnicas y organizativas apropiadas para garantizar
                                la seguridad de tus datos personales:
                            </p>
                            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-4">
                                <li>Cifrado de datos en tránsito y en reposo</li>
                                <li>Autenticación segura mediante Supabase Auth</li>
                                <li>Políticas de seguridad a nivel de fila (RLS) en base de datos</li>
                                <li>Acceso restringido solo a tu entrenador asignado</li>
                                <li>Copias de seguridad regulares</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Conservación */}
                <section className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                    <h2 className="text-2xl font-bold mb-4">Conservación de Datos</h2>
                    <p className="text-zinc-300 leading-relaxed">
                        Tus datos personales serán conservados mientras mantengas una relación activa con
                        tu entrenador. Una vez finalizada la relación profesional, tus datos serán eliminados
                        o anonimizados, salvo que exista una obligación legal de conservarlos.
                    </p>
                </section>

                {/* Destinatarios */}
                <section className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
                    <h2 className="text-2xl font-bold mb-4">Destinatarios de los Datos</h2>
                    <p className="text-zinc-300 leading-relaxed">
                        Tus datos <span className="font-semibold text-white">no serán cedidos a terceros</span>,
                        salvo obligación legal. Únicamente tendrán acceso:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-4 mt-3">
                        <li>Tu entrenador personal asignado (Jose Vega)</li>
                        <li>Proveedores de servicios técnicos necesarios para el funcionamiento de la plataforma (Supabase - hosting y base de datos)</li>
                    </ul>
                </section>

                {/* Contacto */}
                <section className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 rounded-lg p-6 border border-amber-500/20">
                    <div className="flex items-start gap-3">
                        <Mail className="w-6 h-6 text-amber-500 mt-1 flex-shrink-0" />
                        <div>
                            <h2 className="text-2xl font-bold mb-3">Ejercer tus Derechos</h2>
                            <p className="text-zinc-300 leading-relaxed">
                                Para ejercer cualquiera de tus derechos ARCO, puedes contactar directamente
                                con tu entrenador personal a través de la plataforma o mediante el correo
                                electrónico que te haya proporcionado. Responderemos a tu solicitud en un
                                plazo máximo de <span className="font-semibold text-white">30 días</span>.
                            </p>
                            <p className="text-zinc-400 text-sm mt-3">
                                También tienes derecho a presentar una reclamación ante la Agencia Española
                                de Protección de Datos (AEPD) si consideras que tus derechos no han sido atendidos.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <div className="text-center text-zinc-500 text-sm pt-4 border-t border-zinc-800">
                    <p>Última actualización: Enero 2026</p>
                    <p className="mt-2">
                        Jose Vega - Personal Trainer
                    </p>
                </div>
            </div>
        </div>
    );
}
