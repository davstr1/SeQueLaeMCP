import { validateBackupOptions } from '../src/utils/backup-validator';

describe('Backup Validator Tests', () => {
  describe('validateBackupOptions', () => {
    test('should accept valid backup options', () => {
      const options = {
        format: 'custom' as const,
        compress: true,
        outputPath: 'backup.dump',
      };

      expect(() => validateBackupOptions(options)).not.toThrow();
    });

    test('should accept all valid formats', () => {
      const formats = ['plain', 'custom', 'tar', 'directory'] as const;

      formats.forEach(format => {
        const options = { format };
        expect(() => validateBackupOptions(options)).not.toThrow();
      });
    });

    test('should reject invalid format', () => {
      const options = {
        format: 'invalid' as any,
      };

      expect(() => validateBackupOptions(options)).toThrow('Invalid backup format');
    });

    test('should reject invalid output path', () => {
      const options = {
        format: 'plain' as const,
        outputPath: '',
      };

      expect(() => validateBackupOptions(options)).toThrow('Output path cannot be empty');
    });

    test('should handle tables option', () => {
      const options = {
        format: 'custom' as const,
        tables: ['users', 'posts'],
      };

      expect(() => validateBackupOptions(options)).not.toThrow();
    });

    test('should handle empty tables array', () => {
      const options = {
        format: 'custom' as const,
        tables: [],
      };

      expect(() => validateBackupOptions(options)).not.toThrow();
    });

    test('should default to no compression', () => {
      const options = {
        format: 'tar' as const,
      };

      expect(() => validateBackupOptions(options)).not.toThrow();
    });

    test('should handle all options together', () => {
      const options = {
        format: 'directory' as const,
        compress: true,
        outputPath: '/backups/db_backup',
        tables: ['users', 'posts', 'comments'],
      };

      expect(() => validateBackupOptions(options)).not.toThrow();
    });
  });
});
