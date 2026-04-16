import { useState, useEffect } from 'react';
import { contractsApi, DocumentInfo } from '@/api/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Loader2 } from 'lucide-react';

interface Props {
  onAnalysisComplete?: () => void;
}

export default function DocumentSelector({ onAnalysisComplete }: Props) {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    contractsApi.fetchDocuments()
      .then(setDocuments)
      .catch(() => setError('Failed to load documents'))
      .finally(() => setLoading(false));
  }, []);

  const handleAnalyze = async (filePath: string) => {
    setAnalyzing(filePath);
    setError(null);
    try {
      const result = await contractsApi.analyzeDocument(filePath);
      if (result.skipped) {
        setError(`Skipped: ${result.message}`);
      }
      onAnalysisComplete?.();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Analysis failed');
    } finally {
      setAnalyzing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading documents...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Available Documents</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No DOCX files found in server/public/. Place contract files there to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.path}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{doc.name}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {doc.category}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAnalyze(doc.path)}
                  disabled={analyzing !== null}
                >
                  {analyzing === doc.path ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze'
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
