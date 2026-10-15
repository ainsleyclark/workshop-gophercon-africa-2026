import React from 'react';
import { X, Globe2, Compass, ShieldCheck, Sparkles } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#181a1f] border border-white/10 rounded-sm shadow-2xl overflow-hidden text-neutral-100">
        <div className="h-1.5 bg-[#FDB813] w-full" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#FDB813]">
              ABOUT THE ENDEAVOR
            </span>
          </div>

          <h3 className="text-2xl font-black uppercase tracking-tight text-white font-['Outfit']">
            National Geographic: The Endangered Species Initiative
          </h3>

          <p className="text-xs md:text-sm text-neutral-300 leading-relaxed">
            Since 1888, the National Geographic Society has pushed the boundaries of exploration to further our understanding of our planet and empower us all to generate solutions for a more healthy and sustainable future.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3 bg-black/40 border border-white/5 rounded">
              <Compass className="w-5 h-5 text-[#FDB813] shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-white uppercase">Explorer Field Expedition Grants</h5>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Direct scientific funding to over 15,000 global conservationists protecting vital planetary biomes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-black/40 border border-white/5 rounded">
              <Globe2 className="w-5 h-5 text-[#FDB813] shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-white uppercase">Protected Wildlife Corridors</h5>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Restoring safe terrestrial and maritime pathways for apex carnivores and keystone migratory herds.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-black/40 border border-white/5 rounded">
              <Sparkles className="w-5 h-5 text-[#FDB813] shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-white uppercase">Indigenous Community Stewardship</h5>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Partnering with local pastoralist communities across Central Asia and India to eliminate human-carnivore conflict.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[#FDB813] text-black text-xs font-black uppercase tracking-wider rounded hover:bg-[#e5a40f] transition-colors cursor-pointer"
            >
              Continue Exploring
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
