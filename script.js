document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const buttonLoader = document.getElementById('buttonLoader');
    const keywordInput = document.getElementById('keywordInput');
    const fileList = document.querySelector('.space-y-1');

    // Initial setup
    showCode('htmlCode');
    toggleView('code');

    let selectedTechnology = null;

    // Add this at the beginning of your DOMContentLoaded event listener
    function createGeneratingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'generating-indicator hidden';
        indicator.innerHTML = `
            <div class="generating-content">
                <div class="mb-4">
                    <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
                </div>
                <div class="text-lg font-semibold text-white mb-2">Generating Code</div>
                <div class="text-sm text-gray-400">Using <span id="selectedTechIndicator" class="text-blue-400"></span></div>
            </div>
        `;
        document.body.appendChild(indicator);
        return indicator;
    }

    const generatingIndicator = createGeneratingIndicator();

    // Update the technology button click handler
    document.querySelectorAll('.technology-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active state from all buttons
            document.querySelectorAll('.technology-btn').forEach(b => {
                b.classList.remove('border-blue-500', 'selected');
                b.classList.add('border-transparent');
            });

            // Add active state to clicked button with animation
            btn.classList.remove('border-transparent');
            btn.classList.add('border-blue-500', 'selected');

            // Store selected technology
            selectedTechnology = btn.dataset.tech;
            
            // Update the tech name in the generating indicator
            document.getElementById('selectedTechIndicator').textContent = 
                btn.querySelector('.tech-name').textContent;

            // Enable generate button if input has value
            const inputText = keywordInput.value.trim();
            generateBtn.disabled = !inputText;
            generateBtn.classList.toggle('opacity-50', !inputText);

            // Add button press animation
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btn.style.transform = '';
            }, 100);
        });
    });

    // Update input handling
    keywordInput.addEventListener('input', () => {
        const inputText = keywordInput.value.trim();
        generateBtn.disabled = !inputText;
        generateBtn.classList.toggle('opacity-50', !inputText);
    });

    async function handleGenerate() {
        const inputText = keywordInput.value.trim();
        if (!inputText) {
            alert("Please enter what you want to create!");
            return;
        }

        // Show loading state
        const buttonText = generateBtn.querySelector('span');
        buttonText.textContent = 'Generating...';
        buttonLoader.classList.remove('hidden');
        generateBtn.disabled = true;
        generateBtn.classList.add('opacity-50');
        generatingIndicator.classList.remove('hidden');

        // Update the tech indicator text
        document.getElementById('selectedTechIndicator').textContent = 
            selectedTechnology ? 
            document.querySelector(`[data-tech="${selectedTechnology}"] .tech-name`).textContent : 
            'HTML/CSS/JavaScript';

        try {
            const response = await fetch('http://localhost:5000/api/code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    inputText,
                    technology: selectedTechnology || 'vanilla' // Default to vanilla if no technology selected
                })
            });

            if (!response.ok) throw new Error('Failed to generate code');
            
            const data = await response.json();
            console.log("Received data:", data);

            if (!data.success || !data.files || !data.folders) {
                throw new Error('Invalid response format');
            }

            // Hide generating indicator
            generatingIndicator.classList.add('hidden');

            // Hide initial view and show code preview view
            document.getElementById('initialView').classList.add('hidden');
            document.getElementById('codePreviewView').classList.remove('hidden');

            // Update file tree and code sections
            updateFileTree(data.folders);
            createCodeSections(data.files);

            // Show download button
            document.getElementById('downloadBtn').classList.remove('hidden');

        } catch (error) {
            console.error("Error:", error);
            alert("Failed to generate code. Please try again!");
        } finally {
            // Reset states
            buttonText.textContent = 'Generate Code';
            buttonLoader.classList.add('hidden');
            generateBtn.disabled = false;
            generateBtn.classList.remove('opacity-50');
            generatingIndicator.classList.add('hidden');
        }
    }

    function updateFileTree(folderStructure) {
        const fileList = document.querySelector('.space-y-1');
        fileList.innerHTML = '';

        // Create main project folder
        const mainFolder = document.createElement('div');
        mainFolder.className = 'folder-container';
        
        const mainFolderButton = document.createElement('button');
        mainFolderButton.className = 'flex items-center w-full text-left px-2 py-1 rounded hover:bg-gray-800 text-gray-300';
        
        const mainArrow = document.createElement('span');
        mainArrow.className = 'inline-block w-4 h-4 mr-1 transform transition-transform duration-200 flex-shrink-0';
        mainArrow.innerHTML = `
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        `;
        
        const mainFolderIcon = document.createElement('span');
        mainFolderIcon.className = 'flex-shrink-0 mr-2';
        mainFolderIcon.innerHTML = `
            <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
            </svg>
        `;

        const mainFolderName = document.createElement('span');
        mainFolderName.className = 'file-name font-medium';
        mainFolderName.textContent = folderStructure.name || 'project';
        
        mainFolderButton.appendChild(mainArrow);
        mainFolderButton.appendChild(mainFolderIcon);
        mainFolderButton.appendChild(mainFolderName);
        
        const mainContent = document.createElement('div');
        mainContent.className = 'folder-content ml-4 mt-1';
        
        // Toggle folder
        mainFolderButton.addEventListener('click', () => {
            mainArrow.classList.toggle('rotate-90');
            mainContent.classList.toggle('hidden');
        });
        
        mainFolder.appendChild(mainFolderButton);
        mainFolder.appendChild(mainContent);
        fileList.appendChild(mainFolder);

        // Render children inside main folder
        if (folderStructure && folderStructure.children) {
            renderFolder(folderStructure.children, mainContent, '');
        }

        // Expand main folder by default
        mainArrow.classList.add('rotate-90');
    }

    function renderFolder(folder, parentElement, path) {
        const items = Object.entries(folder).sort(([, a], [, b]) => {
            if (a.type === b.type) return a.name.localeCompare(b.name);
            return a.type === 'folder' ? -1 : 1;
        });

        items.forEach(([name, item]) => {
            const itemPath = path ? `${path}/${name}` : name;
            
            if (item.type === 'folder') {
                const folderContainer = document.createElement('div');
                folderContainer.className = 'folder-container';
                
                const folderButton = document.createElement('button');
                folderButton.className = 'flex items-center w-full text-left px-2 py-1 rounded hover:bg-gray-800 text-gray-300';
                
                const arrow = document.createElement('span');
                arrow.className = 'inline-block w-4 h-4 mr-1 transform transition-transform duration-200 flex-shrink-0';
                arrow.innerHTML = `
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                `;
                
                const folderIcon = document.createElement('span');
                folderIcon.className = 'flex-shrink-0 mr-2';
                folderIcon.innerHTML = `
                    <svg class="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                    </svg>
                `;

                const folderName = document.createElement('span');
                folderName.className = 'file-name';
                folderName.textContent = name;
                
                folderButton.appendChild(arrow);
                folderButton.appendChild(folderIcon);
                folderButton.appendChild(folderName);
                
                const content = document.createElement('div');
                content.className = 'folder-content ml-4 mt-1';
                
                // Toggle folder
                folderButton.addEventListener('click', () => {
                    arrow.classList.toggle('rotate-90');
                    content.classList.toggle('hidden');
                });
                
                folderContainer.appendChild(folderButton);
                folderContainer.appendChild(content);
                parentElement.appendChild(folderContainer);
                
                if (item.children) {
                    renderFolder(item.children, content, itemPath);
                }
            } else {
                const fileButton = document.createElement('button');
                fileButton.className = 'file-button flex items-center w-full text-left px-2 py-1 rounded hover:bg-gray-800';
                fileButton.onclick = () => showCode(item.id);
                
                const fileIcon = document.createElement('span');
                fileIcon.className = 'flex-shrink-0 mr-2';
                fileIcon.innerHTML = getFileIcon(name);
                
                const fileName = document.createElement('span');
                fileName.className = 'file-name';
                fileName.textContent = name;
                
                fileButton.appendChild(fileIcon);
                fileButton.appendChild(fileName);
                parentElement.appendChild(fileButton);
            }
        });
    }

    // Helper function to get file icon based on extension
    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const iconColor = {
            js: 'text-yellow-400',
            jsx: 'text-blue-400',
            ts: 'text-blue-500',
            tsx: 'text-blue-400',
            css: 'text-blue-600',
            html: 'text-orange-500',
            json: 'text-yellow-300',
            md: 'text-gray-400'
        }[ext] || 'text-gray-400';

        return `
            <svg class="w-4 h-4 ${iconColor}" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z"/>
            </svg>
        `;
    }

    function createCodeSections(files) {
        const codeView = document.getElementById('codeView');
        
        // Clear existing content
        codeView.innerHTML = '';
        
        files.forEach(file => {
            const section = document.createElement('div');
            section.id = `${file.id}Section`;
            section.className = 'hidden h-full';
            
            // Create header with file path
            const header = document.createElement('div');
            header.className = 'file-header bg-gray-800 text-gray-300 text-sm px-4 py-2 border-b border-gray-700';
            header.textContent = file.path;
            
            // Create scrollable container
            const scrollContainer = document.createElement('div');
            scrollContainer.className = 'overflow-auto h-[calc(100%-2.5rem)]';
            
            // Create code content
            const pre = document.createElement('pre');
            pre.className = 'm-0 min-w-full';
            
            const code = document.createElement('code');
            code.id = file.id;
            code.className = `language-${file.language || 'javascript'} text-sm`;
            code.contentEditable = 'true';
            code.spellcheck = false;
            code.textContent = file.code || file.content || '// No content available';
            
            pre.appendChild(code);
            scrollContainer.appendChild(pre);
            
            section.appendChild(header);
            section.appendChild(scrollContainer);
            codeView.appendChild(section);

            // Apply syntax highlighting to this code section
            Prism.highlightElement(code);
        });

        // Add event listeners for code editing
        document.querySelectorAll('code[contenteditable="true"]').forEach(codeElement => {
            // Prevent tab from moving focus
            codeElement.addEventListener('keydown', function(e) {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    document.execCommand('insertText', false, '    ');
                }
            });

            // Re-highlight on input
            codeElement.addEventListener('input', function() {
                Prism.highlightElement(this);
            });
        });

        // Show the first file by default
        const firstSection = document.querySelector('[id$="Section"]');
        if (firstSection) {
            firstSection.classList.remove('hidden');
        }
    }

    // Helper function to escape HTML
    function escapeHtml(text) {
        if (typeof text !== 'string') {
            console.error('Invalid text type:', typeof text);
            return '';
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Add event listeners
    generateBtn.addEventListener('click', handleGenerate);
    keywordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGenerate();
    });
});

