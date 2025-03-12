//options.js 全文
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

document.addEventListener('DOMContentLoaded', loadPrompts);
document.getElementById('add-prompt-button').addEventListener('click', addPrompt);

function loadPrompts() {
    chrome.storage.local.get({ prompts: [] }, function(data) {
        const prompts = data.prompts;
        console.log("loadPrompts called. prompts:", prompts); // 追加: プロンプトデータを確認
        displayPrompts(prompts);
    });
}

let draggedItem = null;

function displayPrompts(prompts) {
    const tableBody = document.getElementById('prompts-table-body');
    tableBody.innerHTML = '';

    prompts.forEach((prompt) => {
        const row = tableBody.insertRow();
        row.draggable = true;
        row.dataset.promptId = prompt.promptId;

        const handleCell = row.insertCell();
        handleCell.innerHTML = '&#9776;';
        handleCell.classList.add('drag-handle');

        const titleCell = row.insertCell();
        titleCell.textContent = prompt.title;

        const contentCell = row.insertCell();
        contentCell.textContent = prompt.content;
        contentCell.classList.add('prompt-content');

        const actionsCell = row.insertCell();
        const editButton = document.createElement('button');
        editButton.textContent = '編集';
        editButton.addEventListener('click', (event) => {
            event.stopPropagation();
            console.log("Edit button clicked for promptId:", prompt.promptId);
            editPrompt(prompt.promptId);
        });
        actionsCell.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '削除';
        deleteButton.classList.add('delete');
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation();
            deletePrompt(prompt.promptId);
        });
        actionsCell.appendChild(deleteButton);

        row.addEventListener('dragstart', handleDragStart);
        row.addEventListener('dragover', handleDragOver);
        row.addEventListener('drop', handleDrop);
        row.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    draggedItem = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.promptId);
    this.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rows = document.querySelectorAll('#prompts-table-body tr');
    rows.forEach(row => row.classList.remove('drop-target'));

    if (this !== draggedItem) {
        this.classList.add('drop-target');
    }
    return false;
}

function handleDrop(e) {
    e.stopPropagation();

    if (draggedItem !== this) {
        const fromId = draggedItem.dataset.promptId;
        const toId = this.dataset.promptId;

        chrome.storage.local.get({ prompts: [] }, (data) => {
            let prompts = data.prompts;

            const fromIndex = prompts.findIndex(p => p.promptId === fromId);
            const toIndex = prompts.findIndex(p => p.promptId === toId);

            if (fromIndex !== -1 && toIndex !== -1) {
                const [removed] = prompts.splice(fromIndex, 1);
                prompts.splice(toIndex, 0, removed);

                chrome.storage.local.set({ prompts: prompts }, () => {
                    loadPrompts();
                });
            }
        });
    }
    return false;
}

function handleDragEnd(e) {
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
        draggedItem = null;
    }

    const rows = document.querySelectorAll('#prompts-table-body tr');
    rows.forEach(row => row.classList.remove('drop-target'));
}

function addPrompt() {
    const newTitle = document.getElementById('new-prompt-title').value;
    const newContent = document.getElementById('new-prompt-content').value;

    if (!newTitle || !newContent) {
        alert('タイトルと内容は必須です。');
        return;
    }

    chrome.storage.local.get({ prompts: [] }, function(data) {
        const prompts = data.prompts;
        const newPrompt = {
            promptId: generateUUID(),
            title: newTitle,
            content: newContent
        };
        prompts.push(newPrompt);
        chrome.storage.local.set({ prompts: prompts }, function() {
            if (chrome.runtime.lastError) {
                console.error("Error saving to storage:", chrome.runtime.lastError);
                alert('エラーが発生しました: ' + chrome.runtime.lastError.message);
                return;
            }
            loadPrompts();
            document.getElementById('new-prompt-title').value = '';
            document.getElementById('new-prompt-content').value = '';
        });
    });
}

function editPrompt(promptId) {
    console.log("editPrompt:",promptId);
    const targetRow = document.querySelector(`#prompts-table-body tr[data-prompt-id="${promptId}"]`);

    if(!targetRow) {
        console.error("該当するプロンプトが見つかりません:", promptId);
        return;
    }
    const row = targetRow;

    const titleCell = row.cells[1];
    const contentCell = row.cells[2];

    const oldTitle = titleCell.textContent;
    const oldContent = contentCell.textContent;

    titleCell.innerHTML = `<input type="text" value="${oldTitle}">`;
    contentCell.innerHTML = `<textarea>${oldContent}</textarea>`;

    const actionsCell = row.cells[3];
    actionsCell.innerHTML = '';

    const saveButton = document.createElement('button');
    saveButton.textContent = "保存";
    saveButton.addEventListener('click', () => saveEditedPrompt(promptId, titleCell, contentCell));
    actionsCell.appendChild(saveButton);

    const cancelButton = document.createElement('button');
    cancelButton.textContent = "キャンセル";
    cancelButton.addEventListener('click', () => {
        loadPrompts();
    });
    actionsCell.appendChild(cancelButton);
}

function saveEditedPrompt(promptId, titleCell, contentCell) {
    const newTitle = titleCell.querySelector('input').value;
    const newContent = contentCell.querySelector('textarea').value;

    chrome.storage.local.get({ prompts: [] }, function(data) {
        const prompts = data.prompts;
        const index = prompts.findIndex(p => p.promptId === promptId);
        if (index !== -1) {
            prompts[index] = { promptId: promptId, title: newTitle, content: newContent };
            chrome.storage.local.set({ prompts: prompts }, function() {
                if (chrome.runtime.lastError) {
                    console.error("Error saving to storage:", chrome.runtime.lastError);
                    alert('エラーが発生しました: ' + chrome.runtime.lastError.message);
                    return;
                }
                loadPrompts();
            });
        } else {
            console.error("該当するプロンプトが見つかりません:", promptId);
        }

    });
}

function deletePrompt(promptId) {
    if (!confirm('本当に削除しますか？')) {
        return;
    }

    chrome.storage.local.get({ prompts: [] }, function(data) {
        let prompts = data.prompts;
        prompts = prompts.filter(p => p.promptId !== promptId);
        chrome.storage.local.set({ prompts: prompts }, function() {
            loadPrompts();
        });
    });
}
