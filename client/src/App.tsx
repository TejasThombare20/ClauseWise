import { useState } from 'react';
import DocumentSelector from '@/components/DocumentSelector';
import ContractTable from '@/components/ContractTable';
import BatchControls from '@/components/BatchControls';

export default function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-[120rem] px-4 py-4">
          <h1 className="text-2xl font-bold tracking-tight">ClauseWise</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered legal contract analysis
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[120rem] space-y-6 px-4 py-6">
        <BatchControls onBatchComplete={handleRefresh} />
        <DocumentSelector onAnalysisComplete={handleRefresh} />
        <ContractTable refreshTrigger={refreshTrigger} />
      </main>
    </div>
  );
}
