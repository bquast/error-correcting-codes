// =========================================
// Global State
// =========================================
let currentEncoded = [];
let currentTransmitted = [];

// =========================================
// Hamming (7,4) Core Functions
// =========================================

// Step 1: Encode a 4-bit array into a 7-bit Hamming code
const encodeHamming74 = (msgBits) => {
    // We need 7 positions. In math notation, these are positions 1 to 7.
    // In JS, these are indices 0 to 6.
    const h = new Array(7).fill(0);

    // Place message bits at non-power-of-2 positions: 3, 5, 6, 7 (indices 2, 4, 5, 6)
    h[2] = msgBits[0]; // m1
    h[4] = msgBits[1]; // m2
    h[5] = msgBits[2]; // m3
    h[6] = msgBits[3]; // m4

    // Calculate parity bits at power-of-2 positions: 1, 2, 4 (indices 0, 1, 3)
    // p1 covers positions 1, 3, 5, 7
    h[0] = (h[2] + h[4] + h[6]) % 2; 
    
    // p2 covers positions 2, 3, 6, 7
    h[1] = (h[2] + h[5] + h[6]) % 2; 
    
    // p3 covers positions 4, 5, 6, 7
    h[3] = (h[4] + h[5] + h[6]) % 2; 

    return h;
};

// Step 2: Inject an error
const simulateError = (hammingCode, errorPosition) => {
    // Copy the array to avoid mutating original
    const transmitted = [...hammingCode];
    
    if (errorPosition > 0 && errorPosition <= 7) {
        const index = errorPosition - 1;
        // Flip the bit (1 becomes 0, 0 becomes 1)
        transmitted[index] = 1 - transmitted[index]; 
    }
    
    return transmitted;
};

// Step 3: Detect, correct, and decode
const detectAndCorrect = (transmitted) => {
    const h = transmitted;
    
    // Calculate syndromes by re-checking parity coverage
    // If the data is correct, these should all equal 0
    const s1 = (h[0] + h[2] + h[4] + h[6]) % 2;
    const s2 = (h[1] + h[2] + h[5] + h[6]) % 2;
    const s3 = (h[3] + h[4] + h[5] + h[6]) % 2;

    // The binary value of [s3, s2, s1] gives the exact position of the error (1-7)
    const errorPosition = (s1 * 1) + (s2 * 2) + (s3 * 4);
    
    // Copy for correction
    const corrected = [...h];

    if (errorPosition !== 0) {
        const index = errorPosition - 1;
        corrected[index] = 1 - corrected[index]; // Flip back
    }

    // Extract the original 4 message bits
    const originalMsg = [corrected[2], corrected[4], corrected[5], corrected[6]];

    return {
        syndrome: [s1, s2, s3],
        errorPosition: errorPosition,
        correctedCode: corrected,
        extractedMessage: originalMsg
    };
};


// =========================================
// UI & Visualization Glue
// =========================================

const generateBitChipsHTML = (bits, errorIndex = -1, correctedIndex = -1) => {
    // Standard Hamming positions:
    // P1(0), P2(1), M1(2), P3(3), M2(4), M3(5), M4(6)
    const labels = ["P1", "P2", "M1", "P3", "M2", "M3", "M4"];
    
    return `<div class="bits-display">
        ${bits.map((bit, idx) => {
            let extraClass = "";
            if (idx === 0 || idx === 1 || idx === 3) extraClass = "bit-parity"; // Parity colors
            if (idx === errorIndex) extraClass = "bit-error"; // Error color
            if (idx === correctedIndex) extraClass = "bit-corrected"; // Corrected color
            
            return `
                <div class="bit-chip ${extraClass}">
                    ${bit}
                    <span class="bit-label">${labels[idx]}</span>
                </div>
            `;
        }).join('')}
    </div>`;
};

const log = (title, htmlContent) => {
    const logBox = document.getElementById('logOutput');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<div class="log-title">${title}</div><div class="log-data">${htmlContent}</div>`;
    
    // Clear waiting text if it exists
    if (logBox.innerHTML.includes("Waiting for action...")) {
        logBox.innerHTML = '';
    }
    
    logBox.appendChild(entry);
    logBox.scrollTop = logBox.scrollHeight;
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
    
    if (msgInput.length !== 4 || !/^[01]+$/.test(msgInput)) {
        alert("Please enter exactly four 0s and 1s.");
        return;
    }

    // Convert string "1011" to array [1, 0, 1, 1]
    const msgArray = msgInput.split('').map(Number);
    
    currentEncoded = encodeHamming74(msgArray);

    log('1. Encoding Complete', `
        Original Message: <strong>[${msgArray.join(', ')}]</strong><br/>
        Generated (7,4) code with Parity bits:<br/>
        ${generateBitChipsHTML(currentEncoded)}
    `);
    
    // Update UI
    stepError.classList.add('active');
    btnTransmit.disabled = false;
    btnEncode.innerText = "Re-encode Message";
});

btnTransmit.addEventListener('click', () => {
    const errorPos = parseInt(document.getElementById('errorPos').value) || 0;
    
    currentTransmitted = simulateError(currentEncoded, errorPos);
    
    const errIndex = errorPos > 0 ? errorPos - 1 : -1;

    let text = errorPos === 0 ? "Transmitted perfectly. No error added." : `Error injected at position <strong>${errorPos}</strong>.`;
    
    log('2. Transmission Simulated', `
        ${text}<br/>
        Received Code:<br/>
        ${generateBitChipsHTML(currentTransmitted, errIndex)}
    `);
    
    // Update UI
    stepDecode.classList.add('active');
    btnDecode.disabled = false;
});

btnDecode.addEventListener('click', () => {
    const result = detectAndCorrect(currentTransmitted);
    
    let html = `Calculated Syndromes (S1, S2, S3): [${result.syndrome.join(', ')}]<br/>`;
    
    if (result.errorPosition === 0) {
        html += `<span style="color: var(--success); font-weight: 500;">Syndrome is 0. No errors detected.</span><br/>`;
        html += generateBitChipsHTML(result.correctedCode);
    } else {
        html += `<span style="color: var(--error); font-weight: 500;">Error detected at Position ${result.errorPosition}.</span> Fixing bit...<br/>`;
        html += `Corrected Code:<br/>`;
        html += generateBitChipsHTML(result.correctedCode, -1, result.errorPosition - 1);
    }

    html += `<br/>Extracted original data: <strong style="color: var(--primary)">[${result.extractedMessage.join(', ')}]</strong>`;

    log('3. Detection & Correction', html);
    
    btnDecode.disabled = true; // Wait for new encode/transmit cycle
});

// Initialize UI
btnTransmit.disabled = true;
btnDecode.disabled = true;