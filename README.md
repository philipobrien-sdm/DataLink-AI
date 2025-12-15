# DataLink AI 🧠🔗

**Intelligent Excel/CSV Data Integration & Analysis**

DataLink AI is a modern React application that simplifies the complex task of merging multiple datasets. Instead of manually writing VLOOKUPs or SQL queries, it uses **Google Gemini 2.5** to analyze your spreadsheets, detect common keys (like IDs or Emails), and perform intelligent joins—including semantic merges that handle fuzzy matching and data consolidation.

<img width="500" height="300" alt="Screenshot 2025-12-15 084234" src="https://github.com/user-attachments/assets/0c052cc0-2b91-4b1f-b26c-4f648300ba31" />
<img width="500" height="300" alt="Screenshot 2025-12-15 084128" src="https://github.com/user-attachments/assets/afd9f512-46cd-48db-a20b-084f5eb0627f" />
<img width="500" height="150" alt="Screenshot 2025-12-15 084024" src="https://github.com/user-attachments/assets/220bb06f-a132-40e1-acb0-73e6d3eb8e3c" />
<img width="500" height="150" alt="Screenshot 2025-12-15 083948" src="https://github.com/user-attachments/assets/ab6de7c0-6dc4-42e6-95b4-d311a9c902ca" />



## 🚀 Features

*   **📂 Multi-Format Support**: Upload `.xlsx`, `.xls`, and `.csv` files.
*   **🧠 AI-Powered Analysis**: Automatically detects the best columns to join on, even if headers are named differently (e.g., "User ID" vs "uid").
*   **🔗 Smart Join Strategies**:
    *   **Additive Join**: Flags matched vs. unmatched rows (Great for reconciliation).
    *   **AI Semantic Merge**: Uses LLMs to flatten 1:N relationships, resolve conflicts, and fuzzy match entities based on a custom plan.
    *   **Standard Joins**: Inner, Left, Full Outer.
*   **📝 Interactive Merge Plan**: Review and edit the AI's execution plan before merging to control logic (e.g., "Keep the older phone number").
*   **💬 Chat with Data**: Ask questions about your specific datasets ("What is the trend in Q3?", "Explain the status column") using a context-aware AI chat.
*   **🔒 Privacy Focused**: Full dataset processing happens locally in your browser. Only small schema samples are sent to the AI for analysis.
*   **💾 Workspace Management**: Save your joined files to the workspace or export the entire state to JSON to resume later.

## 🛠️ Tech Stack

*   **Frontend**: React 19, TypeScript
*   **AI**: Google Gemini API (`@google/genai` SDK)
*   **Styling**: Tailwind CSS, Lucide React (Icons)
*   **Data Processing**: SheetJS (`xlsx`)
*   **Markdown Rendering**: `react-markdown`

## 📦 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/datalink-ai.git
    cd datalink-ai
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure API Key**
    DataLink AI requires a Google Gemini API key.
    
    *   Get your key from [Google AI Studio](https://aistudio.google.com/).
    *   Ensure the environment variable `API_KEY` is available to the build process.
    
    *Example (.env):*
    ```env
    API_KEY=your_gemini_api_key_here
    ```

4.  **Run the application**
    ```bash
    npm start
    ```

## 📖 Usage Guide

1.  **Upload**: Drag and drop at least two spreadsheet files into the drop zone.
2.  **Analyze**: Click "Identify Join Keys". The AI will scan headers and data samples to propose a common key (e.g., `CustomerID`).
3.  **Select Strategy**:
    *   Review the AI's reasoning.
    *   Choose a join type (Additive, Inner, AI Semantic, etc.).
    *   *For AI Semantic Merge*: Read the generated plan, edit instructions if necessary, and execute.
4.  **Export**: Download the resulting merged file as a CSV or save it to your workspace for further analysis.
5.  **Insights**: Click the "Brain" icon on any file card to open the chat interface and ask questions about that specific dataset.

## 🛡️ Privacy & Security

*   **Local Execution**: The heavy lifting of joining thousands of rows happens in your browser's memory using JavaScript.
*   **AI Data Usage**: Only the headers and the first 3 rows of data are sent to Google Gemini to infer schema relationships. When using "AI Semantic Merge", a larger sample (top 50 rows) is processed to generate the result.

## 📄 License

This project is licensed under the MIT License.
