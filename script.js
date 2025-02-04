document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const buttonLoader = document.getElementById('buttonLoader');
    const keywordInput = document.getElementById('keywordInput');
    const fileList = document.querySelector('.space-y-1');

    // Initial setup
    showCode('htmlCode');
    toggleView('code');

    // Event listeners
    generateBtn.addEventListener('click', handleGenerate);
    keywordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleGenerate();
    });

    async function handleGenerate() {
        const inputText = keywordInput.value.trim();
        if (!inputText) {
            alert("Please enter what you want to create!");
            return;
        }

        // Show loading state in button
        const buttonText = generateBtn.querySelector('span');
        buttonText.textContent = 'Generating...';
        buttonLoader.classList.remove('hidden');
        generateBtn.disabled = true;
        generateBtn.classList.add('opacity-50');

        try {
            const response = await fetch('http://localhost:5000/api/code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ inputText })
            });

            if (!response.ok) throw new Error('Failed to generate code');
            
            const data = await response.json();
            console.log("Received data:", data);

            if (!data.success || !data.files || !data.folders) {
                throw new Error('Invalid response format');
            }

            // Clear existing file tree and code sections
            fileList.innerHTML = '';
            document.getElementById('codeView').innerHTML = '';
            
            // Update file tree and code sections
            updateFileTree(data.folders);
            createCodeSections(data.files);

            // Show first file if available
            if (data.files && data.files.length > 0) {
                const firstFile = data.files[0];
                if (firstFile && firstFile.id) {
                    showCode(firstFile.id);
                }
            }

            // Show copy button
            const copyBtn = document.querySelector('.copy-btn');
            if (copyBtn) {
                copyBtn.classList.remove('hidden');
            }

            // Apply syntax highlighting
            Prism.highlightAll();

        } catch (error) {
            console.error("Error:", error);
            alert("Failed to generate code. Please try again!");
        } finally {
            // Reset button state
            buttonText.textContent = 'Generate Code';
            buttonLoader.classList.add('hidden');
            generateBtn.disabled = false;
            generateBtn.classList.remove('opacity-50');
        }
    }

    function updateFileTree(folderStructure) {
        fileList.innerHTML = '';
        if (folderStructure && folderStructure.children) {
            renderFolder(folderStructure.children, fileList, '');
        }
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
                folderContainer.appendChild(folderButton);
                
                const folderContent = document.createElement('div');
                folderContent.className = 'ml-4 hidden';
                folderContainer.appendChild(folderContent);
                
                folderButton.addEventListener('click', () => {
                    arrow.classList.toggle('rotate-90');
                    folderContent.classList.toggle('hidden');
                });
                
                parentElement.appendChild(folderContainer);
                renderFolder(item.children, folderContent, itemPath);
            } else {
                const fileButton = document.createElement('button');
                fileButton.className = 'file-button flex items-center w-full text-left px-2 py-1 rounded hover:bg-gray-800';
                fileButton.onclick = () => showCode(item.id);
                
                const iconColor = getFileIconColor(item.extension);
                
                // Create a container for file button content
                const fileButtonContent = document.createElement('div');
                fileButtonContent.className = 'file-button-content w-full';
                
                // Add icon and filename
                fileButtonContent.innerHTML = `
                    <span class="mr-2 flex-shrink-0 ${iconColor}">
                        ${getFileIcon(item.extension)}
                    </span>
                    <span class="file-name" title="${name}">${name}</span>
                `;
                
                fileButton.appendChild(fileButtonContent);
                parentElement.appendChild(fileButton);
            }
        });
    }

    function getFileIcon(extension) {
        const icons = {
            html: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.5 4.5l.405 16.195L12 22.5l7.095-1.805L19.5 4.5h-15zm11.61 13.635L12 19.5l-4.11-1.365L7.725 15h1.995l.075 1.5L12 17.25l2.205-.75.15-2.7h-4.71l-.15-2.025 5.01-.015.105-2.01h-5.37l-.09-1.95h5.55l.075-1.95H7.725L7.8 8.775l8.31.015-.3 9.345z" fill="currentColor"/>
                </svg>`,
            css: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.5 4.5l.405 16.195L12 22.5l7.095-1.805L19.5 4.5h-15zm11.61 13.635L12 19.5l-4.11-1.365-.165-2.1h1.995l.075 1.05 2.205.6 2.205-.6.15-2.55h-7.2l-.75-8.4h9.3l-.255 3.3h-6.54l.15 2.25h6.195l-.405 5.85z" fill="currentColor"/>
                </svg>`,
            js: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 3h18v18H3V3zm16.5 16.5V6h-15v13.5h15zm-7.65-3v-1.5a1.5 1.5 0 00-3 0V15h1.5v-1.5a.75.75 0 111.5 0v3a1.5 1.5 0 01-3 0V15h1.5v1.5a.75.75 0 101.5 0zm5.25-4.5h-1.5V15a.75.75 0 11-1.5 0v-3h-1.5v3a2.25 2.25 0 104.5 0v-3z" fill="currentColor"/>
                </svg>`,
            jsx: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 13.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" fill="currentColor"/>
                    <path d="M12 22.5c-2.786 0-5.33-.456-7.324-1.366-1.993-.91-3.176-2.147-3.176-3.634 0-1.487 1.183-2.724 3.176-3.634C6.67 12.956 9.214 12.5 12 12.5c2.786 0 5.33.456 7.324 1.366 1.993.91 3.176 2.147 3.176 3.634 0 1.487-1.183 2.724-3.176 3.634C17.33 22.044 14.786 22.5 12 22.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M6.5 8.5c-2.786 0-5.33-.456-7.324-1.366C-2.817 6.224-4 4.987-4 3.5c0-1.487 1.183-2.724 3.176-3.634C1.17.956 3.714.5 6.5.5c2.786 0 5.33.456 7.324 1.366C15.817 2.776 17 4.013 17 5.5c0 1.487-1.183 2.724-3.176 3.634C11.83 10.044 9.286 10.5 6.5 10.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17.5 8.5c-2.786 0-5.33-.456-7.324-1.366C8.183 6.224 7 4.987 7 3.5c0-1.487 1.183-2.724 3.176-3.634C12.17.956 14.714.5 17.5.5c2.786 0 5.33.456 7.324 1.366C26.817 2.776 28 4.013 28 5.5c0 1.487-1.183 2.724-3.176 3.634C22.83 10.044 20.286 10.5 17.5 10.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>`,
            json: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 17.5v1a1.5 1.5 0 001.5 1.5h13a1.5 1.5 0 001.5-1.5v-1m-16 0v-11A1.5 1.5 0 016.5 5h11A1.5 1.5 0 0119 6.5v11m-15 0h15m0 0l-3-3m3 3l-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>`,
            md: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14H7v-7h3v7zm4-7h3v7h-3v-7z" fill="currentColor"/>
                </svg>`,
            py: 'text-green-500',
            java: 'text-red-400',
            php: 'text-purple-500',
            rb: 'text-red-500',
            go: 'text-blue-300',
            rs: 'text-orange-500',
            vue: 'text-green-400',
            svelte: 'text-red-500',
            scss: 'text-pink-400',
            less: 'text-blue-300',
            sql: 'text-yellow-300',
            graphql: 'text-pink-500',
            default: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>`
        };
        return icons[extension] || icons.default;
    }

    function getFileIconColor(extension) {
        const colors = {
            html: 'text-orange-400',
            css: 'text-blue-400',
            js: 'text-yellow-400',
            jsx: 'text-blue-500',
            ts: 'text-blue-600',
            tsx: 'text-blue-500',
            json: 'text-green-400',
            md: 'text-purple-400',
            py: 'text-green-500',
            java: 'text-red-400',
            php: 'text-purple-500',
            rb: 'text-red-500',
            go: 'text-blue-300',
            rs: 'text-orange-500',
            vue: 'text-green-400',
            svelte: 'text-red-500',
            scss: 'text-pink-400',
            less: 'text-blue-300',
            sql: 'text-yellow-300',
            graphql: 'text-pink-500'
        };
        return colors[extension] || 'text-gray-400';
    }

    function createCodeSections(files) {
        const codeView = document.getElementById('codeView');
        
        // Remove existing code sections
        document.querySelectorAll('[id$="Section"]').forEach(el => el.remove());
        
        // Create new code sections for each file
        files.forEach(file => {
            const section = document.createElement('div');
            section.id = `${file.id}Section`;
            section.className = 'hidden h-full overflow-auto';
            
            section.innerHTML = `
                <pre class="m-0 h-full"><code id="${file.id}" class="language-${file.language} text-sm">${escapeHtml(file.code)}</code></pre>
            `;
            
            codeView.appendChild(section);
        });
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});

function showCode(codeId) {
    try {
        // Hide all code sections
        document.querySelectorAll('[id$="Section"]').forEach(section => {
            section.classList.add('hidden');
        });

        // Show selected section
        const selectedSection = document.getElementById(`${codeId}Section`);
        if (!selectedSection) {
            console.error(`Section not found: ${codeId}Section`);
            return;
        }
        selectedSection.classList.remove('hidden');

        // Update active state of file buttons
        document.querySelectorAll('.file-button').forEach(btn => {
            btn.classList.remove('bg-gray-800');
        });

        const activeButton = document.querySelector(`[onclick="showCode('${codeId}')"]`);
        if (activeButton) {
            activeButton.classList.add('bg-gray-800');
        }

        // Apply syntax highlighting to visible code
        const codeElement = document.getElementById(codeId);
        if (codeElement) {
            Prism.highlightElement(codeElement);
        }
    } catch (error) {
        console.error('Error in showCode:', error);
    }
}

function toggleView(view) {
    const codeView = document.getElementById('codeView');
    const previewView = document.getElementById('previewView');
    const codeTab = document.getElementById('codeTab');
    const previewTab = document.getElementById('previewTab');

    if (view === 'code') {
        codeView.classList.remove('hidden');
        previewView.classList.add('hidden');
        codeTab.classList.add('bg-gray-800');
        previewTab.classList.remove('bg-gray-800');
    } else {
        codeView.classList.add('hidden');
        previewView.classList.remove('hidden');
        codeTab.classList.remove('bg-gray-800');
        previewTab.classList.add('bg-gray-800');
        updatePreview();
    }
}

async function updatePreview() {
    const previewFrame = document.getElementById('previewFrame');
    const previewError = document.getElementById('previewError');
    const iframeDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;

    try {
        // Get all the code
        const allCode = getAllComponentCode();

        // Create the preview HTML
        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>React Preview</title>
                
                <!-- React -->
                <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
                <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
                
                <!-- React Router (Fixed) -->
                <script crossorigin src="https://unpkg.com/history@5.3.0/umd/history.development.js"></script>
                <script crossorigin src="https://unpkg.com/@remix-run/router@1.15.3/dist/router.umd.js"></script>
                <script crossorigin src="https://unpkg.com/react-router@6.22.3/dist/umd/react-router.development.js"></script>
                <script crossorigin src="https://unpkg.com/react-router-dom@6.22.3/dist/umd/react-router-dom.development.js"></script>
                
                <!-- Babel -->
                <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                
                <!-- Tailwind CSS -->
                <script src="https://cdn.tailwindcss.com"></script>

                <style>
                    body { margin: 0; padding: 0; }
                    #root { height: 100vh; }
                    .error { color: red; padding: 20px; }
                </style>
            </head>
            <body>
                <div id="root"></div>
                
                <script type="text/babel">
                    try {
                        // Import React Router components (Fixed)
                        const {
                            HashRouter,
                            Routes,
                            Route,
                            Link,
                            Outlet,
                            useNavigate,
                            useLocation
                        } = ReactRouterDOM;

                        // Error Boundary Component
                        class ErrorBoundary extends React.Component {
                            constructor(props) {
                                super(props);
                                this.state = { hasError: false, error: null };
                            }

                            static getDerivedStateFromError(error) {
                                return { hasError: true, error };
                            }

                            componentDidCatch(error, errorInfo) {
                                console.error('Error caught by boundary:', error, errorInfo);
                            }

                            render() {
                                if (this.state.hasError) {
                                    return (
                                        <div className="error">
                                            <h2>Something went wrong:</h2>
                                            <pre>{this.state.error.toString()}</pre>
                                        </div>
                                    );
                                }
                                return this.props.children;
                            }
                        }

                        // Simple state management
                        const globalState = {
                            data: {},
                            listeners: new Set(),
                            
                            getState() {
                                return this.data;
                            },
                            
                            setState(newData) {
                                this.data = { ...this.data, ...newData };
                                this.listeners.forEach(listener => listener(this.data));
                            },
                            
                            subscribe(listener) {
                                this.listeners.add(listener);
                                return () => this.listeners.delete(listener);
                            }
                        };

                        function useGlobalState(selector) {
                            const [state, setState] = React.useState(() => 
                                selector ? selector(globalState.getState()) : globalState.getState()
                            );
                            
                            React.useEffect(() => {
                                return globalState.subscribe(() => {
                                    const newState = selector ? selector(globalState.getState()) : globalState.getState();
                                    setState(newState);
                                });
                            }, [selector]);
                            
                            return state;
                        }

                        // Make it available globally
                        window.useGlobalState = useGlobalState;
                        window.globalState = globalState;

                        // Add all component code
                        ${allCode}

                        // Render the app with error boundary
                        const root = ReactDOM.createRoot(document.getElementById('root'));
                        root.render(
                            <React.StrictMode>
                                <ErrorBoundary>
                                    <HashRouter>
                                        <App />
                                    </HashRouter>
                                </ErrorBoundary>
                            </React.StrictMode>
                        );
                    } catch (error) {
                        document.getElementById('root').innerHTML = \`
                            <div class="error">
                                <h2>Error in Preview:</h2>
                                <pre>\${error.toString()}</pre>
                            </div>
                        \`;
                        console.error('Preview Error:', error);
                    }
                </script>
            </body>
            </html>
        `);
        iframeDoc.close();

        // Hide error display if successful
        previewError.classList.add('hidden');

    } catch (error) {
        // Show error in error display
        previewError.classList.remove('hidden');
        previewError.innerHTML = `
            <h2 class="text-lg font-bold mb-2">Preview Error:</h2>
            <pre class="whitespace-pre-wrap">${error.toString()}</pre>
        `;
        console.error('Preview Error:', error);
    }
}

