import { ArduinoState } from 'vscode-arduino-api';

export interface CreateImageParams {
  /**
   * Path to `mkspiffs` or `mkfatfs`.
   */
  readonly imageToolPath: string;
}

export async function createCreateImageParams(
  arduinoState: ArduinoState
): Promise<CreateImageParams> {
  throw new Error('');
}
