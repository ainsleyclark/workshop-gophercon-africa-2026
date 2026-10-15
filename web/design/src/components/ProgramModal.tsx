import React from 'react';
import { X, Tv, Clock, Film, Radio, Bell } from 'lucide-react';
import { DocumentarySchedule } from '../types.ts';
import { handleDesignImageError } from '../utils/imageFallback.ts';

interface ProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  program: DocumentarySchedule;
  featuredName: string;
  featuredImage: string;
}

export const ProgramModal: React.FC<ProgramModalProps> = ({
  isOpen,
  onClose,
  program,
  featuredName,
  featuredImage,
}) => {
  const [reminded, setReminded] = React.useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#181a1f] border border-white/10 rounded-sm shadow-2xl overflow-hidden text-neutral-100">
        <div className="h-1.5 bg-[#FDB813] w-full" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero banner for the selected database species */}
        <div className="relative h-44 bg-gradient-to-r from-black via-neutral-900 to-[#121316] overflow-hidden flex items-center px-6">
          <div className="z-10 max-w-xs">
            <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-[#FDB813] block mb-1">
              WILDLIFE ATLAS · FIELD RECORD
            </span>
            <h3 className="text-3xl font-black uppercase tracking-tight text-white font-['Outfit']">
              {featuredName}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-neutral-300 font-mono">
              <Clock className="w-3.5 h-3.5 text-[#FDB813]" />
              <span>{program.title}</span>
            </div>
          </div>

          <div className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-end">
            <img
              src={featuredImage}
              alt={featuredName}
              referrerPolicy="no-referrer"
              onError={handleDesignImageError}
              className="h-full object-cover object-left opacity-80 filter drop-shadow-2xl"
            />
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-4">
          <div>
            <h4 className="text-xs uppercase font-bold text-neutral-400 tracking-wider">
              Episode Synopsis
            </h4>
            <p className="mt-1 text-xs md:text-sm text-neutral-200 leading-relaxed">
              {program.synopsis}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-black/40 border border-white/5 rounded text-xs">
            <div>
              <span className="block text-[10px] uppercase font-bold text-neutral-400">Broadcaster</span>
              <span className="font-semibold text-white">{program.network}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-neutral-400">Narration</span>
              <span className="font-semibold text-neutral-200">{program.narrator}</span>
            </div>
          </div>

          <div>
            <span className="block text-[10px] uppercase font-bold text-neutral-400 mb-1.5">
              Featured Apex Predators
            </span>
            <div className="flex flex-wrap gap-2">
              {program.featuredPredators.map((predator) => (
                <span
                  key={predator}
                  className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-[11px] font-medium text-neutral-200"
                >
                  🐅 {predator}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => setReminded(true)}
              disabled={reminded}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-[0.15em] rounded transition-all flex items-center justify-center gap-2 cursor-pointer ${
                reminded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#FDB813] text-black hover:bg-[#e5a40f] active:scale-[0.99]'
              }`}
            >
              <Bell className="w-4 h-4" />
              {reminded ? 'Reminder Scheduled!' : 'Set Airtime Reminder'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-3 bg-white/10 text-white text-xs font-bold uppercase rounded hover:bg-white/15 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
