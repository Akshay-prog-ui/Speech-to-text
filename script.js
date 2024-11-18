// Global Variables
let recognition;
let speaker = 1;  // Track which speaker is speaking (1 or 2)
let ongoingTranscript = '';  // Variable to hold the ongoing transcription text for the current speaker
let transcriptionHistory = []; // Array to store all transcriptions for search and indexing

// Initialize Web Speech API (Speech Recognition)
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';  // Set language
    recognition.maxAlternatives = 1;

    // Start Listening
    recognition.onstart = function() {
        document.getElementById("startListeningButton").textContent = "Listening...";
    };

    // Handle Errors
    recognition.onerror = function(event) {
        console.error("Speech Recognition error", event);
        alert("Speech Recognition failed. Please try again.");
    };

    // Process Speech Results
    recognition.onresult = function(event) {
        let transcript = '';
        let isFinal = false;

        // Collect transcriptions
        for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
            isFinal = event.results[i].isFinal;
        }

        const timestamp = new Date().toLocaleTimeString();

        // If final result, append to ongoing transcript
        if (isFinal) {
            ongoingTranscript += `\nSpeaker ${speaker} [${timestamp}]: ${transcript}`;
            transcriptionHistory.push({ speaker, transcript, timestamp });

            // Display transcription text
            document.getElementById("transcriptionText").innerHTML = formatTranscription(ongoingTranscript);
        } else {
            // Display ongoing speech (interim results)
            document.getElementById("transcriptionText").innerHTML = ongoingTranscript + `Speaker ${speaker}: ${transcript}...`;
        }
    };

    // When Recognition Stops
    recognition.onend = function() {
        document.getElementById("startListeningButton").textContent = "Start Listening";
    };
} else {
    alert("Speech Recognition not supported in this browser.");
}

// Start or Stop Speech Recognition on Button Click
document.getElementById("startListeningButton").addEventListener("click", function() {
    if (recognition) {
        if (recognition.running) {
            recognition.stop();
        } else {
            recognition.start();
        }
    }
});

// Format the transcription text for displaying (makes it editable)
function formatTranscription(text) {
    return text.split('\n').map(line => {
        return `<span class="editable" contenteditable="true" data-original-text="${line}">${line}</span><br>`;
    }).join('');
}

// Handle Search Feature
document.getElementById("searchButton").addEventListener("click", function() {
    const searchTerm = document.getElementById("searchInput").value.trim().toLowerCase();
    if (searchTerm) {
        let highlightedTranscript = ongoingTranscript;
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        highlightedTranscript = highlightedTranscript.replace(regex, '<span class="marked">$1</span>');
        document.getElementById("transcriptionText").innerHTML = formatTranscription(highlightedTranscript);
    }
});

// Enable Editing of Transcription Text
document.getElementById("transcriptionText").addEventListener("click", function(event) {
    if (event.target && event.target.classList.contains("editable")) {
        event.target.contentEditable = true;
        event.target.focus();
    }
});

// Save Edited Transcription
document.getElementById("transcriptionText").addEventListener("blur", function(event) {
    if (event.target && event.target.classList.contains("editable")) {
        const editedText = event.target.innerText;
        const originalText = event.target.dataset.originalText;

        ongoingTranscript = ongoingTranscript.replace(originalText, editedText);
        transcriptionHistory.push({ speaker, transcript: editedText, timestamp: new Date().toLocaleTimeString() });

        event.target.dataset.originalText = editedText;
    }
}, true);

// Encrypt Transcription Data using CryptoJS (for export purposes only)
function encryptData(data) {
    const password = prompt("Please enter a password to encrypt your transcription:");
    if (!password) return null;  // If no password, return null
    return CryptoJS.AES.encrypt(data, password).toString();  // Encrypt using AES
}

// Export Transcription as PDF
document.getElementById("exportPDFButton").addEventListener("click", function() {
    const encryptedTranscription = encryptData(ongoingTranscript);
    if (encryptedTranscription) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text(encryptedTranscription, 10, 10);
        doc.save('transcription.pdf');
    }
});

// Export Transcription as DOCX
document.getElementById("exportDOCXButton").addEventListener("click", function() {
    const encryptedTranscription = encryptData(ongoingTranscript);
    if (encryptedTranscription) {
        const zip = new PizZip();
        const doc = new docxtemplater(zip);
        const content = `<w:p><w:r><w:t>${encryptedTranscription}</w:t></w:r></w:p>`;
        zip.file("word/document.xml", content);
        const docx = zip.generate({ type: "blob" });
        saveAs(docx, "transcription.docx");
    }
});

// Export Transcription as TXT
document.getElementById("exportTXTButton").addEventListener("click", function() {
    const encryptedTranscription = encryptData(ongoingTranscript);
    if (encryptedTranscription) {
        const blob = new Blob([encryptedTranscription], { type: 'text/plain' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "transcription.txt";
        link.click();
    }
});

// Handle File Upload (Audio/Video)
document.getElementById("fileInput").addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileURL = URL.createObjectURL(file);
    if (file.type.startsWith("audio/")) {
        const audioPlayer = new Audio(fileURL);
        audioPlayer.controls = true;
        document.body.appendChild(audioPlayer);
        audioPlayer.play();
        startFileTranscription(file);
    } else if (file.type.startsWith("video/")) {
        const videoPlayer = document.createElement("video");
        videoPlayer.src = fileURL;
        videoPlayer.controls = true;
        document.body.appendChild(videoPlayer);
        videoPlayer.play();
        startFileTranscription(file);
    } else {
        alert("Please upload a valid audio or video file.");
    }
});

// Simulate File Transcription (You can replace this with real transcription logic)
function startFileTranscription(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const fileContent = e.target.result;
        setTimeout(function() {
            ongoingTranscript += `\nTranscription completed for: ${file.name}`;
            document.getElementById("transcriptionText").innerHTML = formatTranscription(ongoingTranscript);
        }, 2000);  // Simulate delay
    };
    reader.readAsDataURL(file);
}

// Text-to-Speech Functionality (Speak Transcription)
document.getElementById("speakButton").addEventListener("click", function() {
    const text = document.getElementById("textInput").value.trim();  // Get the typed text from the input
    if (text) {
        const language = document.getElementById("languageSelect").value;  // Get selected language

        // Create a new SpeechSynthesisUtterance instance
        const speechSynthesisUtterance = new SpeechSynthesisUtterance(text);
        speechSynthesisUtterance.lang = language;  // Set the language for speech synthesis
        speechSynthesisUtterance.rate = 1;  // Set speech speed
        speechSynthesisUtterance.pitch = 1;  // Set pitch

        // Speak the text using the SpeechSynthesis API
        window.speechSynthesis.speak(speechSynthesisUtterance);
    }
});
