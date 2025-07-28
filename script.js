// Chatroom App Frontend Simulation
// Modular JS for UI flows, room code, and ephemeral chat

// --- DOM Elements ---
const landing = document.getElementById('landing');
const createRoom = document.getElementById('createRoom');
const joinRoom = document.getElementById('joinRoom');
const chatroom = document.getElementById('chatroom');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const backToLanding1 = document.getElementById('backToLanding1');
const backToLanding2 = document.getElementById('backToLanding2');
const startChatBtn = document.getElementById('startChatBtn');
const requestJoinBtn = document.getElementById('requestJoinBtn');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const roomCodeSpan = document.getElementById('roomCode');
const joinCodeInput = document.getElementById('joinCodeInput');
const joinStatus = document.getElementById('joinStatus');
const chatInput = document.getElementById('chatInput');
const sendMsgBtn = document.getElementById('sendMsgBtn');
const userList = document.getElementById('userList');
const chatMessages = document.getElementById('chatMessages');
const chatroomTitle = document.getElementById('chatroomTitle');

// --- State Simulation ---
let currentRoom = null;
let currentUser = null;
let isAdmin = false;
let roomUsers = [];
let roomMessages = [];
let ws = null;

// --- Utility Functions ---
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = Array.from({length:8},()=>chars[Math.floor(Math.random()*chars.length)]).join('');
    return code;
}
function showSection(section) {
    [landing, createRoom, joinRoom, chatroom].forEach(s => s.classList.add('hidden'));
    section.classList.remove('hidden');
    // GSAP animation (optional)
    if (window.gsap) {
        gsap.fromTo(section, {opacity:0, y:30}, {opacity:1, y:0, duration:0.5});
    }
}
function saveRooms() {
    localStorage.setItem('chatRooms', JSON.stringify(rooms));
}
function updateUserList() {
    userList.innerHTML = '';
    roomUsers.forEach(u => {
        const span = document.createElement('span');
        span.textContent = u;
        userList.appendChild(span);
    });
}
function updateMessages() {
    chatMessages.innerHTML = '';
    roomMessages.forEach(m => {
        const div = document.createElement('div');
        div.textContent = m.user + ': ' + m.text;
        chatMessages.appendChild(div);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
function resetState() {
    currentRoom = null;
    currentUser = null;
    isAdmin = false;
    roomUsers = [];
    roomMessages = [];
}

// --- Event Listeners ---
createRoomBtn.onclick = () => {
    showSection(createRoom);
    const code = generateRoomCode();
    roomCodeSpan.textContent = code;
    currentRoom = code;
    currentUser = 'Owner_' + Math.floor(Math.random()*10000);
    isAdmin = true;
    ws = new WebSocket('ws://localhost:3000');
    ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'create', code, user: currentUser }));
    };
    setupWSHandlers();
};
backToLanding1.onclick = () => {
    showSection(landing);
    if (ws) {
        ws.send(JSON.stringify({ type: 'leave' }));
        ws.close();
        ws = null;
    }
    resetState();
};
joinRoomBtn.onclick = () => {
    showSection(joinRoom);
    joinCodeInput.value = '';
    joinStatus.textContent = '';
};
backToLanding2.onclick = () => {
    showSection(landing);
    joinCodeInput.value = '';
    joinStatus.textContent = '';
    if (ws) {
        ws.send(JSON.stringify({ type: 'leave' }));
        ws.close();
        ws = null;
    }
    resetState();
};
startChatBtn.onclick = () => {
    showSection(chatroom);
    chatroomTitle.textContent = 'Chatroom (' + currentRoom + ')';
    updateUserList();
    updateMessages();
};
requestJoinBtn.onclick = () => {
    const code = joinCodeInput.value.trim();
    currentRoom = code;
    currentUser = 'User_' + Math.floor(Math.random()*10000);
    isAdmin = false;
    ws = new WebSocket('ws://localhost:3000');
    ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'join', code, user: currentUser }));
    };
    setupWSHandlers();
    joinStatus.textContent = 'Connecting...';
};
leaveRoomBtn.onclick = () => {
    if (ws) {
        ws.send(JSON.stringify({ type: 'leave' }));
        ws.close();
        ws = null;
    }
    showSection(landing);
    resetState();
};
sendMsgBtn.onclick = () => {
    const text = chatInput.value.trim();
    if (!text || !currentRoom || !currentUser || !ws) return;
    ws.send(JSON.stringify({ type: 'message', text }));
    chatInput.value = '';
};

// --- Initial UI ---

showSection(landing);

function setupWSHandlers() {
    if (!ws) return;
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'created') {
            // Room created, wait for start
        }
        if (data.type === 'joined') {
            roomUsers = data.users;
            roomMessages = data.messages;
            showSection(chatroom);
            chatroomTitle.textContent = 'Chatroom (' + currentRoom + ')';
            updateUserList();
            updateMessages();
        }
        if (data.type === 'user_joined') {
            roomUsers.push(data.user);
            updateUserList();
        }
        if (data.type === 'user_left') {
            roomUsers = roomUsers.filter(u => u !== data.user);
            updateUserList();
        }
        if (data.type === 'message') {
            roomMessages.push({ user: data.user, text: data.text });
            updateMessages();
        }
        if (data.type === 'error') {
            joinStatus.textContent = data.message;
            ws.close();
            ws = null;
            resetState();
        }
    };
}
