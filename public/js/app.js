// DOM Elements
const userText = document.getElementById('user-text');
const processBtn = document.getElementById('process-btn');
const textResult = document.getElementById('text-result');
const newTaskInput = document.getElementById('new-task');
const addTaskBtn = document.getElementById('add-task-btn');
const taskResponse = document.getElementById('task-response');
const serverStatus = document.getElementById('server-status');
const apiStatus = document.getElementById('api-status');
const uptime = document.getElementById('uptime');
const requests = document.getElementById('requests');
const serverConsole = document.getElementById('server-console');
const portDisplay = document.getElementById('port-display');

// Application state
let requestCount = 0;
let startTime = Date.now();

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set port display (would normally come from server config)
    portDisplay.textContent = window.location.port || '3000';
    
    // Check server status
    checkServerStatus();
    
    // Check API status
    checkApiStatus();
    
    // Start uptime counter
    updateUptime();
    setInterval(updateUptime, 1000);
    
    // Add event listeners
    processBtn.addEventListener('click', processTextOnServer);
    addTaskBtn.addEventListener('click', addTaskToServer);
    newTaskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTaskToServer();
        }
    });
    
    // Add sample console messages
    addConsoleMessage('Application initialized');
    addConsoleMessage('Ready for user interaction');
});

// Check server status
async function checkServerStatus() {
    serverStatus.innerHTML = '<span class="loading"></span>Checking...';
    
    try {
        const response = await fetch('/');
        if (response.ok) {
            serverStatus.innerHTML = '<span class="success">Online</span>';
            addConsoleMessage('Server status: Online');
        } else {
            serverStatus.innerHTML = '<span class="error">Error</span>';
            addConsoleMessage('Server status: Error - ' + response.status);
        }
    } catch (error) {
        serverStatus.innerHTML = '<span class="error">Offline</span>';
        addConsoleMessage('Server status: Offline - ' + error.message);
    }
}

// Check API status
async function checkApiStatus() {
    apiStatus.innerHTML = '<span class="loading"></span>Checking...';
    
    try {
        const response = await fetch('/api-docs');
        if (response.ok) {
            const data = await response.json();
            apiStatus.innerHTML = `<span class="success">${data.endpoints.length} endpoints</span>`;
            addConsoleMessage(`API status: ${data.endpoints.length} endpoints available`);
        } else {
            apiStatus.innerHTML = '<span class="error">Unavailable</span>';
            addConsoleMessage('API status: Unavailable');
        }
    } catch (error) {
        apiStatus.innerHTML = '<span class="error">Offline</span>';
        addConsoleMessage('API status: Offline - ' + error.message);
    }
}

// Update uptime counter
function updateUptime() {
    const elapsed = Date.now() - startTime;
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
    
    uptime.textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Add message to console
function addConsoleMessage(message) {
    const consoleLine = document.createElement('div');
    consoleLine.className = 'console-line';
    consoleLine.textContent = message;
    serverConsole.appendChild(consoleLine);
    serverConsole.scrollTop = serverConsole.scrollHeight;
}

// Process text on server
async function processTextOnServer() {
    const text = userText.value.trim();
    
    if (!text) {
        textResult.innerHTML = '<p class="error">Please enter some text to process.</p>';
        return;
    }
    
    // Show loading state
    processBtn.innerHTML = '<span class="loading"></span>Processing...';
    processBtn.disabled = true;
    
    try {
        requestCount++;
        requests.textContent = requestCount;
        
        const response = await fetch('/api/process-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text })
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }
        
        const data = await response.json();
        
        // Display results
        textResult.innerHTML = `
            <p><strong>Original Text:</strong> ${data.originalText.substring(0, 80)}${data.originalText.length > 80 ? '...' : ''}</p>
            <p><strong>Processed Text (Uppercase):</strong> ${data.processedText.substring(0, 80)}${data.processedText.length > 80 ? '...' : ''}</p>
            <p><strong>Reversed Text:</strong> ${data.reversedText.substring(0, 80)}${data.reversedText.length > 80 ? '...' : ''}</p>
            <hr>
            <p><strong>Statistics:</strong></p>
            <ul>
                <li><strong>Characters:</strong> ${data.statistics.characters}</li>
                <li><strong>Words:</strong> ${data.statistics.words}</li>
                <li><strong>Sentences:</strong> ${data.statistics.sentences}</li>
                <li><strong>Estimated Reading Time:</strong> ${data.statistics.readingTime} minute${data.statistics.readingTime !== 1 ? 's' : ''}</li>
            </ul>
        `;
        
        addConsoleMessage(`Text processed: ${data.statistics.words} words, ${data.statistics.characters} characters`);
        
    } catch (error) {
        textResult.innerHTML = `<p class="error">Error processing text: ${error.message}</p>`;
        addConsoleMessage(`Error: ${error.message}`);
    } finally {
        // Reset button state
        processBtn.innerHTML = '<i class="fas fa-cogs"></i> Process on Server';
        processBtn.disabled = false;
    }
}

// Add task to server
async function addTaskToServer() {
    const taskText = newTaskInput.value.trim();
    
    if (!taskText) {
        taskResponse.innerHTML = '<p class="error">Please enter a task description.</p>';
        return;
    }
    
    // Show loading state
    addTaskBtn.innerHTML = '<span class="loading"></span>Adding...';
    addTaskBtn.disabled = true;
    
    try {
        requestCount++;
        requests.textContent = requestCount;
        
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ task: taskText })
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }
        
        const data = await response.json();
        
        // Display response
        const taskDate = new Date(data.task.createdAt).toLocaleTimeString();
        taskResponse.innerHTML = `
            <div class="task-item">
                <div>
                    <strong>${data.task.text}</strong><br>
                    <small>Added at ${taskDate}</small>
                </div>
                <div>
                    <span class="success">✓</span>
                </div>
            </div>
            <p class="success">${data.message} (ID: ${data.task.id})</p>
        `;
        
        // Clear input
        newTaskInput.value = '';
        
        addConsoleMessage(`Task added: "${taskText.substring(0, 30)}${taskText.length > 30 ? '...' : ''}"`);
        
    } catch (error) {
        taskResponse.innerHTML = `<p class="error">Error adding task: ${error.message}</p>`;
        addConsoleMessage(`Error: ${error.message}`);
    } finally {
        // Reset button state
        addTaskBtn.innerHTML = '<i class="fas fa-plus"></i> Add Task to Server';
        addTaskBtn.disabled = false;
    }
}