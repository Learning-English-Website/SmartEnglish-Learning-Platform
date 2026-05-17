import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, ChevronLeft, Volume2 } from 'lucide-react';

// --- MOCK DATA ---
type CardStatus = 'new' | 'learning' | 'mastered';

interface Flashcard {
  id: string;
  term: string;
  definition: string;
  status: CardStatus;
}

const MOCK_CARDS: Flashcard[] = [
  { id: '1', term: 'abundant', definition: 'có nhiều, phong phú, dồi dào', status: 'new' },
  { id: '2', term: 'benevolent', definition: 'nhân từ, từ tâm, rộng lượng', status: 'new' },
  { id: '3', term: 'camaraderie', definition: 'tình bạn bè, tình đồng chí', status: 'new' },
  { id: '4', term: 'diligent', definition: 'siêng năng, cần cù', status: 'new' },
  { id: '5', term: 'ephemeral', definition: 'chóng tàn, phù du', status: 'new' },
];

export default function LearnPage() {
  const [cards, setCards] = useState<Flashcard[]>(MOCK_CARDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [options, setOptions] = useState<string[]>([]);

  const currentCard = cards[currentIndex];

  // Derived Progress Stats
  const newCount = cards.filter(c => c.status === 'new').length;
  const learningCount = cards.filter(c => c.status === 'learning').length;
  const masteredCount = cards.filter(c => c.status === 'mastered').length;
  const totalCount = cards.length;

  // Generate 4 options for the current card
  useEffect(() => {
    if (!currentCard) return;
    
    // Get 3 random definitions that are not the current one
    const otherDefs = cards
      .filter(c => c.id !== currentCard.id)
      .map(c => c.definition)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
      
    // Combine and shuffle
    const allOptions = [...otherDefs, currentCard.definition].sort(() => 0.5 - Math.random());
    setOptions(allOptions);
  }, [currentCard, cards]);

  const handleOptionClick = (option: string) => {
    if (showResult) return;
    
    setSelectedOption(option);
    setShowResult(true);

    const isCorrect = option === currentCard.definition;

    // Wait a bit to show result, then move next
    setTimeout(() => {
      const updatedCards = [...cards];
      updatedCards[currentIndex].status = isCorrect ? 'mastered' : 'learning';
      setCards(updatedCards);
      
      setCurrentIndex((prev) => (prev + 1) % cards.length);
      setSelectedOption(null);
      setShowResult(false);
    }, 1500);
  };

  const handleDontKnow = () => {
    if (showResult) return;
    setSelectedOption(currentCard.definition); // Show correct answer
    setShowResult(true);

    setTimeout(() => {
      const updatedCards = [...cards];
      updatedCards[currentIndex].status = 'learning';
      setCards(updatedCards);
      
      setCurrentIndex((prev) => (prev + 1) % cards.length);
      setSelectedOption(null);
      setShowResult(false);
    }, 2000);
  };

  if (!currentCard) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f6f7fb]">
        <h1 className="text-2xl font-bold text-gray-700">Bạn đã hoàn thành bài học! 🎉</h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#f6f7fb] text-[#282e3e] font-sans overflow-hidden">
      
      {/* --- TOP BAR --- */}
      <header className="flex items-center justify-between px-4 h-14 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          <div className="font-semibold text-gray-700">
            Học: 500 từ vựng IELTS
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-semibold text-gray-500 hidden md:block">
            {currentIndex + 1} / {totalCount}
          </span>
          <button className="flex items-center justify-center p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <Settings size={20} strokeWidth={2.5} />
          </button>
          <button className="flex items-center justify-center p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <X size={24} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* --- MAIN LAYOUT --- */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* --- LEFT SIDEBAR (PROGRESS) --- */}
        <aside className="hidden lg:flex flex-col w-[260px] bg-white border-r border-gray-200 p-6 shrink-0">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">
            Tiến độ của bạn
          </h2>
          
          <div className="space-y-5">
            {/* Mastered */}
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-[#23b26d] bg-opacity-20 flex items-center justify-center mr-3">
                <span className="text-[#23b26d] font-bold text-sm">{masteredCount}</span>
              </div>
              <span className="text-[15px] font-semibold text-gray-700">Đã nắm vững</span>
            </div>
            
            {/* Learning */}
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-[#ffcd1f] bg-opacity-20 flex items-center justify-center mr-3">
                <span className="text-[#e2b100] font-bold text-sm">{learningCount}</span>
              </div>
              <span className="text-[15px] font-semibold text-gray-700">Đang học</span>
            </div>

            {/* Remaining */}
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                <span className="text-gray-500 font-bold text-sm">{newCount}</span>
              </div>
              <span className="text-[15px] font-semibold text-gray-500">Chưa học</span>
            </div>
          </div>
        </aside>

        {/* --- MAIN QUESTION AREA --- */}
        <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto relative">
          
          <div className="w-full max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCard.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-200/60 p-6 md:p-10 flex flex-col min-h-[400px]"
              >
                
                {/* Question Header */}
                <div className="flex justify-between items-start mb-6">
                  <span className="text-sm font-semibold text-gray-400">Thuật ngữ</span>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <Volume2 size={24} />
                  </button>
                </div>

                {/* Term Display */}
                <div className="text-2xl md:text-3xl font-semibold text-[#282e3e] mb-12 flex-1">
                  {currentCard.term}
                </div>

                {/* Question Prompt */}
                <div className="text-base font-semibold text-gray-600 mb-4">
                  Chọn định nghĩa đúng
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  {options.map((option, index) => {
                    const isSelected = selectedOption === option;
                    const isCorrect = option === currentCard.definition;
                    
                    // Determine styling based on state
                    let buttonStyle = "border-[#d9dde8] bg-white text-[#282e3e] hover:bg-[#f6f7fb]"; // Default
                    let textStyle = "text-[#282e3e]";
                    
                    if (showResult) {
                      if (isCorrect) {
                        buttonStyle = "border-[#23b26d] bg-[#f2fcf5] text-[#1a8551]"; // Correct
                        textStyle = "text-[#1a8551]";
                      } else if (isSelected) {
                        buttonStyle = "border-[#ff7873] bg-[#fff4f3] text-[#cc312b]"; // Incorrect selection
                        textStyle = "text-[#cc312b]";
                      } else {
                        buttonStyle = "border-[#d9dde8] bg-white text-gray-300 opacity-50"; // Dim others
                        textStyle = "text-gray-400";
                      }
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => handleOptionClick(option)}
                        disabled={showResult}
                        className={`
                          relative w-full text-left p-4 md:p-5 rounded-xl border-2 transition-all duration-200
                          ${buttonStyle}
                        `}
                      >
                        <div className="flex items-start">
                          <span className={`flex items-center justify-center w-6 h-6 rounded-md border ${showResult ? 'border-transparent' : 'border-gray-200 bg-gray-50'} text-xs font-bold mr-3 shrink-0 ${textStyle}`}>
                            {index + 1}
                          </span>
                          <span className={`text-[15px] leading-relaxed font-medium ${textStyle}`}>
                            {option}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Footer Action */}
                <div className="flex justify-start mt-auto">
                  <button 
                    onClick={handleDontKnow}
                    disabled={showResult}
                    className="text-[15px] font-bold text-[#4255ff] hover:text-[#2c3ecc] transition-colors disabled:opacity-50"
                  >
                    Không biết
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        
      </div>
    </div>
  );
}
