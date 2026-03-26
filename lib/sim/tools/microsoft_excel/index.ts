import { readTool, readV2Tool } from '@/lib/sim/tools/microsoft_excel/read'
import { tableAddTool } from '@/lib/sim/tools/microsoft_excel/table_add'
import { worksheetAddTool } from '@/lib/sim/tools/microsoft_excel/worksheet_add'
import { writeTool, writeV2Tool } from '@/lib/sim/tools/microsoft_excel/write'

// V1 exports
export const microsoftExcelReadTool = readTool
export const microsoftExcelTableAddTool = tableAddTool
export const microsoftExcelWorksheetAddTool = worksheetAddTool
export const microsoftExcelWriteTool = writeTool

// V2 exports
export const microsoftExcelReadV2Tool = readV2Tool
export const microsoftExcelWriteV2Tool = writeV2Tool