function showCode(fileId) {
    // Hide all sections
    document.querySelectorAll('[id$="Section"]').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(`${fileId}Section`);
    if (selectedSection) {
        selectedSection.classList.remove('hidden');
        
        // Add syntax highlighting
        const codeElement = selectedSection.querySelector('code');
        const header = selectedSection.querySelector('.file-header');
        if (codeElement && header) {
            const fileName = header.textContent.trim().split('/').pop();
            const language = fileName.split('.').pop();
            const highlightedCode = highlightCode(codeElement.textContent, language);
            codeElement.innerHTML = highlightedCode;
        }
    }

    // Show copy button
    const copyBtn = document.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.classList.remove('hidden');
    }
}

function toggleView(view) {
    const codeView = document.getElementById('codeView');
    const previewView = document.getElementById('previewView');
    const codeTab = document.getElementById('codeTab');
    const previewTab = document.getElementById('previewTab');
    const previewControls = document.getElementById('previewControls');

    if (view === 'code') {
        codeView.classList.remove('hidden');
        previewView.classList.add('hidden');
        codeTab.classList.add('bg-gray-800');
        previewTab.classList.remove('bg-gray-800');
        previewControls.classList.add('hidden');
    } else {
        codeView.classList.add('hidden');
        previewView.classList.remove('hidden');
        codeTab.classList.remove('bg-gray-800');
        previewTab.classList.add('bg-gray-800');
        previewControls.classList.remove('hidden');
        updatePreview();
    }
}

