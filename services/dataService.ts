import * as XLSX from 'xlsx';
import { ParsedFile, JoinCandidate, JoinType, JoinStats } from '../types';

const normalizeKey = (val: any) => (val === null || val === undefined) ? '' : String(val).trim();

// Helper to get the column name for a specific file
const getKeyColumnForFile = (file: ParsedFile, candidate: JoinCandidate): string | undefined => {
  return candidate.columnMappings.find(m => m.fileName === file.name)?.columnName;
};

// Helper to extract keys and their occurrence counts from a file
const getKeyCountsFromFile = (file: ParsedFile, candidate: JoinCandidate): Map<string, number> => {
  const keyCol = getKeyColumnForFile(file, candidate);
  const counts = new Map<string, number>();
  if (!keyCol) return counts;

  file.data.forEach(row => {
    const rawVal = row[keyCol];
    const val = normalizeKey(rawVal);
    if (val !== '') {
      counts.set(val, (counts.get(val) || 0) + 1);
    }
  });
  return counts;
};

/**
 * Calculates the estimated number of records for each join type
 */
export const calculateJoinStats = (files: ParsedFile[], candidate: JoinCandidate): JoinStats => {
  const fileKeyCounts = files.map(f => getKeyCountsFromFile(f, candidate));

  if (fileKeyCounts.length === 0) {
    return { 
      [JoinType.INNER]: 0, 
      [JoinType.OUTER]: 0, 
      [JoinType.LEFT]: 0, 
      [JoinType.ADDITIVE]: 0,
      [JoinType.AI_SEMANTIC]: 0
    };
  }

  // Get Union of all keys to iterate over
  const allKeys = new Set<string>();
  fileKeyCounts.forEach(map => {
    for (const key of map.keys()) {
      allKeys.add(key);
    }
  });

  let innerCount = 0;
  let outerCount = 0;
  let leftCount = 0;

  allKeys.forEach(key => {
    // Get counts for this key in each file
    const counts = fileKeyCounts.map(map => map.get(key) || 0);

    // Inner: Product of all counts. If any is 0, result is 0.
    const product = counts.reduce((acc, c) => acc * c, 1);
    innerCount += product;

    // Outer/Additive: Product of (count > 0 ? count : 1).
    const outerProduct = counts.reduce((acc, c) => acc * (c === 0 ? 1 : c), 1);
    outerCount += outerProduct;

    // Left: Only consider if present in first file (index 0).
    if (counts[0] > 0) {
      const leftProduct = counts.slice(1).reduce((acc, c) => acc * (c === 0 ? 1 : c), 1);
      leftCount += (counts[0] * leftProduct);
    }
  });

  return {
    [JoinType.OUTER]: outerCount,
    [JoinType.INNER]: innerCount,
    [JoinType.LEFT]: leftCount,
    [JoinType.ADDITIVE]: outerCount,
    [JoinType.AI_SEMANTIC]: 0 // Calculated on demand via API
  };
};

/**
 * Performs the join based on the selected type
 */
