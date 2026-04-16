import { useState, useEffect } from 'react';
import { contractsApi, BatchStatus, BatchResult } from '@/api/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Square, Clock, RefreshCw } from 'lucide-react';

interface Props {
  onBatchComplete?: () => void;
}

export default function BatchControls({ onBatchComplete }: Props) {
  const [status, setStatus] = useState<BatchStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [cronInput, setCronInput] = useState('0 */6 * * *');
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const s = await contractsApi.getBatchStatus();
      setStatus(s);
      setCronInput(s.cronExpression);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Poll while running
  useEffect(() => {
    if (!status?.running) return;
    const interval = setInterval(async () => {
      const s = await contractsApi.getBatchStatus();
      setStatus(s);
      if (!s.running) {
        onBatchComplete?.();
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [status?.running, onBatchComplete]);

  const handleTriggerBatch = async () => {
    setLoading(true);
    setError(null);
    try {
      await contractsApi.triggerBatchAnalysis();
      // Start polling
      setTimeout(fetchStatus, 1000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to start batch analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCron = async () => {
    setError(null);
    try {
      const result = await contractsApi.startCron(cronInput);
      setCronInput(result.cronExpression);
      await fetchStatus();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to start cron');
    }
  };

  const handleStopCron = async () => {
    setError(null);
    try {
      await contractsApi.stopCron();
      await fetchStatus();
    } catch {
      setError('Failed to stop cron');
    }
  };

  const getStatusCounts = (results: BatchResult[]) => {
    const analyzed = results.filter((r) => r.status === 'analyzed').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    return { analyzed, skipped, failed };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Batch Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {/* Manual trigger */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleTriggerBatch}
            disabled={loading || status?.running}
          >
            {status?.running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Analyze All Files
              </>
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={fetchStatus}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Cron controls */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={cronInput}
            onChange={(e) => setCronInput(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            placeholder="Cron expression"
          />
          {status?.scheduled ? (
            <Button variant="destructive" size="sm" onClick={handleStopCron}>
              <Square className="mr-1 h-3 w-3" />
              Stop Cron
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={handleStartCron}>
              Start Cron
            </Button>
          )}
          {status?.scheduled && (
            <Badge variant="secondary">Active: {status.cronExpression}</Badge>
          )}
        </div>

        {/* Last run results */}
        {status?.lastRunAt && status.lastRunResults.length > 0 && (
          <div className="rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">
              Last run: {new Date(status.lastRunAt).toLocaleString()}
            </p>
            {(() => {
              const { analyzed, skipped, failed } = getStatusCounts(status.lastRunResults);
              return (
                <div className="flex gap-2">
                  <Badge variant="default">{analyzed} analyzed</Badge>
                  <Badge variant="secondary">{skipped} skipped</Badge>
                  {failed > 0 && <Badge variant="destructive">{failed} failed</Badge>}
                </div>
              );
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