function openPreviewInNewTab() {
    try {
        const files = collectFiles();
        const htmlContent = generatePreviewContent(files);
        
        if (htmlContent) {
            // Create a data URL instead of a blob URL
            const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
            window.open(dataUrl, '_blank');
        }
    } catch (error) {
        console.error('Error opening preview:', error);
    }
}

function setPreviewDevice(width) {
    const previewFrame = document.getElementById('previewFrame');
    const previewContainer = document.querySelector('.preview-container');
    
    const deviceSizes = {
        'mobile': { width: '375px', height: '667px' },
        'tablet': { width: '768px', height: '1024px' },
        'laptop': { width: '1024px', height: '768px' },
        'desktop': { width: '100%', height: '100%' }
    };
    
    if (deviceSizes[width]) {
        const size = deviceSizes[width];
        previewFrame.style.width = size.width;
        previewFrame.style.height = size.height;
        
        if (width === 'desktop') {
            previewContainer.style.width = '100%';
            previewContainer.style.height = '100%';
            previewFrame.style.width = '100%';
            previewFrame.style.height = '100%';
        } else {
            previewContainer.style.width = 'auto';
            previewContainer.style.height = '100%';
            previewFrame.style.margin = '0 auto';
        }
        
        // Update active state of device buttons
        document.querySelectorAll('.device-btn').forEach(btn => {
            btn.classList.toggle('bg-blue-600', btn.dataset.device === width);
            btn.classList.toggle('bg-gray-700', btn.dataset.device !== width);
        });
    }
}

