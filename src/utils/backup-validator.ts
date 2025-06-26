import { BackupOptions } from '../types/backup';

export function validateBackupOptions(options: BackupOptions): void {
  const validFormats = ['plain', 'custom', 'tar', 'directory'];

  if (options.format && !validFormats.includes(options.format)) {
    throw new Error(
      `Invalid backup format: ${options.format}. Must be one of: ${validFormats.join(', ')}`
    );
  }

  if (options.outputPath !== undefined && options.outputPath === '') {
    throw new Error('Output path cannot be empty');
  }

  // Tables can be empty array or undefined
  if (options.tables && !Array.isArray(options.tables)) {
    throw new Error('Tables must be an array');
  }
}
