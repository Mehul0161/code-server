const express = require("express");
const cors = require("cors");
require("dotenv").config();
const axios = require("axios");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check route
app.post("/api/code", async (req, res) => {
  const { inputText } = req.body;
  console.log(inputText);
  
  if (!inputText) {
    return res.status(400).json({ error: "No input text provided" });
  }

  try {
    const result = await getCode(inputText);
    console.log("Generated code:", result);

    if (!result.success) {
      return res.status(422).json({ error: "Failed to generate code" });
    }

    res.json(result);

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to generate code", details: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

async function getCode(keyword) {
  try {
    const response = await axios({
      url: "https://api.fireworks.ai/inference/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": process.env.OPENAI_API_KEY_v3
      },
      data: {
        model: "accounts/fireworks/models/deepseek-v3",
        temperature: 1,
        n: 1,
        max_tokens: 4000,
        messages: [
          {
            role: "system",
            content: `You are a code generator that creates complete React project structures. For each file, you must provide both the filepath and complete code content.

Always format your response exactly like this for each file:

filepath
\`\`\`filetype
complete code content here
\`\`\`

For example:

src/App.jsx
\`\`\`jsx
import React from 'react';
import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      {/* Component content */}
    </BrowserRouter>
  );
}

export default App;
\`\`\`

src/components/Header.jsx
\`\`\`jsx
import React from 'react';

function Header() {
  return (
    <header>
      {/* Header content */}
    </header>
  );
}

export default Header;
\`\`\`

IMPORTANT:
- Always provide complete, working code for each file
- Include all necessary imports
- Ensure code is properly formatted
- Don't use placeholders or incomplete code
- Don't skip any necessary files
- Include full implementation details`
          },
          {
            role: "user",
            content: `Create a modern React ${keyword} application with the following structure:

Required files and structure:
- src/
  - components/
    - Layout.jsx
    - Navbar.jsx
  - pages/
    - Home.jsx
    - Profile.jsx
  - store/
    - index.js
  - App.jsx
  - main.jsx
  - index.css
- package.json
- vite.config.js
- tailwind.config.js
- postcss.config.js
- README.md

Requirements:
- Complete, working code for all components
- Proper routing setup
- Modern styling with Tailwind CSS
- State management in store/index.js
- Clear documentation in README.md
- All necessary dependencies in package.json`
          }
        ]
      }
    });

    const content = response.data.choices[0].message.content;
    console.log("Raw API Response length:", content.length);
    
    if (!content) {
      throw new Error("Empty response from API");
    }

    const result = finalCode(content);
    console.log("Parse result:", {
      success: result.success,
      fileCount: result.files.length,
      files: result.files.map(f => f.path)
    });
    
    if (!result.success) {
      throw new Error(result.error || "Failed to parse generated code");
    }

    // Validate required files
    const requiredFiles = [
      'src/components/Layout.jsx',
      'src/components/Navbar.jsx',
      'src/pages/Home.jsx',
      'src/pages/Profile.jsx',
      'src/store/index.js',
      'src/App.jsx',
      'src/main.jsx',
      'src/index.css',
      'package.json',
      'vite.config.js',
      'tailwind.config.js',
      'postcss.config.js',
      'README.md'
    ];

    const missingFiles = requiredFiles.filter(file => 
      !result.files.some(f => f.path === file)
    );

    if (missingFiles.length > 0) {
      console.error("Missing required files:", missingFiles);
      throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
    }

    return result;

  } catch (error) {
    console.error("Error in getCode:", error);
    console.error("Stack trace:", error.stack);
    throw error;
  }
}

const headers = {
  "Content-Type": "application/json",
  Authorization: process.env.OPENAI_API_KEY_v3,
};


async function open_ai_chat(params) {
  if (params.stop && params.stop.indexOf("<|eot_id|>") === -1) {
    params.stop.push("<|eot_id|>");
  } else {
    params.stop = ["<|eot_id|>"];
  }

  if (!params.max_tokens) {
    params.max_tokens = 2500;
  }

  const dataString = JSON.stringify(params);

  const options = {
    url: "https://api.fireworks.ai/inference/v1/chat/completions",
    method: "POST",
    headers: headers,
    data: dataString,
  };

  try {
    const response = await axios(options);
    return { data: response.data };
  } catch (error) {
    console.error("Error in API call:", error);
    throw error;
  }
}

function finalCode(content) {
  try {
    if (!content) {
      console.error("Empty content received");
      throw new Error("No content to parse");
    }

    let files = [];
    // Split by file markers (filepath followed by code block)
    const fileBlocks = content.split(/(?=^[\w./\-]+\n```)/m);
    console.log("Number of file blocks:", fileBlocks.length);

    for (let block of fileBlocks) {
      block = block.trim();
      if (!block) continue;

      // Debug logging
      console.log("Processing block:", block.substring(0, 50) + "...");

      // Extract filepath and code content
      const lines = block.split('\n');
      const filepath = lines[0].trim();

      // Skip if not a valid filepath
      if (filepath.startsWith('```') || !filepath.includes('.')) {
        console.log("Skipping invalid filepath:", filepath);
        continue;
      }

      // Find the code block
      const codeStartIndex = block.indexOf('```');
      const codeEndIndex = block.lastIndexOf('```');

      if (codeStartIndex === -1 || codeEndIndex === -1) {
        console.log("No code block found for:", filepath);
        continue;
      }

      // Extract the code content
      const codeContent = block
        .substring(codeStartIndex + 3, codeEndIndex)
        .split('\n')
        .slice(1) // Skip the language identifier line
        .join('\n')
        .trim();

      if (!codeContent) {
        console.log("Empty code content for:", filepath);
        continue;
      }

      // Get file extension and language
      const extension = filepath.split('.').pop().toLowerCase();
      const language = getLanguageFromExtension(extension);

      // Create file object
      const file = {
        name: filepath.split('/').pop(),
        path: filepath,
        id: `file_${files.length}`,
        code: codeContent,
        language: language,
        extension: extension
      };

      files.push(file);
      console.log(`Added file: ${filepath} (${codeContent.length} chars)`);
    }

    if (files.length === 0) {
      console.error("No valid files were parsed");
      throw new Error("No valid files generated");
    }

    // Create folder structure
    const root = { name: 'root', type: 'folder', children: {} };
    
    files.forEach(file => {
      const parts = file.path.split('/');
      let current = root.children;
      
      // Create folders
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {
            name: part,
            type: 'folder',
            children: {}
          };
        }
        current = current[part].children;
      }
      
      // Add file
      const fileName = parts[parts.length - 1];
      current[fileName] = {
        name: fileName,
        type: 'file',
        id: file.id,
        language: file.language,
        extension: file.extension
      };
    });

    console.log(`Successfully parsed ${files.length} files`);
    return {
      success: true,
      files: files,
      folders: root
    };

  } catch (error) {
    console.error("Error in finalCode:", error);
    console.error("Raw content:", content);
    return {
      success: false,
      files: [],
      folders: { name: 'root', type: 'folder', children: {} },
      error: error.message
    };
  }
}

function getLanguageFromExtension(ext) {
  const languageMap = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    md: 'markdown',
    py: 'python',
    java: 'java',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    php: 'php',
    sql: 'sql',
    yml: 'yaml',
    yaml: 'yaml',
    xml: 'xml',
    sh: 'shell',
    bash: 'shell',
    txt: 'plaintext'
  };
  return languageMap[ext] || 'plaintext';
}

function createFolderStructure(files) {
  const root = { name: 'root', type: 'folder', children: {} };

  files.forEach(file => {
    const parts = file.path.split('/');
    let current = root.children;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        // It's a file
        current[part] = { 
          name: part, 
          type: 'file', 
          id: file.id,
          language: file.language,
          extension: file.extension
        };
      } else {
        // It's a folder
        if (!current[part]) {
          current[part] = { 
            name: part, 
            type: 'folder', 
            children: {} 
          };
        }
        current = current[part].children;
      }
    });
  });

  return root;
}

function cleanCode(str) {
  if (!str) return "";
  return str
    .trim()
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\t/g, '    ')
    .replace(/\n{3,}/g, '\n\n');
}