// Update the updatePreview function
function updatePreview() {
    const previewFrame = document.getElementById('previewFrame');
    const previewError = document.getElementById('previewError');
    
    try {
        // Show loading state
        previewFrame.classList.add('hidden');
        previewError.classList.add('hidden');
        
        // Collect files and generate preview
        const files = collectFiles();
        const htmlContent = generatePreviewContent(files);
        
        if (!htmlContent) {
            throw new Error('No preview content generated');
        }

        // Create data URL for the preview
        const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
        
        // Update iframe
        previewFrame.src = dataUrl;
        previewFrame.onload = () => {
            previewFrame.classList.remove('hidden');
        };

        // Set initial device size
        setPreviewDevice('desktop');

    } catch (error) {
        console.error('Preview error:', error);
        previewFrame.classList.add('hidden');
        previewError.classList.remove('hidden');
        previewError.querySelector('.text-sm').textContent = error.message;
    }
}

// Add image handling to generatePreviewContent
function generatePreviewContent(files) {
    const isVanillaWeb = files['index.html'] && files['style.css'] && files['script.js'];
    const isReactApp = Object.keys(files).some(f => 
        f.endsWith('.jsx') || 
        f === 'App.js' || 
        (f.endsWith('.js') && files[f].includes('React'))
    );
    const isVueApp = Object.keys(files).some(f => f.endsWith('.vue'));
    
    // Convert image files to data URLs
    const imageFiles = {};
    Object.entries(files).forEach(([name, content]) => {
        if (name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
            // For demo, use placeholder images based on file name
            imageFiles[name] = `https://via.placeholder.com/400x300?text=${name}`;
        }
    });
    
    let htmlContent = '';
    
    if (isVanillaWeb) {
        htmlContent = files['index.html'];
        // Replace image sources with data URLs
        Object.entries(imageFiles).forEach(([name, dataUrl]) => {
            htmlContent = htmlContent.replace(
                new RegExp(`(src|href)=["'].*${name}["']`, 'g'),
                `$1="${dataUrl}"`
            );
        });
        // Inject CSS
        if (files['style.css']) {
            const styleTag = `<style>${files['style.css']}</style>`;
            htmlContent = htmlContent.replace('</head>', `${styleTag}</head>`);
        }
        // Inject JavaScript
        if (files['script.js']) {
            const scriptTag = `<script>${files['script.js']}</script>`;
            htmlContent = htmlContent.replace('</body>', `${scriptTag}</body>`);
        }
    } else if (isReactApp) {
        htmlContent = generateReactPreview(files, imageFiles);
    } else if (isVueApp) {
        htmlContent = generateVuePreview(files, imageFiles);
    }
    
    if (!htmlContent) {
        throw new Error('Unable to generate preview. Make sure all required files are present.');
    }
    
    return htmlContent;
}

