// options.js
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

document.addEventListener('DOMContentLoaded', loadPrompts);
document.getElementById('add-prompt-button').addEventListener('click', addPrompt);

function loadPrompts() {
    chrome.storage.sync.get({ prompts: [] }, function(data) {
        const prompts = data.prompts;
        displayPrompts(prompts);
    });
}

// グローバル変数として draggedItem を宣言
let draggedItem = null;
// options.js

// (既存の関数、generateUUID, loadPrompts, handleDragStart, handleDragOver, handleDrop, handleDragEnd は省略)
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
        contentCell.classList.add('prompt-content'); // ★ クラスを追加

        const actionsCell = row.insertCell();
        const editButton = document.createElement('button');
        editButton.textContent = '編集';
        editButton.addEventListener('click', () => editPrompt(prompt.promptId));
        actionsCell.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '削除';
        deleteButton.classList.add('delete');
        deleteButton.addEventListener('click', () => deletePrompt(prompt.promptId));
        actionsCell.appendChild(deleteButton);

        row.addEventListener('dragstart', handleDragStart);
        row.addEventListener('dragover', handleDragOver);
        row.addEventListener('drop', handleDrop);
        row.addEventListener('dragend', handleDragEnd);
    });
}

// (addPrompt, editPrompt, saveEditedPrompt, deletePrompt 関数は省略)

// ドラッグ開始時の処理
function handleDragStart(e) {
    draggedItem = this; // this は dragstart イベントが発生した要素 (行)
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.promptId); // promptId を DataTransfer オブジェクトに設定
    this.classList.add('dragging'); // ドラッグ中のスタイルを適用
}

// ドラッグ中の要素が上に乗っているときの処理
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // 全ての行から一旦 drop-target クラスを削除
    const rows = document.querySelectorAll('#prompts-table-body tr');
    rows.forEach(row => row.classList.remove('drop-target'));

    // ドロップ対象行にのみ drop-target クラスを追加
    if (this !== draggedItem) {
        this.classList.add('drop-target');
    }
    return false;
}
// ドロップされたときの処理
function handleDrop(e) {
    e.stopPropagation(); // イベントの伝播を停止

    if (draggedItem !== this) {
        const fromId = draggedItem.dataset.promptId;
        const toId = this.dataset.promptId;

        chrome.storage.sync.get({ prompts: [] }, (data) => {
            let prompts = data.prompts;

            const fromIndex = prompts.findIndex(p => p.promptId === fromId);
            const toIndex = prompts.findIndex(p => p.promptId === toId);

            if (fromIndex !== -1 && toIndex !== -1) {
                // 配列の要素を入れ替え
                const [removed] = prompts.splice(fromIndex, 1);
                prompts.splice(toIndex, 0, removed);

                // 更新されたプロンプトの配列を保存
                chrome.storage.sync.set({ prompts: prompts }, () => {
                    loadPrompts(); // 再描画
                });
            }
        });
    }
    return false;
}

// ドラッグ終了時の処理
function handleDragEnd(e) {
    // ドラッグ中のスタイルを削除
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
        draggedItem = null; // draggedItem をリセット
    }

    // 全ての行からドロップターゲットのスタイルを削除
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

    chrome.storage.sync.get({ prompts: [] }, function(data) {
        const prompts = data.prompts;
        const newPrompt = {
            promptId: generateUUID(),
            title: newTitle,
            content: newContent
        };
        prompts.push(newPrompt);
        chrome.storage.sync.set({ prompts: prompts }, function() {
            loadPrompts();
            document.getElementById('new-prompt-title').value = '';
            document.getElementById('new-prompt-content').value = '';
        });
    });
}

function editPrompt(promptId) {
    const tableBody = document.getElementById('prompts-table-body');
    let targetRow = null;
    for(let i = 0; i < tableBody.rows.length; i++){
        if(tableBody.rows[i].dataset.promptId === promptId){
            targetRow = tableBody.rows[i];
            break;
        }
    }

    if(!targetRow) {
        console.error("該当するプロンプトが見つかりません:", promptId);
        return;
    }
    const row = targetRow;

    const titleCell = row.cells[1]; //dragハンドルが追加されたので、インデックス変更
    const contentCell = row.cells[2];//dragハンドルが追加されたので、インデックス変更

    const oldTitle = titleCell.textContent;
    const oldContent = contentCell.textContent;

    titleCell.innerHTML = `<input type="text" value="${oldTitle}">`;
    contentCell.innerHTML = `<textarea>${oldContent}</textarea>`;

    const actionsCell = row.cells[3];//dragハンドルが追加されたので、インデックス変更
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

    chrome.storage.sync.get({ prompts: [] }, function(data) {
        const prompts = data.prompts;
        const index = prompts.findIndex(p => p.promptId === promptId);
        if (index !== -1) {
            prompts[index] = { promptId: promptId, title: newTitle, content: newContent };
            chrome.storage.sync.set({ prompts: prompts }, function() {
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

    chrome.storage.sync.get({ prompts: [] }, function(data) {
        let prompts = data.prompts;
        prompts = prompts.filter(p => p.promptId !== promptId);
        chrome.storage.sync.set({ prompts: prompts }, function() {
            loadPrompts();
        });
    });
}