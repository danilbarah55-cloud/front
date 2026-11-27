import React, { useState } from 'react';
import { useOnlineStatus, usePWAInstall } from './usePWAInstall.ts';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="fixed bottom-3 right-3 z-[18] flex items-center gap-2 border-2 border-[#000] bg-[#f6c744] px-3 py-2 text-xs font-bold text-[#1a1405] shadow-[0_3px_0_#c28e12] active:translate-y-0.5 cursor-pointer"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        На телефон
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="fixed bottom-3 right-3 z-[18] flex items-center gap-2 border-2 border-[#2b385f] bg-[#18223f] px-3 py-2 text-xs font-bold text-[#edf2ff] shadow-[0_3px_0_#080c18] cursor-pointer"
        >
          На экран iPhone
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-sm border-2 border-[#f6c744] bg-[#12192c] p-5 text-[#edf2ff] shadow-[4px_4px_0_#000]">
              <h3 className="text-base font-bold text-[#f6c744]">Установка на iPhone / iPad</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#c9d4f2]">
                1. Нажмите кнопку <strong>Поделиться</strong> в панели Safari.<br />
                2. Прокрутите вниз и выберите <strong>На экран «Домой»</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full border-2 border-[#000] bg-[#f6c744] py-2 text-sm font-bold text-[#1a1405] cursor-pointer"
              >
                Понятно
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-3 left-3 z-[55] flex items-center gap-2 border-2 border-[#000] bg-[#b45309] px-3 py-1.5 text-xs font-bold text-white shadow-[3px_3px_0_#000]">
      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
      Офлайн-режим — сохранённый прогресс
    </div>
  );
};
