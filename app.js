// Rene & Scott's Kanban Board
// Data stored in localStorage (we'll sync to GitHub later)

let tasks = [];
let editingTaskId = null;

// Load tasks from localStorage
function loadTasks() {
    const saved = localStorage.getItem('rene-kanban-tasks');
    if (saved) {
        tasks = JSON.parse(saved);
    } else {
        // Default starter tasks
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
    renderTasks();
}

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('rene-kanban-tasks', JSON.stringify(tasks));
}

// Render all tasks
function renderTasks() {
    document.getElementById('todo').innerHTML = '';
    document.getElementById('in-progress').innerHTML = '';
    document.getElementById('done').innerHTML = '';

    tasks.forEach(task => {
        const card = createTaskCard(task);
        document.getElementById(task.status).appendChild(card);
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
        <span class="assignee">${assigneeLabel[task.assignee]}</span>
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
});

// Cancel
document.getElementById('cancelTask').addEventListener('click', closeModal);

// Delete
document.getElementById('deleteTask').addEventListener('click', () => {
    if (editingTaskId && confirm('Delete this task?')) {
        tasks = tasks.filter(t => t.id !== editingTaskId);
        saveTasks();
        renderTasks();
        closeModal();
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
            }
        }
    });
});

// Initialize
loadTasks();

// Export tasks as JSON (for syncing to GitHub later)
window.exportTasks = () => JSON.stringify(tasks, null, 2);
window.importTasks = (json) => {
    tasks = JSON.parse(json);
    saveTasks();
    renderTasks();
};
