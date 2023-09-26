import { ArduinoState, BoardDetails, Port } from 'vscode-arduino-api';

// "LittleFS", "SPIFFS", "FatFS"

export interface UploadImageParams {
  readonly port: Pick<Port, 'address' | 'protocol'>;
  readonly fqbn: string;
  readonly sketchPath: string;

  readonly toolPath: string;
}

export interface SPIOptions {
  readonly start: number;
  readonly size: number;
  readonly page: number;
  readonly block: number;
  readonly offset: number;
}

export async function createUploadParams(
  arduinoState: ArduinoState
): Promise<UploadImageParams> {
  throw new Error();
}
