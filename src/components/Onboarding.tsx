import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useCuvio } from '../context/CuvioContext';
import { Eye, Shield, Activity, ArrowRight, Ambulance } from 'lucide-react';

const slides = [
  {
    icon: <Eye className="w-12 h-12 text-[#0B5A4B]" />,
    title: "Brilliant Price Transparency",
    description: "Compare verified hospital OPD, ICU, and procedural charges across India's top medical facilities in one interface.",
    badge: "98% Cost Accuracy",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=600"
  },
  {
    icon: <Activity className="w-12 h-12 text-teal-600" />,
    title: "Predictive Wait-Time Engine",
    description: "Honest, real-time consultation tracking based on patients ahead, active cases, and doctor live status updates.",
    badge: "Live Queue Track",
    image: "https://images.unsplash.com/photo-1504813184591-01555615e722?auto=format&fit=crop&q=80&w=600"
  },
  {
    icon: <Ambulance className="w-12 h-12 text-emerald-600" />,
    title: "Rapido for Healthcare",
    description: "Tap SOS to instantly select nearby destination centers, book emergency transport types, and trigger hospital alerts.",
    badge: "Instant SOS",
    image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=600"
  }
];

export default function Onboarding() {
  const { setScreen } = useCuvio();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide === slides.length - 1) {
      setScreen('login');
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    setScreen('login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6 md:p-12 select-none relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#0B5A4B]/5 blur-[80px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-100/10 blur-[80px] rounded-full -z-10" />

      {/* Header */}
      <div className="flex justify-between items-center w-full max-w-md mx-auto">
        <span className="text-sm font-bold tracking-tight text-[#0B5A4B] font-display">CUVIO</span>
        <button
          onClick={handleSkip}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          Skip
        </button>
      </div>

      {/* Slide Content */}
      <div className="flex-1 flex flex-col justify-center items-center w-full max-w-md mx-auto my-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col items-center"
          >
            {/* Visual Card */}
            <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-xl border border-slate-100 mb-8 bg-white">
              <img
                src={slides[currentSlide].image}
                alt={slides[currentSlide].title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-slate-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">
                  {slides[currentSlide].badge}
                </span>
              </div>
            </div>

            {/* Slide Text */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm w-full text-center space-y-4">
              <div className="flex justify-center mb-1">
                {slides[currentSlide].icon}
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-display">
                {slides[currentSlide].title}
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed px-2">
                {slides[currentSlide].description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer controls */}
      <div className="w-full max-w-md mx-auto flex flex-col gap-6 items-center">
        {/* Progress indicators */}
        <div className="flex gap-1.5 justify-center">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'w-6 bg-[#0B5A4B]' : 'w-1.5 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={handleNext}
          className="w-full h-14 bg-[#0B5A4B] text-white font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#073D33] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-[#0B5A4B]/10"
        >
          <span>{currentSlide === slides.length - 1 ? "Get Started" : "Continue"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Trust Badge */}
        <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
          Trusted by 10k+ Healthcare Users in India
        </span>
      </div>
    </div>
  );
}
