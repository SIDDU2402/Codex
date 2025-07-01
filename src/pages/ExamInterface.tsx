
import { useState, useEffect } from 'react';
import SecureExamInterface from '@/components/SecureExamInterface';

interface ExamInterfaceProps {
  contestId: string;
  onBack: () => void;
}

const ExamInterface = ({ contestId, onBack }: ExamInterfaceProps) => {
  const handleForceSubmit = () => {
    // Auto-submit all current solutions
    alert("Contest submitted due to security violations or time expiry.");
    onBack();
  };

  return (
    <SecureExamInterface 
      contestId={contestId} 
      onBack={onBack}
      onForceSubmit={handleForceSubmit}
    />
  );
};

export default ExamInterface;