// Helper function to get all component code
function getAllComponentCode() {
    const filesByType = {
        store: [],      // Store files first
        utils: [],      // Utility files
        components: [], // Then components
        pages: [],      // Then pages
        app: [],        // App.jsx last
        main: []        // main.jsx if exists
    };

    // Get all code sections and organize them
    document.querySelectorAll('[id$="Section"]').forEach(section => {
        const codeElement = section.querySelector('code');
        if (!codeElement) return;

        const code = codeElement.textContent;
        const sectionId = section.id;

        // Skip non-JS/JSX files
        if (!code || (!sectionId.endsWith('.jsx') && !sectionId.endsWith('.js'))) {
            return;
        }

        // Categorize files
        if (sectionId.includes('/store/')) {
            filesByType.store.push(code);
        } else if (sectionId.includes('/utils/')) {
            filesByType.utils.push(code);
        } else if (sectionId.includes('/components/')) {
            filesByType.components.push(code);
        } else if (sectionId.includes('/pages/')) {
            filesByType.pages.push(code);
        } else if (sectionId.includes('App.jsx')) {
            filesByType.app.push(code);
        } else if (sectionId.includes('main.jsx')) {
            filesByType.main.push(code);
        }
    });

    // Add default components if they don't exist
    if (filesByType.pages.length === 0) {
        // Add default Home component
        filesByType.pages.push(`
            function Home() {
                return (
                    <div className="p-4">
                        <h1 className="text-2xl font-bold mb-4">Home Page</h1>
                        <p>Welcome to the home page!</p>
                    </div>
                );
            }
        `);

        // Add default Profile component
        filesByType.pages.push(`
            function Profile() {
                return (
                    <div className="p-4">
                        <h1 className="text-2xl font-bold mb-4">Profile Page</h1>
                        <p>This is your profile page.</p>
                    </div>
                );
            }
        `);
    }

    // Add default App component if it doesn't exist
    if (filesByType.app.length === 0) {
        filesByType.app.push(`
            function App() {
                return (
                    <div className="min-h-screen bg-gray-100">
                        <nav className="bg-white shadow">
                            <div className="max-w-7xl mx-auto px-4">
                                <div className="flex justify-between h-16">
                                    <div className="flex">
                                        <Link to="/" className="flex items-center px-2 py-2 text-gray-700 hover:text-gray-900">
                                            Home
                                        </Link>
                                        <Link to="/profile" className="flex items-center px-2 py-2 text-gray-700 hover:text-gray-900">
                                            Profile
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </nav>
                        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/profile" element={<Profile />} />
                            </Routes>
                        </div>
                    </div>
                );
            }
        `);
    }

    // Combine all code in the correct order
    return [
        ...filesByType.store,
        ...filesByType.utils,
        ...filesByType.components,
        ...filesByType.pages,  // Pages must come before App
        ...filesByType.app,    // App uses components from pages
        ...filesByType.main
    ].join('\n\n');
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
