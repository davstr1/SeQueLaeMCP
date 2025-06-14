export interface ParsedArguments {
  jsonMode: boolean;
  command?: string;
  args: string[];
}

export function parseArguments(argv: string[]): ParsedArguments {
  const args = argv.slice(2);
  
  // Check for --json flag
  const jsonMode = args.includes('--json');
  const filteredArgs = args.filter(arg => arg !== '--json');
  
  // No command provided
  if (filteredArgs.length === 0) {
    return { jsonMode, args: filteredArgs };
  }
  
  // Extract command
  const command = filteredArgs[0];
  const remainingArgs = filteredArgs.slice(1);
  
  return {
    jsonMode,
    command,
    args: remainingArgs
  };
}