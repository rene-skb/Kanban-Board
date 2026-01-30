// Rene & Scott's Kanban Board
// Data loads from tasks.json (repo) and syncs to localStorage

let tasks = [];
let editingTaskId = null;
const TASKS_URL = 'tasks.json';

// Load tasks - first try remote JSON, fall back to localStorage
async function loadTasks() {
    try {
        // Try to load from tasks.json (the repo source of truth)
        const response = await fetch(TASKS_URL + '?t=' + Date.now()); // cache bust
        if (response.ok) {
            const data = await response.json();
            tasks = data.tasks || [];
            console.log('✅ Loaded tasks from repo:', tasks.length, 'tasks');
            
            // Also save to localStorage as backup
            saveTasks();
        } else {
            throw new Error('Failed to fetch');
        }
    } catch (error) {
        console.log('⚠️ Could not load from repo, using localStorage');
        // Fall back to localStorage
        const saved = localStorage.getItem('rene-kanban-tasks');
        if (saved) {
            tasks = JSON.parse(saved);
        } else {
            // Default starter task
            tasks = [
                {
                    id: Date.now(),
                    title: "Welcome to our Kanban! 🎉",
                    description: "Drag cards between columns. Click to edit.",
                    status: "todo",
                    assignee: "both",
                    created: new Date().toISOString()
                }
            ];
        }
    }
    renderTasks();
    updateLastUpdated();
}

// Save tasks to localStorage (local persistence)
function saveTasks() {
    localStorage.setItem('rene-kanban-tasks', JSON.stringify(tasks));
}

// Update the "last updated" indicator
function updateLastUpdated() {
    const indicator = document.getElementById('sync-status');
    if (indicator) {
        indicator.textContent = 'Last synced: ' + new Date().toLocaleTimeString();
    }
}

// Render all tasks
function renderTasks() {
    document.getElementById('todo').innerHTML = '';
    document.getElementById('in-progress').innerHTML = '';
    document.getElementById('done').innerHTML = '';

    tasks.forEach(task => {
        const card = createTaskCard(task);
        const column = document.getElementById(task.status);
        if (column) {
            column.appendChild(card);
        }
    });
}

// Create a task card element
function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.id = task.id;
    card.dataset.assignee = task.assignee;

    const assigneeLabel = {
        'rene': '🤖 Rene',
        'scott': '👨‍💻 Scott',
        'both': '🤝 Both'
    };

    card.innerHTML = `
        <h3>${escapeHtml(task.title)}</h3>
        ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}
        <span class="assignee">${assigneeLabel[task.assignee] || '🤝 Both'}</span>
    `;

    // Click to edit
    card.addEventListener('click', () => openModal(task));

    // Drag events
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);

    return card;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Modal handling
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const taskTitleInput = document.getElementById('taskTitle');
const taskDescInput = document.getElementById('taskDesc');
const taskAssigneeSelect = document.getElementById('taskAssignee');
const deleteBtn = document.getElementById('deleteTask');

function openModal(task = null) {
    if (task) {
        editingTaskId = task.id;
        modalTitle.textContent = 'Edit Task';
        taskTitleInput.value = task.title;
        taskDescInput.value = task.description || '';
        taskAssigneeSelect.value = task.assignee;
        deleteBtn.classList.remove('hidden');
    } else {
        editingTaskId = null;
        modalTitle.textContent = 'Add Task';
        taskTitleInput.value = '';
        taskDescInput.value = '';
        taskAssigneeSelect.value = 'rene';
        deleteBtn.classList.add('hidden');
    }
    modal.classList.remove('hidden');
    taskTitleInput.focus();
}

function closeModal() {
    modal.classList.add('hidden');
    editingTaskId = null;
}

// Save task
document.getElementById('saveTask').addEventListener('click', () => {
    const title = taskTitleInput.value.trim();
    if (!title) return;

    if (editingTaskId) {
        // Update existing
        const task = tasks.find(t => t.id === editingTaskId);
        if (task) {
            task.title = title;
            task.description = taskDescInput.value.trim();
            task.assignee = taskAssigneeSelect.value;
        }
    } else {
        // Create new
        tasks.push({
            id: Date.now(),
            title: title,
            description: taskDescInput.value.trim(),
            status: 'todo',
            assignee: taskAssigneeSelect.value,
            created: new Date().toISOString()
        });
    }

    saveTasks();
    renderTasks();
    closeModal();
    showSyncReminder();
});

// Show reminder that changes are local until synced
function showSyncReminder() {
    const indicator = document.getElementById('sync-status');
    if (indicator) {
        indicator.textContent = '⚠️ Local changes - ask Rene to sync!';
        indicator.style.color = '#fbbf24';
    }
}

// Cancel
document.getElementById('cancelTask').addEventListener('click', closeModal);

// Delete
document.getElementById('deleteTask').addEventListener('click', () => {
    if (editingTaskId && confirm('Delete this task?')) {
        tasks = tasks.filter(t => t.id !== editingTaskId);
        saveTasks();
        renderTasks();
        closeModal();
        showSyncReminder();
    }
});

// Add task button
document.getElementById('addTaskBtn').addEventListener('click', () => openModal());

// Close modal on outside click
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'n' && !modal.classList.contains('hidden') === false) {
        e.preventDefault();
        openModal();
    }
});

// Drag and Drop
let draggedCard = null;

function handleDragStart(e) {
    draggedCard = e.target;
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.column').forEach(col => {
        col.classList.remove('drag-over');
    });
}

// Column drag events
document.querySelectorAll('.column').forEach(column => {
    column.addEventListener('dragover', (e) => {
        e.preventDefault();
        column.classList.add('drag-over');
    });

    column.addEventListener('dragleave', () => {
        column.classList.remove('drag-over');
    });

    column.addEventListener('drop', (e) => {
        e.preventDefault();
        column.classList.remove('drag-over');

        if (draggedCard) {
            const taskId = parseInt(draggedCard.dataset.id);
            const newStatus = column.dataset.status;
            
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.status = newStatus;
                saveTasks();
                renderTasks();
                showSyncReminder();
            }
        }
    });
});

// Refresh button - reload from repo
document.getElementById('refreshBtn')?.addEventListener('click', () => {
    loadTasks();
});

// Export button - copy tasks to clipboard for sharing with Rene
document.getElementById('exportBtn')?.addEventListener('click', async () => {
    const exportData = JSON.stringify({
        lastUpdated: new Date().toISOString(),
        tasks: tasks
    }, null, 2);
    
    try {
        await navigator.clipboard.writeText(exportData);
        const btn = document.getElementById('exportBtn');
        const original = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => btn.textContent = original, 2000);
    } catch (err) {
        // Fallback for older browsers
        prompt('Copy this and send to Rene:', exportData);
    }
});

// Initialize
loadTasks();

// Export tasks as JSON (for Rene to sync to repo)
window.exportTasks = () => {
    return JSON.stringify({
        lastUpdated: new Date().toISOString(),
        tasks: tasks
    }, null, 2);
};

window.importTasks = (json) => {
    const data = JSON.parse(json);
    tasks = data.tasks || data;
    saveTasks();
    renderTasks();
};

// Copy export to clipboard
window.copyTasksToClipboard = () => {
    navigator.clipboard.writeText(window.exportTasks());
    alert('Tasks copied! Send to Rene to sync.');
};
