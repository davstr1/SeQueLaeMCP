import { parseArguments } from '../src/parseArguments';

describe('parseArguments', () => {
  it('should parse basic exec command', () => {
    const argv = ['node', 'cli.js', 'exec', 'SELECT * FROM users'];
    const result = parseArguments(argv);
    
    expect(result).toEqual({
      jsonMode: false,
      command: 'exec',
      args: ['SELECT * FROM users']
    });
  });

  it('should detect --json flag', () => {
    const argv = ['node', 'cli.js', '--json', 'exec', 'SELECT * FROM users'];
    const result = parseArguments(argv);
    
    expect(result).toEqual({
      jsonMode: true,
      command: 'exec',
      args: ['SELECT * FROM users']
    });
  });

  it('should handle --json flag at the end', () => {
    const argv = ['node', 'cli.js', 'exec', 'SELECT * FROM users', '--json'];
    const result = parseArguments(argv);
    
    expect(result).toEqual({
      jsonMode: true,
      command: 'exec',
      args: ['SELECT * FROM users']
    });
  });

  it('should handle no arguments', () => {
    const argv = ['node', 'cli.js'];
    const result = parseArguments(argv);
    
    expect(result).toEqual({
      jsonMode: false,
      args: []
    });
  });

  it('should handle only --json flag', () => {
    const argv = ['node', 'cli.js', '--json'];
    const result = parseArguments(argv);
    
    expect(result).toEqual({
      jsonMode: true,
      args: []
    });
  });

  it('should parse file command', () => {
    const argv = ['node', 'cli.js', 'file', 'migrations/001_init.sql'];
    const result = parseArguments(argv);
    
    expect(result).toEqual({
      jsonMode: false,
      command: 'file',
      args: ['migrations/001_init.sql']
    });
  });

  it('should handle help command', () => {
    const argv = ['node', 'cli.js', '--help'];
    const result = parseArguments(argv);
    
    expect(result).toEqual({
      jsonMode: false,
      command: '--help',
      args: []
    });
  });
});