import * as mammoth from "mammoth";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import logger from "../config/logger.js";
import { fileURLToPath } from "url";

export interface DocumentInfo {
  path: string;
  name: string;
  category: string;
}

export class DocumentParser {
  private publicDir: string;

  constructor(publicDir?: string) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    this.publicDir = publicDir || path.join(__dirname, "../../public");
  }

  async extractMarkdown(filePath: string): Promise<string> {
    const absolutePath = path.join(this.publicDir, filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    logger.info(`Extracting markdown from: ${filePath}`);
    const result = await mammoth.convertToMarkdown({ path: absolutePath });

    if (result.messages.length > 0) {
      logger.warn(
        `Mammoth warnings for ${filePath}: ${JSON.stringify(result.messages)}`,
      );
    }

    logger.info(`Extracted ${result.value.length} characters from ${filePath}`);
    return result.value;
  }

  computeChecksum(content: string): string {
    return crypto.createHash("md5").update(content).digest("hex");
  }

  listDocuments(dir?: string, basePath: string = ""): DocumentInfo[] {
    const scanDir = dir || this.publicDir;
    const documents: DocumentInfo[] = [];

    if (!fs.existsSync(scanDir)) {
      return documents;
    }

    const entries = fs.readdirSync(scanDir, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = path.join(basePath, entry.name);
      if (entry.isDirectory()) {
        documents.push(
          ...this.listDocuments(path.join(scanDir, entry.name), relativePath),
        );
      } else if (
        entry.name.toLowerCase().endsWith(".docx") &&
        !entry.name.startsWith("~$")
      ) {
        documents.push({
          path: relativePath,
          name: entry.name.replace(".docx", ""),
          category: basePath || "Uncategorized",
        });
      }
    }

    return documents;
  }
}

export const documentParser = new DocumentParser();
