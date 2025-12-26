import React, { useState } from 'react';
import {
  X,
  Wrench,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';

const NeedMaintenanceModal = ({ isOpen, onClose }) => {
  const [openAF, setOpenAF] = useState(true);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white w-[900px] max-w-[95%] h-[600px] rounded-[32px] border-2 border-blue-400 shadow-xl flex flex-col"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Header */}
        <div className="pt-8 px-10">
          <div className="flex items-center justify-center gap-4">
            <div className="relative w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Wrench className="text-red-600 w-6 h-6" />
              <span className="absolute w-8 h-[3px] bg-red-600 rotate-45"></span>
            </div>
            <h2 className="text-2xl font-semibold text-blue-700">
              Need Maintenance
            </h2>
          </div>
          <div className="mt-4 h-[2px] bg-blue-500 w-full" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-scroll px-10 py-6 custom-scrollbar">
        <div className="space-y-4">

            {/* Row */}
            {[
              { name: 'SSUET BLK-AFth', count: '18', checked: true },
              { name: 'SSUET BLK-AS', count: '05' },
              { name: 'SSUET BLK-AT', count: '12' },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b pb-3"
              >
                <input
                  type="checkbox"
                  defaultChecked={item.checked}
                  className="w-5 h-5 rounded text-blue-600"
                />
                <ChevronDown className="w-4 h-4 text-gray-400" />
                <span className="flex-1 font-medium text-gray-800">
                  {item.name}
                </span>
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span className="w-8 text-right font-medium">
                  {item.count}
                </span>
              </div>
            ))}

            {/* Expandable */}
            <div className="border-b pb-3">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded text-blue-600"
                />
                <button onClick={() => setOpenAF(!openAF)}>
                  {openAF ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <span className="flex-1 font-medium text-gray-800">
                  SSUET BLK-AF
                </span>
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span className="w-8 text-right font-medium">02</span>
              </div>

              {openAF && (
                <div className="mt-4 ml-14 space-y-3">
                  {[
                    { name: 'SSUET BLK-AF1', date: '21 May 2025' },
                    { name: 'SSUET BLK-AF2', date: '13 May 2025' },
                  ].map((sub, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 text-sm text-gray-600"
                    >
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="flex-1">{sub.name}</span>
                      <span>{sub.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-10 pb-6 flex justify-end">
          <button
            onClick={() => {
              toast.success('Downloading maintenance report...');
              onClose();
            }}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700"
          >
            <Download className="w-5 h-5" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default NeedMaintenanceModal;
