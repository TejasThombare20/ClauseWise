declare module 'mammoth' {
  interface Input {
    path?: string;
    buffer?: Buffer;
    arrayBuffer?: ArrayBuffer;
  }

  interface Result {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  interface Options {
    styleMap?: string | string[];
  }

  export function convertToHtml(input: Input, options?: Options): Promise<Result>;
  export function convertToMarkdown(input: Input, options?: Options): Promise<Result>;
  export function extractRawText(input: Input): Promise<Result>;
}