// Update collectFiles function to handle all file sections
function collectFiles() {
    const files = {};
    const sections = document.querySelectorAll('[id$="Section"]');
    
    sections.forEach(section => {
        const codeElement = section.querySelector('pre code');
        const header = section.querySelector('.file-header');
        
        if (codeElement && header) {
            const filePath = header.textContent.trim();
            const fileName = filePath.split('/').pop();
            // Get the raw text content without Prism's formatting
            const rawContent = codeElement.textContent;
            files[fileName] = rawContent;
            console.log(`Collected file: ${fileName}`, rawContent.slice(0, 100)); // Debug log
        }
    });
    
    console.log('Collected files:', Object.keys(files));
    return files;
}

// Add syntax highlighting function
function highlightCode(code, language) {
    // Add Prism CSS to head if not already present
    if (!document.querySelector('#prism-css')) {
        const prismCss = document.createElement('link');
        prismCss.id = 'prism-css';
        prismCss.rel = 'stylesheet';
        prismCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css';
        document.head.appendChild(prismCss);
    }
    
    // Add Prism JS if not already present
    if (!window.Prism) {
        const prismJs = document.createElement('script');
        prismJs.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js';
        document.body.appendChild(prismJs);
    }
    
    // Wait for Prism to be available
    if (window.Prism) {
        return Prism.highlight(code, Prism.languages[language], language);
    }
    return code;
}

// Add this helper function to check if preview is possible
function canPreview(files) {
    const hasHtml = Object.keys(files).some(f => f.endsWith('.html'));
    const hasReact = Object.keys(files).some(f => 
        f.endsWith('.jsx') || 
        f === 'App.js' || 
        (f.endsWith('.js') && files[f].includes('React'))
    );
    const hasVue = Object.keys(files).some(f => f.endsWith('.vue'));
    
    return hasHtml || hasReact || hasVue;
}

