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
    // Assign Message bits to non-power-of-2 positions
    h[2] = msgBits[0]; // M1
    h[4] = msgBits[1]; // M2
    h[5] = msgBits[2]; // M3
    h[6] = msgBits[3]; // M4

    // Calculate Parity bits to ensure even parity across specific subsets
    h[0] = (h[2] + h[4] + h[6]) % 2; // P1 covers M1, M2, M4
    h[1] = (h[2] + h[5] + h[6]) % 2; // P2 covers M1, M3, M4
    h[3] = (h[4] + h[5] + h[6]) % 2; // P3 covers M2, M3, M4

    return h;
};

const simulateError = (hammingCode, errorPosition) => {
    const transmitted = [...hammingCode];
    if (errorPosition > 0 && errorPosition <= 7) {
        transmitted[errorPosition - 1] = 1 - transmitted[errorPosition - 1]; // Flip bit
    }
    return transmitted;
};

const detectAndCorrect = (transmitted) => {
    const h = transmitted;
    
    // Calculate Syndromes by checking if parity rules still hold
    const s1 = (h[0] + h[2] + h[4] + h[6]) % 2;
    const s2 = (h[1] + h[2] + h[5] + h[6]) % 2;
    const s3 = (h[3] + h[4] + h[5] + h[6]) % 2;

    // The binary value [S3, S2, S1] pinpoints the exact error index
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

    document.getElementById('logOutput').innerHTML = ''; // Clear for fresh start

    const msgArray = msgInput.split('').map(Number);
    currentEncoded = encodeHamming74(msgArray);
    
    const h = currentEncoded;
    // Build Educational Math String
    const calcHTML = `
        <div class="calc-box">
            <div>P1(M1,M2,M4) = (${h[2]}+${h[4]}+${h[6]}) % 2 = <strong>${h[0]}</strong></div>
            <div>P2(M1,M3,M4) = (${h[2]}+${h[5]}+${h[6]}) % 2 = <strong>${h[1]}</strong></div>
            <div>P3(M2,M3,M4) = (${h[4]}+${h[5]}+${h[6]}) % 2 = <strong>${h[3]}</strong></div>
        </div>
    `;

    log('1. Encoding Complete', `
        Calculating Parity Bits (Modulo 2 addition):
        ${calcHTML}
        Generated (7,4) code for [${msgArray.join(', ')}]:
        ${generateBitChipsHTML(currentEncoded)}
    `);
    
    stepError.classList.add('active');
    btnTransmit.disabled = false;
    btnEncode.innerText = "Re-encode";
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
    const h = currentTransmitted;
    const s = result.syndrome;
    
    // Build Educational Math String
    const calcHTML = `
        <div class="calc-box">
            <div>S1(P1,M1,M2,M4) = (${h[0]}+${h[2]}+${h[4]}+${h[6]}) % 2 = <strong>${s[0]}</strong></div>
            <div>S2(P2,M1,M3,M4) = (${h[1]}+${h[2]}+${h[5]}+${h[6]}) % 2 = <strong>${s[1]}</strong></div>
            <div>S3(P3,M2,M3,M4) = (${h[3]}+${h[4]}+${h[5]}+${h[6]}) % 2 = <strong>${s[2]}</strong></div>
            <div style="color:var(--primary); font-weight:600;">Pos = [S3,S2,S1] = [${s[2]},${s[1]},${s[0]}] = ${result.errorPosition}</div>
        </div>
    `;

    let html = `Calculating Syndromes:${calcHTML}`;
    
    if (result.errorPosition === 0) {
        html += `<span style="color: var(--success);">Syndromes are 0. No errors.</span>`;
        html += generateBitChipsHTML(result.correctedCode);
    } else {
        html += `<span style="color: var(--error);">Error detected at Position ${result.errorPosition}.</span>`;
        html += generateBitChipsHTML(result.correctedCode, -1, result.errorPosition - 1);
    }
    html += `Extracted Data: <strong>[${result.extractedMessage.join(', ')}]</strong>`;

    log('3. Detection & Correction', html);
    btnDecode.disabled = true; 
});

// Initialize
btnTransmit.disabled = true;
btnDecode.disabled = true;