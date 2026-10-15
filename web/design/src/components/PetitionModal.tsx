import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck } from 'lucide-react';

interface PetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSpeciesName: string;
}

export const PetitionModal: React.FC<PetitionModalProps> = ({
  isOpen,
  onClose,
  activeSpeciesName,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('United States');
  const [isSigned, setIsSigned] = useState(false);
  const [signatureCount, setSignatureCount] = useState(142854);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !email) return;
    setIsSigned(true);
    setSignatureCount((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#181a1f] border border-white/10 rounded-sm shadow-2xl overflow-hidden text-neutral-100">
        {/* Top Accent Strip */}
        <div className="h-1.5 bg-[#FDB813] w-full" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#FDB813]">
              NATIONAL GEOGRAPHIC SOCIETY
            </span>
          </div>

          <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white font-['Outfit']">
            Global Apex Species Protection Charter
          </h3>

          <p className="mt-2 text-xs text-neutral-300 leading-relaxed">
            Demand immediate treaty enforcement to safeguard the migratory corridors of the{' '}
            <strong className="text-[#FDB813]">{activeSpeciesName}</strong> and combat illegal wildlife trafficking.
          </p>

          {/* Signature Counter & Progress */}
          <div className="my-5 p-3.5 bg-black/40 border border-white/5 rounded">
            <div className="flex justify-between items-baseline text-xs mb-1.5">
              <span className="font-semibold text-neutral-300">
                <span className="font-mono text-[#FDB813] text-sm font-bold">{signatureCount.toLocaleString()}</span> Citizens Signed
              </span>
              <span className="text-neutral-400 font-mono text-[11px]">Goal: 150,000</span>
            </div>
            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FDB813] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (signatureCount / 150000) * 100)}%` }}
              />
            </div>
          </div>

          {isSigned ? (
            <div className="py-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-12 h-12 bg-[#FDB813]/20 text-[#FDB813] rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-bold text-white uppercase">Petition Endorsed</h4>
              <p className="text-xs text-neutral-300 mt-1 max-w-sm mx-auto">
                Thank you, {firstName}! Your signature has been registered on the Global Conservation Registry. We have sent your charter certificate to {email}.
              </p>
              <button
                onClick={onClose}
                className="mt-5 px-6 py-2.5 bg-[#FDB813] text-black text-xs font-bold uppercase tracking-wider rounded hover:bg-[#e5a40f] transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full px-3 py-2 bg-black/60 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-[#FDB813]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Goodall"
                    className="w-full px-3 py-2 bg-black/60 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-[#FDB813]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.goodall@conservation.org"
                  className="w-full px-3 py-2 bg-black/60 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-[#FDB813]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">
                  Country / Territory
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 bg-black/60 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-[#FDB813]"
                >
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="India">India</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Australia">Australia</option>
                  <option value="International">Other Country</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#FDB813] text-black text-xs font-black uppercase tracking-[0.15em] rounded hover:bg-[#e5a40f] transition-all transform active:scale-[0.99] cursor-pointer shadow-lg flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  Sign The Conservation Charter
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