// Update generateReactPreview to handle images
function generateReactPreview(files, imageFiles = {}) {
    // Process components
    const components = {};
    Object.entries(files)
        .filter(([name]) => {
            return (name.endsWith('.jsx') || name.endsWith('.js')) && 
                   !name.includes('config') &&
                   !name.includes('test') &&
                   !name.startsWith('index.') &&
                   name !== 'package.json';
        })
        .forEach(([name, content]) => {
            const componentName = name.replace(/\.(js|jsx)$/, '');
            
            if (content.includes('React') || content.includes('render') || content.includes('return')) {
                // Clean up imports and handle image imports
                let processedContent = content
                    // Replace image imports with URLs
                    .replace(
                        /import\s+(\w+)\s+from\s+['"]\.\.?\/.*\/([\w-]+\.(png|jpg|jpeg|gif|svg|webp))['"];?/g,
                        (_, varName, fileName) => `const ${varName} = "${imageFiles[fileName] || `https://via.placeholder.com/400x300?text=${fileName}`}";`
                    )
                    // Other cleanups...
                    .replace(/import\s+.*?from\s+['"].*?['"];?\n?/g, '')
                    .replace(/import\s+{(.*?)}\s+from\s+['"].*?['"];?\n?/g, '')
                    .replace(/(?:const|let|var)\s+.*?\s*=\s*require\s*\(.*?\);?\n?/g, '')
                    .replace(/require\s*\(.*?\);?\n?/g, '')
                    .replace(/export\s+default\s+/, '')
                    .replace(/export\s+/, '')
                    .replace(/const\s+React\s*=\s*.*?;?\n?/g, '')
                    .replace(/import\.meta\.env\.[A-Z_]+/g, '""')
                    .replace(/^\s*[\r\n]/gm, '');

                // Replace any remaining image paths
                Object.entries(imageFiles).forEach(([name, url]) => {
                    processedContent = processedContent.replace(
                        new RegExp(`(['"]).*${name}(['"])`, 'g'),
                        `$1${url}$2`
                    );
                });

                components[componentName] = processedContent;
            }
        });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Preview</title>
    <script src="https://unpkg.com/react@17/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@17/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/babel-standalone@6/babel.min.js"></script>
    <script src="https://unpkg.com/axios/dist/axios.min.js"></script>
    ${files['package.json']?.includes('react-router') ? 
        '<script src="https://unpkg.com/react-router-dom@5/umd/react-router-dom.min.js"></script>' : ''}
    ${Object.entries(files)
        .filter(([name]) => name.endsWith('.css'))
        .map(([_, content]) => `<style>${content}</style>`)
        .join('\n')}
    <style>
        body { margin: 0; padding: 20px; }
        #root { max-width: 1200px; margin: 0 auto; }
        img { max-width: 100%; height: auto; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel" data-presets="env,react">
        // Global setup
        window.React = React;
        window.ReactDOM = ReactDOM;
        ${files['package.json']?.includes('react-router') ? 
            'window.ReactRouterDOM = ReactRouterDOM;' : ''}

        // Mock environment variables
        window.env = {
            VITE_WEATHER_API_KEY: 'mock-key',
            // Add other environment variables as needed
        };

        // Mock common modules
        const mockModules = {
            classnames: (...args) => args.filter(Boolean).join(' '),
            'styled-components': { default: (tag) => tag },
            '@material-ui/core': { Button: 'button', TextField: 'input' },
            '@mui/material': { Button: 'button', TextField: 'input' },
            axios: {
                get: async (url) => ({
                    data: { 
                        // Mock data based on URL
                        weather: [{ main: 'Clear', description: 'sunny' }],
                        main: { temp: 20, humidity: 50 },
                        name: 'Mock City'
                    }
                })
            }
        };

        // Mock require and import
        window.require = (module) => mockModules[module] || {};
        
        // Define components
        ${Object.entries(components)
            .map(([name, code]) => {
                // Ensure the code is a proper component definition
                if (code.includes('function') || code.includes('=>')) {
                    return code.replace(/import\.meta\.env/g, 'window.env');
                } else {
                    return `function ${name}() { ${code.replace(/import\.meta\.env/g, 'window.env')} }`;
                }
            })
            .join('\n\n')}

        // Create default App if none exists
        ${components['App'] ? '' : `
        function App() {
            return (
                <div className="app">
                    <h1>React Preview</h1>
                    ${Object.keys(components).map(name => 
                        name !== 'App' ? `<${name} />` : ''
                    ).join('\n')}
                </div>
            );
        }`}

        // Render app
        const root = document.getElementById('root');
        ReactDOM.render(
            ${files['package.json']?.includes('react-router') ? 
                '<BrowserRouter><App /></BrowserRouter>' : 
                '<App />'
            },
            root
        );
    </script>
</body>
</html>`;
}

function generateVuePreview(files, imageFiles = {}) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue Preview</title>
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    ${files['package.json']?.includes('vuex') 
        ? '<script src="https://unpkg.com/vuex@4"></script>' 
        : ''}
    ${files['package.json']?.includes('vue-router') 
        ? '<script src="https://unpkg.com/vue-router@4"></script>' 
        : ''}
    ${Object.entries(files)
        .filter(([name]) => name.endsWith('.css'))
        .map(([_, content]) => `<style>${content}</style>`)
        .join('\n')}
</head>
<body>
    <div id="app"></div>
    ${Object.entries(files)
        .filter(([name]) => name.endsWith('.vue'))
        .map(([name, content]) => {
            // Extract template, script, and style from .vue files
            const templateMatch = content.match(/<template>([\s\S]*)<\/template>/);
            const scriptMatch = content.match(/<script>([\s\S]*)<\/script>/);
            const styleMatch = content.match(/<style>([\s\S]*)<\/style>/);
            
            return `
                ${styleMatch ? `<style>${styleMatch[1]}</style>` : ''}
                <script type="module">
                    const ${name.replace('.vue', '')} = {
                        template: \`${templateMatch ? templateMatch[1] : ''}\`,
                        ${scriptMatch ? scriptMatch[1].replace(/export default ?\{/, '').replace(/\}$/, '') : ''}
                    };
                </script>
            `;
        })
        .join('\n')}
    <script type="module">
        const app = Vue.createApp({
            template: '<App/>',
            components: { App }
        });
        app.mount('#app');
    </script>
</body>
</html>`;
}

async function copyCurrentCode() {
    const visibleSection = document.querySelector('[id$="Section"]:not(.hidden)');
    const codeElement = visibleSection.querySelector('code');
    const button = document.querySelector('.copy-btn');

    try {
        await navigator.clipboard.writeText(codeElement.textContent);
        button.classList.add('bg-green-600/50');
        setTimeout(() => button.classList.remove('bg-green-600/50'), 1000);
    } catch (err) {
        console.error('Failed to copy text:', err);
        alert('Failed to copy code');
    }
}

// Update createFolderStructure function
function createFolderStructure(files) {
    // Extract project name from the first file path
    const projectName = files[0].path.split('/')[0];
    
    const root = { 
        name: projectName, 
        type: 'folder', 
        children: {} 
    };

    files.forEach(file => {
        const parts = file.path.split('/');
        let current = root.children;

        parts.forEach((part, index) => {
            if (index === 0) return; // Skip the project name folder as it's already root
            
            if (index === parts.length - 1) {
                // It's a file
                current[part] = { 
                    name: part, 
                    type: 'file', 
                    id: file.id,
                    language: file.language,
                    extension: file.extension,
                    content: file.content
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

// Add download functionality
async function downloadProject() {
    try {
        const zip = new JSZip();
        const files = [];
        
        // Collect all files from code sections
        document.querySelectorAll('[id$="Section"]').forEach(section => {
            const codeElement = section.querySelector('code');
            const header = section.querySelector('.file-header');
            if (!codeElement || !header) return;
            
            const filePath = header.textContent.trim();
            if (filePath) {
                files.push({
                    path: filePath,
                    content: codeElement.textContent
                });
            }
        });

        // Create folder structure
        const folderStructure = {};
        files.forEach(file => {
            const parts = file.path.split('/');
            let current = folderStructure;
            
            // Create folders
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part]) {
                    current[part] = {};
                }
                current = current[part];
            }
            
            // Add file
            const fileName = parts[parts.length - 1];
            current[fileName] = file.content;
        });

        // Add files to zip maintaining folder structure
        function addFolderToZip(folder, path = '') {
            Object.entries(folder).forEach(([name, content]) => {
                const fullPath = path ? `${path}/${name}` : name;
                if (typeof content === 'string') {
                    // It's a file
                    zip.file(fullPath, content);
                } else {
                    // It's a folder
                    Object.entries(content).forEach(([subName, subContent]) => {
                        const subPath = `${fullPath}/${subName}`;
                        if (typeof subContent === 'string') {
                            zip.file(subPath, subContent);
                        } else {
                            addFolderToZip(subContent, fullPath);
                        }
                    });
                }
            });
        }

        addFolderToZip(folderStructure);

        // Generate and download zip
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${Object.keys(folderStructure)[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show success message
        const downloadBtn = document.getElementById('downloadBtn');
        downloadBtn.textContent = 'Downloaded!';
        downloadBtn.classList.add('bg-green-600');
        setTimeout(() => {
            downloadBtn.textContent = 'Download Project Files';
            downloadBtn.classList.remove('bg-green-600');
        }, 2000);

    } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download project files. Please try again.');
    }
}

// Add click handler for download button
document.getElementById('downloadBtn').addEventListener('click', downloadProject);

// Add styles for code highlighting
const codeStyles = document.createElement('style');
codeStyles.textContent = `
    .code-editor pre {
        margin: 0;
        padding: 1rem;
        background: #1e1e1e;
        border-radius: 0.5rem;
        overflow-x: auto;
    }
    .code-editor code {
        font-family: 'Fira Code', monospace;
        font-size: 14px;
        line-height: 1.5;
        tab-size: 4;
    }
    .file-item {
        transition: all 0.2s ease;
    }
    .file-item:hover > button {
        background-color: rgba(75, 85, 99, 0.4);
    }
    .file-item button svg {
        flex-shrink: 0;
    }
`;
document.head.appendChild(codeStyles);

// Add file type icons mapping
const fileIcons = {
    html: `<svg class="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M4 5h16v16H4V5zm2 4h12M4 9l8 8l8-8"/>
    </svg>`,
    css: `<svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm8 4c-3 0-4 2.5-4 4s1 4 4 4 4-2.5 4-4-1-4-4-4z"/>
    </svg>`,
    js: `<svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M3 3h18v18H3V3zm4.5 4.5h3v6a3 3 0 0 1-3 3m7.5-9h3a2.5 2.5 0 0 1 0 5H15v4"/>
    </svg>`,
    jsx: `<svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M12 14.9a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8zm8.7-3.9c0-.5 0-.9-.1-1.3-.3-1.3-1.2-2.4-2.5-3.2-.6-.4-1.3-.7-2.1-.9-.8-.3-1.6-.5-2.5-.6-.9-.1-1.9-.2-2.9-.3-1.5-.1-2.7-.2-3.5-.4-.4-.1-.7-.2-1-.4-.3-.2-.4-.5-.4-.9 0-.3.1-.6.3-.8.2-.2.5-.4.9-.5.4-.1.9-.2 1.5-.3.6-.1 1.3-.1 2.1-.1 1.6 0 2.8.2 3.5.5.7.3 1.1.9 1.2 1.7h4c-.1-1.5-.5-2.7-1.2-3.6-.7-.9-1.7-1.6-3-2-.6-.2-1.3-.3-2-.4-.7-.1-1.5-.2-2.3-.2-.8 0-1.6 0-2.4.1-.8.1-1.6.2-2.3.4-.7.2-1.4.5-2 .8-1.1.7-1.9 1.6-2.4 2.7-.3.6-.4 1.3-.5 2v1c0 .9.2 1.7.6 2.4.4.7.9 1.3 1.6 1.8.7.5 1.5.8 2.3 1.1.8.3 1.7.5 2.6.6.9.1 1.8.2 2.7.3 1.6.1 2.9.3 3.9.5.5.1.8.3 1.1.5.3.2.4.5.4.9 0 .3-.1.6-.3.9-.2.3-.5.5-1 .6-.4.2-1 .3-1.6.3-.7.1-1.4.1-2.3.1-1.7 0-3-.2-3.8-.6-.8-.4-1.3-1.1-1.3-2h-4c0 1.3.3 2.4 1 3.3.7.9 1.6 1.6 2.8 2.1.6.3 1.2.5 1.9.6.7.1 1.4.2 2.2.3.8 0 1.5.1 2.3.1.8 0 1.6-.1 2.3-.2.8-.1 1.5-.2 2.2-.4.7-.2 1.3-.4 1.9-.7 1.1-.6 2-1.3 2.6-2.2.6-.9.9-1.9.9-3.1"/>
    </svg>`,
    vue: `<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M19.027 3l-7.027 12.013L4.973 3H0l12 20.756L24 3z"/>
    </svg>`,
    json: `<svg class="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm4 4v4c0 1.1.9 2 2 2s2 .9 2 2v4m4-12v4c0 1.1-.9 2-2 2s-2 .9-2 2v4"/>
    </svg>`,
    // Default folder icon
    folder: `<svg class="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/>
    </svg>`,
    // Default file icon
    default: `<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <path d="M13 2v7h7"/>
    </svg>`
};

// Update createCodeSection to include file icons
function createCodeSection(file) {
    const extension = file.path.split('.').pop();
    const icon = fileIcons[extension] || fileIcons.default;
    
    return `
        <div id="${file.id}Section" class="hidden">
            <div class="file-header text-sm text-gray-400 mb-2 flex items-center gap-2">
                ${icon}
                <span>${file.path}</span>
            </div>
            <pre class="code-editor"><code class="language-${file.language}">${file.content}</code></pre>
        </div>
    `;
}

// Update file list creation
function createFileList(files) {
    const fileList = document.getElementById('fileList');
    if (!fileList) return;

    function createFileItem(file, indent = 0) {
        const extension = file.name.split('.').pop();
        const icon = file.type === 'folder' ? fileIcons.folder : (fileIcons[extension] || fileIcons.default);
        
        return `
            <div class="file-item" style="padding-left: ${indent * 1.5}rem">
                <button 
                    onclick="${file.type === 'file' ? `showCode('${file.id}')` : ''}"
                    class="w-full text-left px-2 py-1 rounded hover:bg-gray-700 flex items-center gap-2 ${file.type === 'file' ? 'cursor-pointer' : 'cursor-default'}"
                >
                    ${icon}
                    <span class="text-sm ${file.type === 'folder' ? 'font-semibold text-gray-300' : 'text-gray-400'}">${file.name}</span>
                </button>
                ${file.type === 'folder' ? Object.values(file.children).map(child => createFileItem(child, indent + 1)).join('') : ''}
            </div>
        `;
    }

    fileList.innerHTML = Object.values(files.children)
        .map(file => createFileItem(file))
        .join('');
}
