/**
 * Shared Types — SmartPrint
 */

export interface PrintSettings {
  // Common
  orientation: "Portrait" | "Landscape";
  colorMode: "Color" | "Black & White";
  margins: "Default" | "None" | "Narrow" | "Normal" | "Wide" | "Custom";
  customMarginTopBottom?: number;
  customMarginLeftRight?: number;
  copies: number;

  // Mode A (PDF/DOCX)
  paperSize: string;
  scaleMode: "Fit to Page Width" | "Custom Scale";
  customScalePercentage?: number;
  pagesPerSheet: number;
  pagesPerSheetFill: "repeat" | "blank";
  pageSelection: "All" | "Current" | "Odd" | "Even" | "Custom";
  customPageRange?: string;
  enableAdvancedColor: boolean;
  enableColorRange: boolean;
  colorPagesRange?: string; // e.g. "1,3,5-8"
  enableBWRange: boolean;
  bwPagesRange?: string; // e.g. "2,4,9-12"
  allPagesColor: boolean;

  // Mode B (Images)
  aspectRatio: string;
  customWidthDimensions?: number;
  customHeightDimensions?: number;
  enableCrop: boolean;
  cropData?: any; // To store crop coordinates if needed
  exposure: number;
  brightness: number;
  contrast: number;
  saturation: number;
  photosPerPage: number; // 1 (Full), 2, 4, 9, 35, or custom number 
  encryptionKeys?: string;
  fileInfos?: any[];
}

export interface JobResponse {
  id: string;
  userId: string;
  createdAt: number;
  openedAt: number | null;
  printedAt: number | null;
  expiredAt: number | null;
  isEncrypted: boolean;
  settings: PrintSettings | null;
  fileCount: number;
  status: string;
  fileNames: string[];
  fileUrls?: string[];
  encryptionKeys?: string;
  fileInfos?: any[];
  remainingSeconds?: number;
}

export interface CreateJobResponse {
  jobId: string;
  userId: string;
  expiresAt: number;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  orientation: "Portrait",
  colorMode: "Color",
  margins: "Default",
  copies: 1,
  paperSize: "A4",
  scaleMode: "Fit to Page Width",
  pagesPerSheet: 1,
  pagesPerSheetFill: "blank",
  pageSelection: "All",
  enableAdvancedColor: false,
  enableColorRange: false,
  enableBWRange: false,
  allPagesColor: true,
  aspectRatio: "Original",
  enableCrop: false,
  exposure: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  photosPerPage: 1,
};
