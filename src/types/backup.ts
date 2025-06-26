export interface BackupOptions {
  format?: 'plain' | 'custom' | 'directory' | 'tar';
  tables?: string[];
  schemas?: string[];
  dataOnly?: boolean;
  schemaOnly?: boolean;
  compress?: boolean;
  outputPath?: string;
}

export interface BackupResult {
  success: boolean;
  outputPath: string;
  size?: number;
  duration: number;
  error?: string;
}
