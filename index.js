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
  const { inputText, technology } = req.body;
  console.log("Input text:", inputText);
  console.log("Technology:", technology);
  
  if (!inputText) {
    return res.status(400).json({ error: "Input text is required" });
  }

  try {
    // If no technology specified or 'vanilla', use HTML/CSS/JS
    const techToUse = technology === 'vanilla' || !technology ? 'html' : technology;
    const result = await getCode(inputText, techToUse);
    
    console.log("Generated files:", result.files.map(f => ({
      path: f.path,
      contentLength: f.content?.length || f.code?.length || 0
    })));
    
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

async function getCode(keyword, technology) {
  try {
    // Add technology-specific configurations
    const config = {
      html: {
        temperature: 0.7,
        max_tokens: 2500,
        system_message: `You are a web development expert. Create a complete web application using HTML, CSS, and vanilla JavaScript with modern styling using Tailwind CSS. Follow best practices and create clean, well-structured code.
              
        Provide the code in this exact format:
        web-app/index.html
        \`\`\`html
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>[Your Title]</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="stylesheet" href="style.css">
        </head>
        <body>
            [Your HTML code here]
            <script src="script.js"></script>
        </body>
        </html>
        \`\`\`

        web-app/style.css
        \`\`\`css
        [Your CSS code here]
        \`\`\`

        web-app/script.js
        \`\`\`javascript
        [Your JavaScript code here]
        \`\`\``
      },
      react: {
        temperature: 0.6,
        max_tokens: 2500,
        system_message: `You are a React expert. Create a modern React application with clean code and best practices.
        
        Provide the code in this exact format with all necessary files:
        web-app/package.json
        \`\`\`json
        {
          "name": "web-app",
          "private": true,
          "version": "0.0.0",
          "type": "module",
          "scripts": {
            "dev": "vite",
            "build": "vite build",
            "preview": "vite preview"
          },
          "dependencies": {
            "react": "^18.2.0",
            "react-dom": "^18.2.0"
          }
        }
        \`\`\`

        web-app/src/App.jsx
        \`\`\`jsx
        [Your App component code here]
        \`\`\`

        web-app/src/main.jsx
        \`\`\`jsx
        [Your main entry file code here]
        \`\`\`

        web-app/src/components/[ComponentName].jsx
        \`\`\`jsx
        [Your component code here]
        \`\`\`

        web-app/src/styles/index.css
        \`\`\`css
        [Your styles here]
        \`\`\`

        web-app/index.html
        \`\`\`html
        [Your HTML template here]
        \`\`\`
        `
      }
    };

    const currentConfig = config[technology] || config.html;

    const response = await axios({
      url: "https://api.fireworks.ai/inference/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": process.env.OPENAI_API_KEY_v3
      },
      data: {
        model: "accounts/fireworks/models/deepseek-v3",
        temperature: currentConfig.temperature,
        max_tokens: currentConfig.max_tokens,
        messages: [
          {
            role: "system",
            content: currentConfig.system_message
          },
          {
            role: "user",
            content: `Create a web application that will: ${keyword}

Make sure to:
1. Use semantic HTML/components
2. Use modern styling
3. Make it fully responsive
4. Add proper error handling
5. Make it accessible
6. Add proper comments
7. Include all necessary files
8. Ensure code is complete and functional`
          }
        ]
      }
    });

    const generatedCode = response.data.choices[0].message.content;
    console.log("Generated code:", generatedCode);

    // Parse the response into files
    const files = [];
    const fileRegex = /web-app\/([^`]+)\n```[^\n]*\n([\s\S]*?)\n```/g;
    let match;

    while ((match = fileRegex.exec(generatedCode)) !== null) {
      const [_, filePath, content] = match;
      files.push({
        id: `web-app_${filePath}`.toLowerCase().replace(/[/.]/g, '_'),
        path: `web-app/${filePath.trim()}`,
        content: content.trim(),
        language: filePath.split('.').pop(),
        extension: filePath.split('.').pop()
      });
    }

    console.log("Generated files:", files);

    if (files.length === 0) {
      throw new Error("No files were generated. Please try again.");
    }

    return {
      success: true,
      files: files,
      folders: createFolderStructure(files)
    };

  } catch (error) {
    console.error("Error in getCode:", error);
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

// Helper function to get technology-specific instructions
function getTechnologySpecificInstructions(technology) {
  const instructions = {
    html: `
- Use semantic HTML5 elements
- Include responsive CSS
- Use modern JavaScript features
- Follow web accessibility guidelines
- Include proper meta tags
- Use CSS best practices
- Consider cross-browser compatibility`,
    react: `
- Use modern React features (hooks, context, etc.)
- Follow React component organization best practices
- Include proper React routing setup
- Use proper state management patterns
- Include necessary React configuration files
- Follow React naming conventions
- Consider React performance best practices`,
    next: `
- Follow Next.js project structure conventions
- Use appropriate Next.js features (SSR, SSG, ISR)
- Include proper routing setup for Next.js
- Follow Next.js data fetching patterns
- Include necessary Next.js configuration files
- Use Next.js specific optimizations
- Consider Next.js deployment requirements`,
    vue: `
- Follow Vue.js 3 composition API patterns
- Use Vue.js project structure conventions
- Include Vuex/Pinia for state management
- Follow Vue.js routing best practices
- Include necessary Vue.js configuration files
- Use Vue.js specific features properly
- Consider Vue.js performance patterns`,
    native: `
- Follow React Native project structure
- Include proper navigation setup
- Use React Native specific components
- Follow mobile-first design patterns
- Include necessary mobile configurations
- Consider cross-platform compatibility
- Include proper React Native setup files`
  };

  return instructions[technology] || instructions.html;
}
