import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { X, GripVertical, Trash2, ArrowUpDown } from 'lucide-react'

export default function ReorderExercisesModal({ isOpen, onClose, blocks, onReorder, onRemoveBlock }) {
    if (!isOpen) return null

    const handleDragEnd = (result) => {
        if (!result.destination) return

        const items = Array.from(blocks)
        const [reorderedItem] = items.splice(result.source.index, 1)
        items.splice(result.destination.index, 0, reorderedItem)

        onReorder(items)
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-gray-950 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 p-6 bg-gray-900/50 backdrop-blur-xl">
                <div className="flex flex-col">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <ArrowUpDown className="h-5 w-5 text-gold-500" />
                        Reordenar Rutina
                    </h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                        Arrastra para cambiar el orden de los bloques
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="rounded-full p-2 text-gray-400 hover:bg-white/5 transition-colors"
                >
                    <X className="h-8 w-8" />
                </button>
            </div>

            {/* Draggable List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="workout-blocks">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-3"
                            >
                                {blocks.map((block, index) => (
                                    <Draggable key={block.id} draggableId={block.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`flex items-center gap-4 rounded-3xl p-5 transition-all outline-none ${snapshot.isDragging
                                                        ? "bg-gold-500/20 border-2 border-gold-500 shadow-2xl scale-102"
                                                        : "bg-white/5 border border-white/10"
                                                    }`}
                                            >
                                                <div
                                                    {...provided.dragHandleProps}
                                                    className="p-2 -ml-2 text-gray-600 hover:text-gold-500 transition-colors"
                                                >
                                                    <GripVertical className="h-6 w-6" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-col">
                                                        {block.exercises.map((ex, exIdx) => (
                                                            <div key={ex.id || exIdx} className="flex items-center gap-2">
                                                                <span className="text-sm font-black text-white truncate uppercase italic tracking-tight">
                                                                    {ex.name}
                                                                </span>
                                                                {block.exercises.length > 1 && (
                                                                    <span className="text-[9px] font-black text-gold-500/50">
                                                                        ({String.fromCharCode(65 + exIdx)})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                                                            {block.type === 'superset' ? 'Superset' : block.exercises[0]?.muscle_group || 'General'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => onRemoveBlock(block.id)}
                                                    className="p-3 rounded-2xl bg-red-500/10 text-red-500/50 hover:bg-red-500/20 hover:text-red-500 transition-all active:scale-90 shadow-lg"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>

            {/* Footer / Confirm */}
            <div className="p-6 border-t border-white/5 bg-gray-950/80 backdrop-blur-xl">
                <button
                    onClick={onClose}
                    className="w-full rounded-2xl bg-gold-500 py-5 text-sm font-black text-black hover:bg-gold-400 active:scale-95 transition-all shadow-xl shadow-gold-500/20 uppercase tracking-[0.2em]"
                >
                    Listo
                </button>
            </div>
        </div>
    )
}
