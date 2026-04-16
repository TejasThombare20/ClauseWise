import { useState, useEffect } from 'react';
import { contractsApi } from '@/api/contracts';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

const CONTRACT_KEYS = [
  'intellectual_property_ownership',
  'limitation_of_liability',
  'warranty_disclaimer',
  'indemnification',
  'data_processing_terms',
  'termination_for_convenience',
  'non_solicitation',
  'payment_terms',
  'confidentiality',
] as const;

const KEY_LABELS: Record<string, string> = {
  intellectual_property_ownership: 'IP Ownership',
  limitation_of_liability: 'Liability Limitation',
  warranty_disclaimer: 'Warranty Disclaimer',
  indemnification: 'Indemnification',
  data_processing_terms: 'Data Processing',
  termination_for_convenience: 'Termination',
  non_solicitation: 'Non-Solicitation',
  payment_terms: 'Payment Terms',
  confidentiality: 'Confidentiality',
};

function CellContent({ content }: { content?: string }) {
  if (!content || content === 'NO_DATA_AVAILABLE') {
    return <Badge variant="outline" className="text-xs text-muted-foreground">N/A</Badge>;
  }

  const truncated = content.length > 120 ? content.slice(0, 120) + '...' : content;

  return (
    <div className="group relative">
      <p className="text-xs leading-relaxed">{truncated}</p>
      {content.length > 120 && (
        <div className="absolute left-0 top-full z-50 hidden w-96 rounded-md border bg-card p-3 text-xs shadow-lg group-hover:block">
          {content}
        </div>
      )}
    </div>
  );
}

interface Props {
  refreshTrigger: number;
}

export default function ContractTable({ refreshTrigger }: Props) {
  const [contracts, setContracts] = useState<string[]>([]);
  const [contractData, setContractData] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContracts();
  }, [refreshTrigger]);

  async function loadContracts() {
    setLoading(true);
    try {
      const names = await contractsApi.fetchContracts();
      setContracts(names);

      const dataMap: Record<string, Record<string, string>> = {};
      for (const name of names) {
        const result = await contractsApi.fetchContractByName(name);
        const keyMap: Record<string, string> = {};
        for (const row of result.keys) {
          keyMap[row.key_name] = row.content;
        }
        dataMap[name] = keyMap;
      }
      setContractData(dataMap);
    } catch {
      // silently fail — table will show empty
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading contracts...</span>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            No contracts analyzed yet. Select a document above to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Analyzed Contracts ({contracts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 min-w-[200px] bg-background">
                  Contract Name
                </TableHead>
                {CONTRACT_KEYS.map((key) => (
                  <TableHead key={key} className="min-w-[180px]">
                    {KEY_LABELS[key]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((name) => (
                <TableRow key={name}>
                  <TableCell className="sticky left-0 z-10 bg-background font-medium">
                    {name}
                  </TableCell>
                  {CONTRACT_KEYS.map((key) => (
                    <TableCell key={key}>
                      <CellContent content={contractData[name]?.[key]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
