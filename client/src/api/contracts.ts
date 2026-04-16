import axios, { AxiosInstance } from 'axios';

export interface DocumentInfo {
  path: string;
  name: string;
  category: string;
}

export interface ContractKey {
  id: string;
  contract_name: string;
  key_name: string;
  content: string;
  file_name: string;
  checksum: string;
  created_at: string;
}

export interface AnalyzeResult {
  success: boolean;
  skipped?: boolean;
  message?: string;
  contractName?: string;
  results?: ContractKey[];
}

export interface BatchResult {
  fileName: string;
  status: 'analyzed' | 'skipped' | 'failed';
  contractName?: string;
  error?: string;
}

export interface BatchStatus {
  running: boolean;
  scheduled: boolean;
  cronExpression: string;
  lastRunAt: string | null;
  lastRunResults: BatchResult[];
}

class ContractsApi {
  private client: AxiosInstance;

  constructor(baseURL: string = '/api') {
    this.client = axios.create({ baseURL });
  }

  async fetchDocuments(): Promise<DocumentInfo[]> {
    const { data } = await this.client.get<{ documents: DocumentInfo[] }>('/documents');
    return data.documents;
  }

  async analyzeDocument(filePath: string): Promise<AnalyzeResult> {
    const { data } = await this.client.post<AnalyzeResult>('/analyze', { filePath });
    return data;
  }

  async triggerBatchAnalysis(): Promise<{ success: boolean; message: string }> {
    const { data } = await this.client.post<{ success: boolean; message: string }>('/analyze/batch');
    return data;
  }

  async getBatchStatus(): Promise<BatchStatus> {
    const { data } = await this.client.get<BatchStatus>('/analyze/status');
    return data;
  }

  async startCron(expression?: string): Promise<{ success: boolean; cronExpression: string }> {
    const { data } = await this.client.post<{ success: boolean; cronExpression: string }>('/cron/start', { expression });
    return data;
  }

  async stopCron(): Promise<{ success: boolean; message: string }> {
    const { data } = await this.client.post<{ success: boolean; message: string }>('/cron/stop');
    return data;
  }

  async fetchContracts(): Promise<string[]> {
    const { data } = await this.client.get<{ contracts: string[] }>('/contracts');
    return data.contracts;
  }

  async fetchContractByName(name: string): Promise<{ contractName: string; keys: ContractKey[] }> {
    const { data } = await this.client.get<{ contractName: string; keys: ContractKey[] }>(
      `/contracts/${encodeURIComponent(name)}`
    );
    return data;
  }
}

export const contractsApi = new ContractsApi();
