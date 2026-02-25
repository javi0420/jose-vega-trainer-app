import { useState, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Clock, Check } from 'lucide-react'
import { clsx } from 'clsx'

export default function GlobalRestTimerModal({ isOpen, onClose, onApply, currentDefault = 60 }) {
    const [minutes, setMinutes] = useState(Math.floor(currentDefault / 60))
    const [seconds, setSeconds] = useState(currentDefault % 60)

    const handleApply = () => {
        const totalSeconds = (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0)
        onApply(totalSeconds)
        onClose()
    }

    const adjustMinutes = (delta) => {
        setMinutes(prev => Math.max(0, Math.min(prev + delta, 15)))
    }

    const adjustSeconds = (delta) => {
        setSeconds(prev => {
            let next = prev + delta
            if (next >= 60) return 0
            if (next < 0) return 45
            return next
        })
    }

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog onClose={onClose} className="relative z-[100]">
                {/* Backdrop */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
                </Transition.Child>

                {/* Modal Container */}
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95 translate-y-4"
                        enterTo="opacity-100 scale-100 translate-y-0"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100 translate-y-0"
                        leaveTo="opacity-0 scale-95 translate-y-4"
                    >
                        <Dialog.Panel className="w-full max-w-sm rounded-[2.5rem] glass-card border border-white/10 p-8 shadow-2xl relative overflow-hidden">
                            {/* Decorative background element */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold-500/10 blur-[60px] rounded-full pointer-events-none" />

                            {/* Header */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-gold-500/10 border border-gold-500/20">
                                        <Clock className="w-5 h-5 text-gold-500" />
                                    </div>
                                    <Dialog.Title className="text-lg font-black text-white uppercase tracking-tight">
                                        Descanso Global
                                    </Dialog.Title>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <p className="text-xs text-gray-400 mb-8 leading-relaxed">
                                Establece un tiempo de descanso predeterminado para <span className="text-gold-500 font-bold">todos los ejercicios</span> de esta sesión.
                            </p>

                            {/* Time Selector */}
                            <div className="flex items-center justify-center gap-6 mb-10">
                                {/* Minutes */}
                                <div className="flex flex-col items-center gap-3">
                                    <button
                                        onClick={() => adjustMinutes(1)}
                                        data-testid="timer-min-plus"
                                        className="w-12 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-gold-500/10 hover:text-gold-500 transition-all active:scale-90"
                                    >
                                        <span className="font-bold">+</span>
                                    </button>
                                    <div className="flex flex-col items-center">
                                        <span className="text-5xl font-black text-white lining-nums">
                                            {minutes.toString().padStart(2, '0')}
                                        </span>
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Min</span>
                                    </div>
                                    <button
                                        onClick={() => adjustMinutes(-1)}
                                        data-testid="timer-min-minus"
                                        className="w-12 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-gold-500/10 hover:text-gold-500 transition-all active:scale-90"
                                    >
                                        <span className="font-bold">-</span>
                                    </button>
                                </div>

                                <span className="text-4xl font-black text-gold-500/50 pb-8">:</span>

                                {/* Seconds */}
                                <div className="flex flex-col items-center gap-3">
                                    <button
                                        onClick={() => adjustSeconds(15)}
                                        data-testid="timer-sec-plus"
                                        className="w-12 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-gold-500/10 hover:text-gold-500 transition-all active:scale-90"
                                    >
                                        <span className="font-bold">+</span>
                                    </button>
                                    <div className="flex flex-col items-center">
                                        <span className="text-5xl font-black text-white lining-nums">
                                            {seconds.toString().padStart(2, '0')}
                                        </span>
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Seg</span>
                                    </div>
                                    <button
                                        onClick={() => adjustSeconds(-15)}
                                        data-testid="timer-sec-minus"
                                        className="w-12 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-gold-500/10 hover:text-gold-500 transition-all active:scale-90"
                                    >
                                        <span className="font-bold">-</span>
                                    </button>
                                </div>
                            </div>

                            {/* Presets */}
                            <div className="grid grid-cols-4 gap-2 mb-10">
                                {[30, 60, 90, 120].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => {
                                            setMinutes(Math.floor(val / 60))
                                            setSeconds(val % 60)
                                        }}
                                        className={clsx(
                                            "py-2 rounded-xl text-[10px] font-black transition-all border",
                                            (minutes * 60 + seconds) === val
                                                ? "bg-gold-500 text-black border-gold-500 shadow-lg shadow-gold-500/20"
                                                : "bg-white/5 text-gray-400 border-white/5 hover:border-white/10 hover:text-white"
                                        )}
                                    >
                                        {val >= 60
                                            ? `${Math.floor(val / 60)}m${val % 60 > 0 ? ` ${val % 60}s` : ''}`
                                            : `${val}s`}
                                    </button>
                                ))}
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={handleApply}
                                data-testid="timer-apply-all"
                                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gold-500 text-black font-black text-xs uppercase tracking-widest hover:bg-gold-400 active:scale-[0.98] transition-all shadow-xl shadow-gold-500/20"
                            >
                                <Check className="w-4 h-4" />
                                Aplicar a todos
                            </button>
                        </Dialog.Panel>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition>
    )
}