export const joinDatasets = (files: ParsedFile[], candidate: JoinCandidate, joinType: JoinType = JoinType.OUTER): any[] => {
  
  // 1. Build maps of Key -> Array of Rows
  const fileDataMaps = files.map((file) => {
    const map = new Map<string, any[]>();
    const keyCol = getKeyColumnForFile(file, candidate);
    if (!keyCol) return map;

    file.data.forEach(row => {
      const val = normalizeKey(row[keyCol]);
      if (val !== '') {
        if (!map.has(val)) map.set(val, []);
        map.get(val)!.push(row);
      }
    });
    return map;
  });

  // 2. Identify Target Keys
  const allKeys = new Set<string>();
  fileDataMaps.forEach(map => {
    for (const key of map.keys()) {
      allKeys.add(key);
    }
  });

  const result: any[] = [];

  // Helper for Cartesian Product
  const cartesian = (arrays: any[][]) => {
    return arrays.reduce((acc, curr) => {
      return acc.flatMap(a => curr.map(c => [...a, c]));
    }, [[]] as any[]);
  };

  allKeys.forEach(key => {
    const rowsPerFile = files.map((_, index) => {
      const rows = fileDataMaps[index].get(key);
      if (rows && rows.length > 0) return rows;
      return [null];
    });

    const hasDataInFile = rowsPerFile.map(arr => arr[0] !== null);
    
    // Join Type Filtering
    if (joinType === JoinType.INNER) {
      if (hasDataInFile.some(hasData => !hasData)) return;
    }
    if (joinType === JoinType.LEFT) {
      if (!hasDataInFile[0]) return;
    }

    const combinations = cartesian(rowsPerFile);

    combinations.forEach(combo => {
       const joinedRow: any = { [candidate.keyName]: key };
       const foundInFiles: string[] = [];
       const missingInFiles: string[] = [];
       
       combo.forEach((row, fileIndex) => {
           const file = files[fileIndex];
           if (row) {
               foundInFiles.push(file.name);
               // Add columns
               const keyCol = getKeyColumnForFile(file, candidate);
               Object.entries(row).forEach(([col, val]) => {
                  if (col === keyCol) return; // Skip original key
                  
                  const cleanFileName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
                  const newColName = `${cleanFileName} - ${col}`;
                  joinedRow[newColName] = val;
               });
           } else {
               missingInFiles.push(file.name);
           }
       });

       // Add Additive logic flags
       if (joinType === JoinType.ADDITIVE) {
          if (missingInFiles.length === 0) {
            joinedRow['_Join_Status'] = 'Matched (All Files)';
          } else if (foundInFiles.length === 1) {
            joinedRow['_Join_Status'] = `Unique to ${foundInFiles[0]}`;
          } else {
            joinedRow['_Join_Status'] = `Partial Match (Found in ${foundInFiles.length}/${files.length})`;
          }

          files.forEach(f => {
            const cleanName = f.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
            joinedRow[`_Found_In_${cleanName}`] = foundInFiles.includes(f.name) ? 'TRUE' : 'FALSE';
          });
       }
       
       result.push(joinedRow);
    });
  });

  return result;
};

export const createJoinedFile = (data: any[], name: string): ParsedFile => {
  // Sanitize data: Ensure all values are primitives for display purposes
  // This catches cases where manual joins might slip objects through, though joinDatasets handles it well.
  // This is primarily for AI generated data consistency.
  const sanitizedData = data.map(row => {
    const newRow: any = {};
    Object.keys(row).forEach(k => {
      const val = row[k];
      if (val === null || val === undefined) {
         newRow[k] = null;
      } else if (typeof val === 'object') {
        if (Array.isArray(val)) {
           // Flatten array: [1, 2] -> "1, 2" or [{a:1}] -> '{"a":1}'
           newRow[k] = val.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(' | ');
        } else {
           newRow[k] = JSON.stringify(val);
        }
      } else {
        newRow[k] = val;
      }
    });
    return newRow;
  });

  const headers = sanitizedData.length > 0 ? Object.keys(sanitizedData[0]) : [];
  return {
    id: 'joined-' + Math.random().toString(36).substr(2, 9),
    name: name,
    size: new Blob([JSON.stringify(sanitizedData)]).size,
    headers: headers,
    previewData: sanitizedData.slice(0, 10),
    data: sanitizedData,
    rowCount: sanitizedData.length,
    isJoined: true,
    aiContext: {
      chatHistory: []
    }
  };
};

export const downloadCSV = (data: any[], filename: string) => {
  // Ensure data is flat
  const flatData = data.map(row => {
     const newRow: any = {};
     Object.keys(row).forEach(k => {
       const val = row[k];
       if (val === null || val === undefined) {
          newRow[k] = '';
       } else if (typeof val === 'object') {
          if (Array.isArray(val)) {
             newRow[k] = val.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v)).join(' | ');
          } else {
             newRow[k] = JSON.stringify(val);
          }
       } else {
         newRow[k] = val;
       }
     });
     return newRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(flatData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Joined Data");
  XLSX.writeFile(workbook, filename);
};