import React from 'react';
import { FileText, Cpu, CheckSquare, HeartHandshake } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Report Your Item',
      desc: 'Submit a detailed report with category, location, date, and photos. Private identifying features stay protected.',
      icon: <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      color: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
    },
    {
      num: '02',
      title: 'Smart AI Matching',
      desc: 'Our engine evaluates category similarity, text tokens, date proximity, and geographic coordinates to discover matches.',
      icon: <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      color: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900',
    },
    {
      num: '03',
      title: 'Verify & Claim',
      desc: 'Submit proof of ownership describing internal details or marks. The finder reviews and approves legitimate claims.',
      icon: <CheckSquare className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
      color: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900',
    },
    {
      num: '04',
      title: 'Safe Handover',
      desc: 'Coordinate a safe handover via in-app messaging. Once returned, item status updates and preserves trust metrics.',
      icon: <HeartHandshake className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      color: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
    },
  ];

  return (
    <section className="py-16 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase">Simple & Secure</span>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            How LostLink Works
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            A privacy-conscious, four-step verification workflow designed to reunite owners with their belongings quickly and securely.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="relative p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${step.color}`}>
                    {step.icon}
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
