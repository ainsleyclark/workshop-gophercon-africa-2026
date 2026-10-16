import React, { useState } from 'react';
import { X, CheckCircle, DollarSign, ShieldAlert, Award } from 'lucide-react';

interface PledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSpeciesName: string;
}

export const PledgeModal: React.FC<PledgeModalProps> = ({
  isOpen,
  onClose,
  activeSpeciesName,
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [frequency, setFrequency] = useState<'once' | 'monthly'>('monthly');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const amounts = [25, 50, 100, 250];

  const handlePledge = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
  };

  const finalAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;

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

        <div className="p-6 md:p-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#FDB813]">
              WILDLIFE DEFENSE FUND
            </span>
          </div>

          <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white font-['Outfit']">
            Support {activeSpeciesName} Field Teams
          </h3>

          <p className="mt-1 text-xs text-neutral-300 leading-relaxed">
            100% of your tax-deductible pledge directly outfits anti-poaching ranger units, GPS telemetry satellite collars, and community sanctuary patrols.
          </p>

          {isSuccess ? (
            <div className="py-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-12 h-12 bg-[#FDB813]/20 text-[#FDB813] rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-bold text-white uppercase">Pledge Confirmed</h4>
              <p className="text-xs text-neutral-300 mt-2 max-w-sm mx-auto">
                Thank you for your generous {frequency === 'monthly' ? 'monthly' : 'one-time'} pledge of ${finalAmount}. You are actively financing habitat protection for the {activeSpeciesName}.
              </p>
              <div className="mt-4 p-3 bg-black/40 border border-[#FDB813]/30 rounded text-left text-[11px] text-neutral-300">
                <div className="flex items-center gap-2 text-[#FDB813] font-bold mb-1">
                  <Award className="w-4 h-4" />
                  <span>Conservation Defender Certificate Issued</span>
                </div>
                <span>Tax ID: 52-0732890 · National Geographic Society 501(c)(3)</span>
              </div>
              <button
                onClick={onClose}
                className="mt-5 px-6 py-2.5 bg-[#FDB813] text-black text-xs font-bold uppercase tracking-wider rounded hover:bg-[#e5a40f] transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handlePledge} className="mt-5 space-y-4">
              {/* Frequency Toggle */}
              <div className="flex bg-black/50 p-1 rounded border border-neutral-700">
                <button
                  type="button"
                  onClick={() => setFrequency('monthly')}
                  className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                    frequency === 'monthly'
                      ? 'bg-[#FDB813] text-black shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Monthly Impact
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency('once')}
                  className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                    frequency === 'once'
                      ? 'bg-[#FDB813] text-black shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Give Once
                </button>
              </div>

              {/* Amount Grid */}
              <div className="grid grid-cols-4 gap-2">
                {amounts.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(amount);
                      setCustomAmount('');
                    }}
                    className={`py-3 rounded border text-sm font-mono font-bold transition-all cursor-pointer ${
                      selectedAmount === amount && !customAmount
                        ? 'border-[#FDB813] bg-[#FDB813]/20 text-[#FDB813]'
                        : 'border-neutral-700 bg-black/40 text-neutral-300 hover:border-neutral-500'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              {/* Custom Amount */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1">
                  Or Custom Amount ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    placeholder="Other Amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-black/60 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-[#FDB813] font-mono"
                  />
                </div>
              </div>

              {/* Impact Breakdown */}
              <div className="p-3 bg-neutral-900/80 border border-white/5 rounded text-[11px] text-neutral-300 leading-snug">
                {finalAmount >= 100 ? (
                  <span>
                    ⚡ <strong>${finalAmount}</strong> equips 2 ranger teams with satellite GPS telemetry and solar communication rigs for high-altitude snow patrols.
                  </span>
                ) : (
                  <span>
                    ⚡ <strong>${finalAmount}</strong> supplies night-vision binoculars and anti-snare camera trap batteries for wildlife wardens.
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#FDB813] text-black text-xs font-black uppercase tracking-[0.15em] rounded hover:bg-[#e5a40f] transition-all transform active:scale-[0.99] cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                Complete ${finalAmount} Pledge
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
