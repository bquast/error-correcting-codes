// =========================================
// Global State
// =========================================
let currentEncoded = [];
let currentTransmitted = [];

// =========================================
// Hamming (7,4) Core Functions
// =========================================
const encodeHamming74 = (msgBits) => {
    const h = new Array(7).fill(0);
    h[2] = msgBits[0]; h[4] = msgBits[1]; h[5] = msgBits[2]; h[6] = msgBits[3]; 

    h[0] = (h[2] + h[4] + h[6]) % 2; // P1
    h[1] = (h[2] + h[5] + h[6]) % 2; // P2
    h[3] = (h[4] + h[5] + h[6]) % 2; // P3

    return h;
};

const simulateError = (hammingCode, errorPosition) => {
    const transmitted = [...hammingCode];
    if (errorPosition > 0 && errorPosition <= 7) {
        transmitted[errorPosition - 1] = 1 - transmitted[errorPosition - 1]; 
    }
    return transmitted;
};

const detectAndCorrect = (transmitted) => {
    const h = transmitted;
    const s1 = (h[0] + h[2] + h[4] + h[6]) % 2;
    const s2 = (h[1] + h[2] + h[5] + h[6]) % 2;
    const s3 = (h[3] + h[4] + h[5] + h[6]) % 2;

    const errorPosition = (s1 * 1) + (s2 * 2) + (s3 * 4);
    const corrected = [...h];

    if (errorPosition !== 0) {
        corrected[errorPosition - 1] = 1 - corrected[errorPosition - 1]; 
    }

    const originalMsg = [corrected[2], corrected[4], corrected[5], corrected[6]];

    return { syndrome: [s1, s2, s3], errorPosition, correctedCode: corrected, extractedMessage: originalMsg };
};

// =========================================
// UI & Visualization Glue
// =========================================
const generateBitChipsHTML = (bits, errorIndex = -1, correctedIndex = -1) => {
    const labels = ["P1", "P2", "M1", "P3", "M2", "M3", "M4"];
    return `<div class="bits-display">
        ${bits.map((bit, idx) => {
            let extraClass = "";
            if (idx === 0 || idx === 1 || idx === 3) extraClass = "bit-parity"; 
            if (idx === errorIndex) extraClass = "bit-error"; 
            if (idx === correctedIndex) extraClass = "bit-corrected"; 
            return `<div class="bit-chip ${extraClass}">${bit}<span class="bit-label">${labels[idx]}</span></div>`;
        }).join('')}
    </div>`;
};

const log = (title, htmlContent) => {
    const logBox = document.getElementById('logOutput');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<div class="log-title">${title}</div><div class="log-data">${htmlContent}</div>`;
    logBox.appendChild(entry);
};

// DOM Elements
const btnEncode = document.getElementById('btnEncode');
const btnTransmit = document.getElementById('btnTransmit');
const btnDecode = document.getElementById('btnDecode');
const stepError = document.getElementById('errorStep');
const stepDecode = document.getElementById('decodeStep');

// Event Listeners
btnEncode.addEventListener('click', () => {
    const msgInput = document.getElementById('msgInput').value;
    if (msgInput.length !== 4 || !/^[01]+$/.test(msgInput)) return alert("Enter exactly four 0s and 1s.");

    // Clear log for a fresh start so it doesn't scroll endlessly
    document.getElementById('logOutput').innerHTML = ''; 

    const msgArray = msgInput.split('').map(Number);
    currentEncoded = encodeHamming74(msgArray);

    log('1. Encoding Complete', `
        Generated (7,4) code for [${msgArray.join(', ')}]:
        ${generateBitChipsHTML(currentEncoded)}
    `);
    
    stepError.classList.add('active');
    btnTransmit.disabled = false;
    btnEncode.innerText = "Re-encode";
    
    // Reset following steps if we are re-encoding
    stepDecode.classList.remove('active');
    btnDecode.disabled = true;
});

btnTransmit.addEventListener('click', () => {
    const errorPos = parseInt(document.getElementById('errorPos').value) || 0;
    currentTransmitted = simulateError(currentEncoded, errorPos);
    const errIndex = errorPos > 0 ? errorPos - 1 : -1;
    
    log('2. Transmission Simulated', `
        ${errorPos === 0 ? "No error added." : `Error injected at position ${errorPos}.`}
        ${generateBitChipsHTML(currentTransmitted, errIndex)}
    `);
    
    stepDecode.classList.add('active');
    btnDecode.disabled = false;
});

btnDecode.addEventListener('click', () => {
    const result = detectAndCorrect(currentTransmitted);
    let html = `Syndromes (S1, S2, S3): [${result.syndrome.join(', ')}] — `;
    
    if (result.errorPosition === 0) {
        html += `<span style="color: var(--success);">No errors.</span>`;
        html += generateBitChipsHTML(result.correctedCode);
    } else {
        html += `<span style="color: var(--error);">Error at Pos ${result.errorPosition}.</span>`;
        html += generateBitChipsHTML(result.correctedCode, -1, result.errorPosition - 1);
    }
    html += `Extracted Data: <strong>[${result.extractedMessage.join(', ')}]</strong>`;

    log('3. Detection & Correction', html);
    btnDecode.disabled = true; 
});

// Initialize
btnTransmit.disabled = true;
btnDecode.disabled = true;