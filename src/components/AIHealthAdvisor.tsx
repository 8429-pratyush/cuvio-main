import React, { useState } from 'react';
import { useCuvio } from '../context/CuvioContext';
import {
  Sparkles, Stethoscope, AlertTriangle, ShieldAlert, CheckCircle,
  HelpCircle, ChevronRight, DollarSign, Clock, Building2,
  Ambulance, ArrowRight, Activity, Thermometer, ShieldCheck,
  Heart, Phone, RefreshCw, FileText, Info, Award, Zap,
  TrendingDown, Check, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIHealthAdvisorProps {
  initialSymptom?: string;
  onClose?: () => void;
  onSelectSpecialist?: (specialist: string) => void;
}

export default function AIHealthAdvisor({
  initialSymptom = '',
  onClose,
  onSelectSpecialist
}: AIHealthAdvisorProps) {
  const { user, hospitals, doctors, selectDoctor, setScreen, selectHospital } = useCuvio();

  // Active Tab: 'consult' (Symptom & Care Advice) vs 'cost' (Treatment & Procedure Cost Estimator)
  const [activeTab, setActiveTab] = useState<'consult' | 'cost'>('consult');

  // Sub-view in Consult: 'gemini' | 'claude' | 'cost'
  const [consultPerspective, setConsultPerspective] = useState<'all' | 'gemini' | 'claude' | 'cost'>('all');

  // ---------------------------------------------------------
  // FORM STATES: HEALTH CONSULT
  // ---------------------------------------------------------
  const [symptomInput, setSymptomInput] = useState(initialSymptom || 'Chest tightness & slight dizziness');
  const [severity, setSeverity] = useState<number>(6);
  const [duration, setDuration] = useState('Within 24 hours');
  const [age, setAge] = useState<string>(String(user?.age || '32'));
  const [gender, setGender] = useState<string>(user?.gender || 'Male');
  const [selectedConditions, setSelectedConditions] = useState<string[]>(['None']);
  const [city, setCity] = useState('Hyderabad');
  const [insurer, setInsurer] = useState(user?.insuranceProvider || 'Niva Bupa (Max Bupa)');
  const [sumInsured, setSumInsured] = useState(user?.sumInsuredRange || '₹5,00,000 - ₹10,00,000');

  // AI Loading & Result states
  const [isConsulting, setIsConsulting] = useState(false);
  const [consultResult, setConsultResult] = useState<any>(null);
  const [consultError, setConsultError] = useState<string | null>(null);

  // ---------------------------------------------------------
  // FORM STATES: PROCEDURE COST ESTIMATOR
  // ---------------------------------------------------------
  const [selectedProcedure, setSelectedProcedure] = useState('Total Knee Replacement');
  const [customProcedureInput, setCustomProcedureInput] = useState('');
  const [costCity, setCostCity] = useState('Hyderabad');
  const [costHospitalTier, setCostHospitalTier] = useState('Corporate Super-Specialty');
  const [costInsurer, setCostInsurer] = useState(user?.insuranceProvider || 'Star Health');
  const [costRoomType, setCostRoomType] = useState('Twin Sharing (Standard AC)');
  const [isEstimatingCost, setIsEstimatingCost] = useState(false);
  const [procedureEstimate, setProcedureEstimate] = useState<any>(null);

  // Quick symptom prompt chips
  const quickPrompts = [
    { label: "Chest tightness & left arm ache", severity: 8, dur: "< 6 hours" },
    { label: "High fever 102°F + severe body chills", severity: 7, dur: "24 - 48 hours" },
    { label: "Acute knee pain & joint locking", severity: 6, dur: "3 - 7 days" },
    { label: "Severe migraine with aura & nausea", severity: 7, dur: "Within 24 hours" },
    { label: "Stomach cramps & severe acidity", severity: 5, dur: "24 - 48 hours" },
    { label: "Persistent dry cough & wheezing", severity: 5, dur: "3 - 7 days" }
  ];

  // Common procedures for cost estimator
  const commonProcedures = [
    "Total Knee Replacement",
    "Heart Angioplasty / Stenting",
    "Laparoscopic Gallbladder Removal (Cholecystectomy)",
    "Appendectomy (Appendix Surgery)",
    "Cesarean Delivery (C-Section)",
    "Normal Delivery (Maternity Package)",
    "Kidney Stone Laser Removal (RIRS / PCNL)",
    "Cataract Eye Surgery (Phaco + Foldable IOL)",
    "Dengue Inpatient Management & Platelet Transfusion",
    "MRI Brain / Whole Spine Contrast Scan"
  ];

  // Comorbidities options
  const conditionOptions = ["Diabetes", "Hypertension", "Asthma", "Thyroid", "Heart Disease", "None"];

  const toggleCondition = (cond: string) => {
    if (cond === 'None') {
      setSelectedConditions(['None']);
      return;
    }
    const filtered = selectedConditions.filter(c => c !== 'None');
    if (filtered.includes(cond)) {
      const next = filtered.filter(c => c !== cond);
      setSelectedConditions(next.length === 0 ? ['None'] : next);
    } else {
      setSelectedConditions([...filtered, cond]);
    }
  };

  // Run Dual-Engine Health Consultation
  const handleRunConsult = async (queryText?: string) => {
    const q = (queryText || symptomInput).trim();
    if (!q) return;

    setIsConsulting(true);
    setConsultError(null);

    try {
      const res = await fetch('/api/ai/health-consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: q,
          patientAge: age,
          patientGender: gender,
          duration,
          severity,
          history: selectedConditions.join(', '),
          city,
          insurance: insurer,
          sumInsured
        })
      });

      const data = await res.json();
      if (data.status === 'success' && data.consult) {
        setConsultResult(data.consult);
      } else {
        throw new Error(data.error || 'Failed to complete AI consultation');
      }
    } catch (err: any) {
      console.error("Health consult error:", err);
      setConsultError(err.message || 'Failed to reach AI service.');
    } finally {
      setIsConsulting(false);
    }
  };

  // Run Procedure Cost Estimation
  const handleEstimateProcedureCost = async (procName?: string) => {
    const finalProc = (procName || customProcedureInput || selectedProcedure).trim();
    if (!finalProc) return;

    setIsEstimatingCost(true);
    try {
      const res = await fetch('/api/ai/procedure-cost-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          procedureName: finalProc,
          city: costCity,
          hospitalTier: costHospitalTier,
          insuranceProvider: costInsurer,
          roomType: costRoomType
        })
      });

      const data = await res.json();
      if (data.status === 'success' && data.estimate) {
        setProcedureEstimate(data.estimate);
      }
    } catch (err) {
      console.error("Procedure estimation error:", err);
    } finally {
      setIsEstimatingCost(false);
    }
  };

  // Auto-run if initial symptom was passed
  React.useEffect(() => {
    if (initialSymptom && !consultResult && !isConsulting) {
      handleRunConsult(initialSymptom);
    }
  }, [initialSymptom]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden max-w-4xl w-full mx-auto my-4 transition-all">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#073D33] via-[#0B5A4B] to-slate-900 text-white p-5 sm:p-7 relative overflow-hidden">
        {/* Ambient background blur circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                Dual-Engine Clinical Ensemble
              </span>
              <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-200 border border-blue-400/30 px-2.5 py-1 rounded-full text-[10px] font-bold">
                Gemini 2.5 Diagnostic
              </span>
              <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-200 border border-amber-400/30 px-2.5 py-1 rounded-full text-[10px] font-bold">
                Claude Bedside Care
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
              CUVIO AI Health & Cost Consensus
            </h2>
            <p className="text-emerald-100/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Synthesizing clinical diagnostic intelligence, actionable at-home care instructions, and 3-tier hospital cost estimation.
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="self-end sm:self-start p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="Close Advisor"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex gap-2 mt-6 pt-3 border-t border-emerald-700/40">
          <button
            onClick={() => setActiveTab('consult')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'consult'
                ? 'bg-white text-[#0B5A4B] shadow-md'
                : 'bg-emerald-950/60 text-emerald-100 hover:bg-emerald-900/60'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Health Guidance & Triage</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('cost');
              if (!procedureEstimate && !isEstimatingCost) {
                handleEstimateProcedureCost(selectedProcedure);
              }
            }}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'cost'
                ? 'bg-white text-[#0B5A4B] shadow-md'
                : 'bg-emerald-950/60 text-emerald-100 hover:bg-emerald-900/60'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Treatment & Hospital Cost Estimator</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-7 space-y-6">

        {/* ======================================================== */}
        {/* TAB 1: HEALTH CONSULTATION & IMMEDIATE CARE ACTION PLAN */}
        {/* ======================================================== */}
        {activeTab === 'consult' && (
          <div className="space-y-6">
            
            {/* Input Form Section */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#0B5A4B]" />
                  What symptoms or discomfort are you experiencing?
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Be as specific as possible</span>
              </div>

              {/* Symptom Input Field */}
              <div className="relative">
                <textarea
                  rows={2}
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  placeholder="Describe in your own words (e.g. sharp knee ache when climbing stairs, severe migraine with throbbing on right side, sudden chest tightness with cold sweats...)"
                  className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0B5A4B] focus:ring-4 focus:ring-[#0B5A4B]/5 transition-all font-medium resize-none"
                />
              </div>

              {/* Quick Prompt Chips */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Frequently Evaluated Conditions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickPrompts.map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSymptomInput(qp.label);
                        setSeverity(qp.severity);
                        setDuration(qp.dur);
                        handleRunConsult(qp.label);
                      }}
                      className="text-xs bg-white hover:bg-emerald-50 hover:text-[#0B5A4B] border border-slate-200 hover:border-emerald-300 text-slate-700 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Patient Parameters (Severity slider, Duration, Age, History) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-200/80">
                {/* Severity Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-600">Pain / Severity (1-10):</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                      severity >= 8 ? 'bg-red-100 text-red-700' :
                      severity >= 5 ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {severity} / 10 {severity >= 8 ? '🚨 Severe' : severity >= 5 ? '⚠️ Moderate' : '✓ Mild'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={severity}
                    onChange={(e) => setSeverity(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0B5A4B]"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-semibold">
                    <span>1: Mild Discomfort</span>
                    <span>5: Noticeable</span>
                    <span>10: Unbearable</span>
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Duration:</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0B5A4B]"
                  >
                    <option value="< 6 hours (Sudden Onset)">Less than 6 hours (Sudden)</option>
                    <option value="Within 24 hours">Within 24 hours</option>
                    <option value="24 - 48 hours">1 to 2 days</option>
                    <option value="3 - 7 days">3 to 7 days</option>
                    <option value="Chronic (> 1 week)">Chronic (More than 1 week)</option>
                  </select>
                </div>

                {/* Patient Age & Gender */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">Age:</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0B5A4B]"
                      placeholder="e.g. 32"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">Gender:</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0B5A4B]"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pre-existing conditions */}
              <div className="pt-2 border-t border-slate-200/80">
                <span className="text-xs font-bold text-slate-600 block mb-1.5">
                  Existing Medical History (Comorbidities):
                </span>
                <div className="flex flex-wrap gap-2">
                  {conditionOptions.map((cond) => {
                    const isSelected = selectedConditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => toggleCondition(cond)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0B5A4B] text-white border-[#0B5A4B]'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {cond} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Consultation Button */}
              <button
                type="button"
                onClick={() => handleRunConsult()}
                disabled={isConsulting || !symptomInput.trim()}
                className="w-full h-12 bg-[#0B5A4B] hover:bg-[#073D33] active:scale-[0.99] text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-[#0B5A4B]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isConsulting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                    <span>Synthesizing Gemini + Claude Medical Consensus...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-300" />
                    <span>Analyze Symptoms & Generate Action Plan + Cost</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Error state */}
            {consultError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{consultError}</span>
              </div>
            )}

            {/* ======================================================== */}
            {/* DUAL-ENGINE RESULTS DISPLAY */}
            {/* ======================================================== */}
            {consultResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* 1. URGENCY & ACUITY BANNER */}
                <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  consultResult.geminiAnalysis?.urgencyBadgeColor === 'red'
                    ? 'bg-red-500 text-white border-red-600 shadow-lg shadow-red-500/20'
                    : consultResult.geminiAnalysis?.urgencyBadgeColor === 'amber'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/15'
                    : 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/15'
                }`}>
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5 text-white" />
                      Triage Classification
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black font-display tracking-tight text-white">
                      {consultResult.geminiAnalysis?.urgency}
                    </h3>
                    <p className="text-white/90 text-xs max-w-xl">
                      Primary Clinical Assessment: <strong className="underline underline-offset-2">{consultResult.geminiAnalysis?.primaryCondition}</strong> ({consultResult.geminiAnalysis?.confidenceScore}% confidence)
                    </p>
                  </div>

                  {consultResult.geminiAnalysis?.urgencyBadgeColor === 'red' && (
                    <button
                      onClick={() => setScreen('ambulance')}
                      className="bg-white text-red-600 hover:bg-red-50 px-5 py-3 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto shrink-0 animate-pulse"
                    >
                      <Ambulance className="w-4 h-4" />
                      <span>Request Ambulance (108 SOS)</span>
                    </button>
                  )}
                </div>

                {/* 2. PERSPECTIVE TOGGLE TABS */}
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setConsultPerspective('all')}
                    className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                      consultPerspective === 'all'
                        ? 'bg-white text-[#0B5A4B] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Combined Consensus
                  </button>
                  <button
                    onClick={() => setConsultPerspective('claude')}
                    className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      consultPerspective === 'claude'
                        ? 'bg-white text-amber-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>Claude Bedside Care</span>
                  </button>
                  <button
                    onClick={() => setConsultPerspective('gemini')}
                    className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      consultPerspective === 'gemini'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>Gemini Diagnostics</span>
                  </button>
                  <button
                    onClick={() => setConsultPerspective('cost')}
                    className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      consultPerspective === 'cost'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>Cost Breakdown</span>
                  </button>
                </div>

                {/* 3. CLAUDE BEDSIDE CARE SECTION ("What you can do right now") */}
                {(consultPerspective === 'all' || consultPerspective === 'claude') && (
                  <div className="bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 border border-amber-200/80 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          C
                        </div>
                        <div>
                          <h4 className="font-extrabold text-amber-950 text-sm font-display flex items-center gap-1.5">
                            <span>Claude Bedside Care & Immediate Action Plan</span>
                          </h4>
                          <span className="text-[10px] text-amber-800 font-medium">Holistic patient comfort & safety guidance</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2.5 py-1 rounded-full border border-amber-200">
                        At-Home Support
                      </span>
                    </div>

                    {/* Empathy summary */}
                    <p className="text-xs text-amber-950 leading-relaxed font-medium bg-amber-100/50 p-3.5 rounded-xl border border-amber-200/40">
                      "{consultResult.claudeBedsideCare?.empathySummary}"
                    </p>

                    {/* Immediate Action Steps */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                        What You Should Do Right Now (Step-by-Step):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {consultResult.claudeBedsideCare?.actionPlanNow?.map((step: any, idx: number) => (
                          <div key={idx} className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-xs space-y-1">
                            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs flex items-center justify-center">
                              {step.step || idx + 1}
                            </div>
                            <h5 className="font-bold text-slate-800 text-xs mt-1">{step.title}</h5>
                            <p className="text-[11px] text-slate-600 leading-relaxed">{step.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Things to Avoid */}
                    {consultResult.claudeBedsideCare?.thingsToAvoid && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                        <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                          <X className="w-3.5 h-3.5 text-rose-600" />
                          Things to Strictly Avoid:
                        </p>
                        <ul className="text-xs text-rose-900 space-y-1">
                          {consultResult.claudeBedsideCare.thingsToAvoid.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-rose-600 font-bold">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Doctor Questions Checklist */}
                    {consultResult.claudeBedsideCare?.doctorQuestions && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-[#0B5A4B]" />
                          Recommended Questions for Your Doctor:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {consultResult.claudeBedsideCare.doctorQuestions.map((q: string, idx: number) => (
                            <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-start gap-2 text-xs text-slate-700">
                              <span className="font-extrabold text-blue-600 shrink-0">Q{idx + 1}:</span>
                              <span>{q}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. GEMINI CLINICAL DIAGNOSTICS SECTION */}
                {(consultPerspective === 'all' || consultPerspective === 'gemini') && (
                  <div className="bg-gradient-to-br from-blue-50/60 via-white to-slate-50 border border-blue-200/80 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-blue-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          G
                        </div>
                        <div>
                          <h4 className="font-extrabold text-blue-950 text-sm font-display flex items-center gap-1.5">
                            <span>Gemini Clinical Diagnostic Evaluation</span>
                          </h4>
                          <span className="text-[10px] text-blue-700 font-medium">Pathological & Differential Differential Triage</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-full border border-blue-200">
                        Specialist Pathway
                      </span>
                    </div>

                    {/* Differential diagnoses */}
                    {consultResult.geminiAnalysis?.differentialDiagnoses && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Differential Diagnostic Considerations:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {consultResult.geminiAnalysis.differentialDiagnoses.map((diff: any, idx: number) => (
                            <div key={idx} className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-xs space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-xs text-slate-800">{diff.condition}</span>
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                  {diff.probability}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed">{diff.explanation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Red Flags & Scans Needed */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {consultResult.geminiAnalysis?.redFlags && (
                        <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-1.5">
                          <p className="text-[11px] font-bold text-red-800 uppercase tracking-wider flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                            Red Flags (Seek Immediate ER):
                          </p>
                          <ul className="text-xs text-red-900 space-y-1">
                            {consultResult.geminiAnalysis.redFlags.map((rf: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-red-500 font-bold">⚠️</span>
                                <span>{rf}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {consultResult.geminiAnalysis?.diagnosticScansNeeded && (
                        <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1.5">
                          <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-blue-600" />
                            Recommended Diagnostic Tests:
                          </p>
                          <ul className="text-xs text-blue-900 space-y-1">
                            {consultResult.geminiAnalysis.diagnosticScansNeeded.map((sc: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-blue-500 font-bold">🔬</span>
                                <span>{sc}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Direct Specialist Booking Call to Action */}
                    <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recommended Specialty</span>
                        <p className="text-sm font-bold text-[#0B5A4B]">
                          Consult a board-certified <span className="underline">{consultResult.geminiAnalysis?.recommendedSpecialist}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (onSelectSpecialist && consultResult.geminiAnalysis?.recommendedSpecialist) {
                            onSelectSpecialist(consultResult.geminiAnalysis.recommendedSpecialist);
                          } else {
                            setScreen('health-concern');
                          }
                        }}
                        className="bg-[#0B5A4B] hover:bg-[#073D33] text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#0B5A4B]/15 cursor-pointer shrink-0"
                      >
                        <Stethoscope className="w-4 h-4 text-emerald-300" />
                        <span>Book {consultResult.geminiAnalysis?.recommendedSpecialist || 'Doctor'} Now</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. CONSENSUS HEALTHCARE COST ESTIMATION SECTION */}
                {(consultPerspective === 'all' || consultPerspective === 'cost') && consultResult.costEstimation && (
                  <div className="bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 border border-emerald-200/90 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#0B5A4B] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          ₹
                        </div>
                        <div>
                          <h4 className="font-extrabold text-[#0B5A4B] text-sm font-display flex items-center gap-1.5">
                            <span>Consensus Treatment Cost Matrix & Insurance Audit</span>
                          </h4>
                          <span className="text-[10px] text-emerald-800 font-medium">Estimated 2026 tariff benchmarks for this condition</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                        Financial Transparency
                      </span>
                    </div>

                    {/* 3-Tier Hospital Cost Matrix */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Tier 1: Govt */}
                      <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs space-y-2">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                          Tier 1: Government / Charitable
                        </span>
                        <h5 className="font-extrabold text-lg text-slate-800">
                          {consultResult.costEstimation.tierComparison?.governmentCharitable?.costRange}
                        </h5>
                        <p className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded inline-block">
                          Free under Ayushman Bharat
                        </p>
                        <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-100">
                          <div>OPD Fee: <strong>{consultResult.costEstimation.tierComparison?.governmentCharitable?.opdFee}</strong></div>
                          <div>Scans: <strong>{consultResult.costEstimation.tierComparison?.governmentCharitable?.scanCost}</strong></div>
                        </div>
                      </div>

                      {/* Tier 2: Mid Private */}
                      <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs space-y-2">
                        <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider block">
                          Tier 2: Mid-Tier Private
                        </span>
                        <h5 className="font-extrabold text-lg text-slate-800">
                          {consultResult.costEstimation.tierComparison?.privateHospital?.costRange}
                        </h5>
                        <p className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded inline-block">
                          Competitive Out-of-Pocket
                        </p>
                        <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-100">
                          <div>OPD Fee: <strong>{consultResult.costEstimation.tierComparison?.privateHospital?.opdFee}</strong></div>
                          <div>Scans: <strong>{consultResult.costEstimation.tierComparison?.privateHospital?.scanCost}</strong></div>
                        </div>
                      </div>

                      {/* Tier 3: Corporate Super-Specialty */}
                      <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs space-y-2">
                        <span className="text-[10px] font-extrabold text-[#0B5A4B] uppercase tracking-wider block">
                          Tier 3: Corporate Super-Specialty
                        </span>
                        <h5 className="font-extrabold text-lg text-slate-800">
                          {consultResult.costEstimation.tierComparison?.corporateSuperSpecialty?.costRange}
                        </h5>
                        <p className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded inline-block">
                          Apollo / Medanta / Max
                        </p>
                        <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-slate-100">
                          <div>OPD Fee: <strong>{consultResult.costEstimation.tierComparison?.corporateSuperSpecialty?.opdFee}</strong></div>
                          <div>Scans: <strong>{consultResult.costEstimation.tierComparison?.corporateSuperSpecialty?.scanCost}</strong></div>
                        </div>
                      </div>
                    </div>

                    {/* Itemized Breakdown Table */}
                    {consultResult.costEstimation.itemizedBreakdown && (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-xs">
                        <div className="p-3 bg-slate-50 font-bold text-slate-700 border-b border-slate-200 flex justify-between">
                          <span>Itemized Diagnostic & Clinical Breakdown</span>
                          <span>Estimated Range</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {consultResult.costEstimation.itemizedBreakdown.map((item: any, idx: number) => (
                            <div key={idx} className="p-3 flex justify-between items-center hover:bg-slate-50/50">
                              <div>
                                <span className="font-bold text-slate-800 block">{item.item}</span>
                                <span className="text-[10px] text-slate-400">{item.description}</span>
                              </div>
                              <span className="font-bold text-[#0B5A4B] font-mono">{item.estimatedCost}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Money-saving and Insurance tips */}
                    {consultResult.costEstimation.insuranceGuidance?.moneySavingTips && (
                      <div className="p-4 bg-emerald-100/60 border border-emerald-300/80 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B5A4B]">
                          <TrendingDown className="w-4 h-4 text-emerald-700" />
                          <span>Smart Money-Saving Clinical Advice:</span>
                        </div>
                        <ul className="text-xs text-slate-700 space-y-1.5">
                          {consultResult.costEstimation.insuranceGuidance.moneySavingTips.map((tip: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

              </motion.div>
            )}

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: DETAILED PROCEDURE & SURGICAL TARIFF ESTIMATOR    */}
        {/* ======================================================== */}
        {activeTab === 'cost' && (
          <div className="space-y-6">
            
            {/* Procedure Configuration Form */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-[#0B5A4B]" />
                  Select or Enter Treatment / Surgery Procedure
                </label>
                <span className="text-[10px] text-slate-400 font-bold uppercase">2026 Tariff Benchmarks</span>
              </div>

              {/* Selector & Custom Input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Select Common Procedure:</label>
                  <select
                    value={selectedProcedure}
                    onChange={(e) => {
                      setSelectedProcedure(e.target.value);
                      handleEstimateProcedureCost(e.target.value);
                    }}
                    className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#0B5A4B]"
                  >
                    {commonProcedures.map((proc, idx) => (
                      <option key={idx} value={proc}>{proc}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Or Type Custom Treatment / Surgery:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customProcedureInput}
                      onChange={(e) => setCustomProcedureInput(e.target.value)}
                      placeholder="e.g. ACL Knee Reconstruction, Dialysis..."
                      className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0B5A4B]"
                    />
                    <button
                      type="button"
                      onClick={() => handleEstimateProcedureCost(customProcedureInput)}
                      className="px-4 h-11 bg-[#0B5A4B] hover:bg-[#073D33] text-white font-bold rounded-xl text-xs shrink-0 cursor-pointer"
                    >
                      Audit
                    </button>
                  </div>
                </div>
              </div>

              {/* Parameters: City, Hospital Tier, Insurance, Room */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-200/80">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">City / Region:</label>
                  <select
                    value={costCity}
                    onChange={(e) => setCostCity(e.target.value)}
                    className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0B5A4B]"
                  >
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Delhi-NCR">Delhi-NCR</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Chennai">Chennai</option>
                    <option value="Tier-2 City">Tier 2 City</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Hospital Category:</label>
                  <select
                    value={costHospitalTier}
                    onChange={(e) => setCostHospitalTier(e.target.value)}
                    className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0B5A4B]"
                  >
                    <option value="Corporate Super-Specialty">Corporate Super-Specialty</option>
                    <option value="Mid-Tier Private Hospital">Mid-Tier Private Hospital</option>
                    <option value="Charitable / Government Hospital">Charitable / Govt Hospital</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Insurance Provider:</label>
                  <select
                    value={costInsurer}
                    onChange={(e) => setCostInsurer(e.target.value)}
                    className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0B5A4B]"
                  >
                    <option value="Star Health">Star Health</option>
                    <option value="Niva Bupa">Niva Bupa (Max Bupa)</option>
                    <option value="Care Health">Care Health</option>
                    <option value="HDFC ERGO">HDFC ERGO</option>
                    <option value="Ayushman Bharat PM-JAY">Ayushman Bharat (PM-JAY)</option>
                    <option value="No Insurance (Self Pay)">Self Pay (No Insurance)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Room Category:</label>
                  <select
                    value={costRoomType}
                    onChange={(e) => setCostRoomType(e.target.value)}
                    className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0B5A4B]"
                  >
                    <option value="Twin Sharing (Standard AC)">Twin Sharing (Standard AC)</option>
                    <option value="Single Private Room">Single Private Room</option>
                    <option value="General Multi-Bed Ward">General Multi-Bed Ward</option>
                    <option value="Deluxe Suite">Deluxe Suite</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleEstimateProcedureCost()}
                disabled={isEstimatingCost}
                className="w-full h-11 bg-[#0B5A4B] hover:bg-[#073D33] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
              >
                {isEstimatingCost ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                    <span>Calculating 2026 Hospital Tariff Audit...</span>
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4 text-emerald-300" />
                    <span>Calculate Complete Treatment Tariff Breakdown</span>
                  </>
                )}
              </button>
            </div>

            {/* Estimator Result Display */}
            {procedureEstimate && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* 3-Tier Comparison Cards */}
                <div>
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2.5">
                    Estimated Package Rates Across Hospital Categories:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1.5">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Government Hospital
                      </span>
                      <h5 className="font-extrabold text-lg text-slate-800">
                        {procedureEstimate.costSummary?.governmentHospital}
                      </h5>
                      <p className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded inline-block">
                        100% Cashless under PM-JAY
                      </p>
                    </div>

                    <div className="p-4 bg-white border border-blue-200 rounded-2xl shadow-xs space-y-1.5">
                      <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">
                        Mid-Tier Private Hospital
                      </span>
                      <h5 className="font-extrabold text-lg text-slate-800">
                        {procedureEstimate.costSummary?.privateHospital}
                      </h5>
                      <p className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded inline-block">
                        Verified Transparent Tariff
                      </p>
                    </div>

                    <div className="p-4 bg-emerald-50/60 border border-emerald-300 rounded-2xl shadow-xs space-y-1.5">
                      <span className="text-[10px] font-extrabold text-[#0B5A4B] uppercase tracking-wider block">
                        Corporate Super-Specialty
                      </span>
                      <h5 className="font-extrabold text-lg text-slate-900">
                        {procedureEstimate.costSummary?.corporateHospital}
                      </h5>
                      <p className="text-[10px] text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded inline-block">
                        Apollo / Medanta / Max Tier
                      </p>
                    </div>
                  </div>
                </div>

                {/* Itemized Surgery & Hospitalization Line Items */}
                {procedureEstimate.itemizedBreakdown && (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs text-xs">
                    <div className="p-3.5 bg-slate-50 font-bold text-slate-800 border-b border-slate-200 flex justify-between items-center">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#0B5A4B]" />
                        Itemized Tariff Breakdown ({procedureEstimate.procedure})
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Stay: ~{procedureEstimate.estimatedDaysOfStay || 3} Days</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {procedureEstimate.itemizedBreakdown.map((item: any, idx: number) => (
                        <div key={idx} className="p-3.5 flex justify-between items-start hover:bg-slate-50/60 transition-colors">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 block text-xs">{item.category}</span>
                            <span className="text-[11px] text-slate-500">{item.description}</span>
                          </div>
                          <span className="font-bold text-[#0B5A4B] font-mono text-xs whitespace-nowrap ml-4">
                            {item.cost}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insurance Pre-Auth & Out-of-Pocket Summary */}
                {procedureEstimate.insuranceAnalysis && (
                  <div className="bg-gradient-to-br from-blue-50/60 to-emerald-50/40 border border-blue-200/80 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/60 pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                          Pre-Authorization Projection ({costInsurer})
                        </span>
                        <h4 className="font-extrabold text-slate-900 text-sm font-display">
                          {procedureEstimate.insuranceAnalysis.cashlessEligibility}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-medium block">Est. Out-of-Pocket Co-Pay</span>
                        <span className="text-sm font-extrabold text-red-600 font-mono">
                          {procedureEstimate.insuranceAnalysis.estimatedPatientOutOfPocket}
                        </span>
                      </div>
                    </div>

                    {/* Common Deductions Warning */}
                    {procedureEstimate.insuranceAnalysis.commonDeductions && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs">
                        <span className="font-bold text-amber-900 block flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Watch Out for Common Non-Payable Deductions:
                        </span>
                        <ul className="text-amber-800 space-y-0.5 text-[11px]">
                          {procedureEstimate.insuranceAnalysis.commonDeductions.map((ded: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span>•</span>
                              <span>{ded}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Money-saving tips */}
                    {procedureEstimate.insuranceAnalysis.moneySavingTips && (
                      <div className="space-y-1 text-xs text-slate-700">
                        <span className="font-bold text-[#0B5A4B] block">Tariff Transparency Tips:</span>
                        {procedureEstimate.insuranceAnalysis.moneySavingTips.map((tip: string, idx: number) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </motion.div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
