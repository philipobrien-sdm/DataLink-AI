import React, { useState } from 'react';
import { Upload, Loader2, AlertCircle, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ParsedFile } from '../types';

interface FileUploadProps {
  onFilesParsed: (files: ParsedFile[]) => void;
  isAnalyzing: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesParsed, isAnalyzing }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = (file: File): Promise<ParsedFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Assume first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Parse to JSON to get preview and headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            reject(new Error(`File ${file.name} is empty`));
            return;
          }

          const headers = jsonData[0] as string[];
          // Extract data rows (skip header)
          const rawData = XLSX.utils.sheet_to_json(worksheet); 
          const previewData = rawData.slice(0, 10); // Top 10 rows for preview

          resolve({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            headers: headers.filter(h => !!h), // Filter empty headers
            previewData,
            data: rawData, // Store full data for joining later
            rowCount: rawData.length
          });
        } catch (err) {
          reject(new Error(`Failed to parse ${file.name}`));
        }
      };

      reader.onerror = () => reject(new Error(`Error reading ${file.name}`));
      reader.readAsBinaryString(file);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setIsProcessing(true);
      setError(null);
      
      // Explicitly type cast to File[] to avoid 'unknown' type error
      const fileList = Array.from(event.target.files) as File[];
      const xlsFiles = fileList.filter(f => f.name.endsWith('.xls') || f.name.endsWith('.xlsx') || f.name.endsWith('.csv'));

      if (xlsFiles.length === 0) {
        setError("Please upload .xls, .xlsx, or .csv files.");
        setIsProcessing(false);
        return;
      }

      try {
        const parsedFiles = await Promise.all(xlsFiles.map(processFile));
        onFilesParsed(parsedFiles);
      } catch (err: any) {
        setError(err.message || "Failed to process files");
      } finally {
        setIsProcessing(false);
        // Reset input value so same files can be selected again if needed
        event.target.value = '';
      }
    }
  };

  const loadDemoData = () => {
    setIsProcessing(true);
    setTimeout(() => {
      // Create Customers Dataset
      const customers = [
        { CustomerID: 101, Company: "TechCorp", Region: "North", Contact: "Alice Smith" },
        { CustomerID: 102, Company: "BizSolutions", Region: "South", Contact: "Bob Jones" },
        { CustomerID: 103, Company: "GlobalTrade", Region: "East", Contact: "Charlie Day" },
        { CustomerID: 104, Company: "StartUp Inc", Region: "West", Contact: "Diana Prince" }, // No orders
        { CustomerID: 105, Company: "MegaCorp", Region: "North", Contact: "Eve Polastri" }
      ];
      
      const orders = [
        { OrderID: "ORD-001", Cust_Ref_ID: 101, Product: "Server Rack", Amount: 5000 },
        { OrderID: "ORD-002", Cust_Ref_ID: 101, Product: "Maintenance", Amount: 1200 },
        { OrderID: "ORD-003", Cust_Ref_ID: 102, Product: "Consulting", Amount: 3000 },
        { OrderID: "ORD-004", Cust_Ref_ID: 103, Product: "Software Lic", Amount: 800 },
        { OrderID: "ORD-005", Cust_Ref_ID: 103, Product: "Support", Amount: 400 },
        { OrderID: "ORD-006", Cust_Ref_ID: 999, Product: "Mystery Purchase", Amount: 100 } // Orphan order
      ];

      const demoFiles: ParsedFile[] = [
        {
          id: 'demo-1',
          name: 'CRM_Customers.csv',
          size: 1024,
          headers: Object.keys(customers[0]),
          previewData: customers,
          data: customers,
          rowCount: customers.length
        },
        {
          id: 'demo-2',
          name: 'Sales_Orders.csv',
          size: 2048,
          headers: Object.keys(orders[0]),
          previewData: orders,
          data: orders,
          rowCount: orders.length
        }
      ];

      onFilesParsed(demoFiles);
      setIsProcessing(false);
    }, 600);
  };

  return (
    <div className="w-full space-y-4">
      <label 
        className={`
          flex flex-col items-center justify-center w-full h-48 
          border-2 border-dashed rounded-2xl cursor-pointer 
          transition-all duration-300 ease-in-out relative overflow-hidden group
          ${isProcessing || isAnalyzing 
            ? 'bg-slate-50 border-slate-300 cursor-wait opacity-70' 
            : 'bg-white border-blue-200 hover:border-blue-500 hover:bg-blue-50 shadow-sm'}
        `}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 z-10">
          {isProcessing ? (
            <Loader2 className="w-10 h-10 mb-3 text-blue-500 animate-spin" />
          ) : (
            <div className="bg-blue-100 p-4 rounded-full mb-3 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
          )}
          
          <p className="mb-2 text-sm text-slate-600 font-medium">
            {isProcessing ? 'Processing files...' : 'Click to upload Spreadsheets'}
          </p>
          <p className="text-xs text-slate-400">
            Supports .xlsx, .xls, .csv
          </p>
        </div>
        <input 
          type="file" 
          className="hidden" 
          multiple 
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          disabled={isProcessing || isAnalyzing}
        />
      </label>

      {/* Demo Data Option */}
      {!isAnalyzing && !isProcessing && (
         <div className="flex justify-center">
            <button 
              onClick={loadDemoData}
              className="text-xs flex items-center space-x-2 text-slate-500 hover:text-blue-600 transition-colors py-2 px-4 rounded-full hover:bg-blue-50 border border-transparent hover:border-blue-100"
            >
               <Database className="w-3 h-3" />
               <span>Try with Demo Data (Customers & Orders)</span>
            </button>
         </div>
      )}

      {error && (
        <div className="mt-4 flex items-center p-3 text-sm text-red-600 bg-red-50 rounded-lg animate-fade-in border border-red-100">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};