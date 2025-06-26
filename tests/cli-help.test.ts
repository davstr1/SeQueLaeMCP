import { handleHelp, handleVersion, formatError } from '../src/cli';

describe('CLI Help Command', () => {
  describe('handleHelp', () => {
    test('should return help text in text mode', () => {
      const result = handleHelp(false);

      // Check main sections
      expect(result).toContain('Usage:');
      expect(result).toContain('Examples:');

      // Check all commands are listed
      expect(result).toContain('sequelae exec "SQL query"');
      expect(result).toContain('sequelae file path/to/query.sql');
      expect(result).toContain('sequelae schema');
      expect(result).toContain('sequelae backup');
      expect(result).toContain('sequelae exit');
      expect(result).toContain('sequelae --json');
      expect(result).toContain('sequelae --no-transaction');
      expect(result).toContain('sequelae --timeout <ms>');

      // Check examples
      expect(result).toContain('SELECT * FROM users');
      expect(result).toContain('CREATE TABLE posts');
      expect(result).toContain('migrations/001_init.sql');
      expect(result).toContain('backup --output db_backup.sql');
    });

    test('should return help object in JSON mode', () => {
      const result = handleHelp(true);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty('usage');
      expect(parsed).toHaveProperty('examples');

      expect(Array.isArray(parsed.usage)).toBe(true);
      expect(Array.isArray(parsed.examples)).toBe(true);

      // Check usage array contents
      expect(parsed.usage).toContainEqual(expect.stringContaining('exec "SQL query"'));
      expect(parsed.usage).toContainEqual(expect.stringContaining('file path/to/query.sql'));
      expect(parsed.usage).toContainEqual(expect.stringContaining('schema'));
      expect(parsed.usage).toContainEqual(expect.stringContaining('backup'));

      // Check examples array
      expect(parsed.examples.length).toBeGreaterThan(5);
      expect(parsed.examples).toContainEqual(expect.stringContaining('SELECT * FROM users'));
    });
  });

  describe('handleVersion', () => {
    test('should return version string in text mode', () => {
      const result = handleVersion(false);
      expect(result).toMatch(/^sequelae-mcp v\d+\.\d+\.\d+$/);
    });

    test('should return version object in JSON mode', () => {
      const result = handleVersion(true);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty('version');
      expect(parsed.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('formatError', () => {
    test('should format error in text mode without hint', () => {
      const result = formatError('Database connection failed', false);
      expect(result).toBe('Error: Database connection failed');
    });

    test('should format error in text mode with hint', () => {
      const result = formatError('Table not found', false, 'Check if the table exists');
      expect(result).toBe('Error: Table not found\nCheck if the table exists');
    });

    test('should format error in JSON mode without hint', () => {
      const result = formatError('Invalid SQL syntax', true);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({ error: 'Invalid SQL syntax' });
    });

    test('should format error in JSON mode with hint', () => {
      const result = formatError('Permission denied', true, 'Check database permissions');
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        error: 'Permission denied',
        hint: 'Check database permissions',
      });
    });
  });
});
