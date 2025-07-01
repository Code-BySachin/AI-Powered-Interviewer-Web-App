// API Configuration
const API_KEY = window.GEMINI_API_KEY||'AIzaSyAhavVY1mCasxLmBDLvpfT7QY1otHXBnJc';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

// DOM Elements
const topicSelect = document.getElementById('topic-select');
const difficultySelect = document.getElementById('difficulty');
const startBtn = document.getElementById('start-btn');
const speakBtn = document.getElementById('speak-btn');
const nextBtn = document.getElementById('next-btn');
const endBtn = document.getElementById('end-btn');
const restartBtn = document.getElementById('restart-btn');
const conversation = document.getElementById('conversation');
const statusEl = document.getElementById('status');
const summaryEl = document.getElementById('summary');
const setupPanel = document.querySelector('.setup-panel');
const interviewPanel = document.querySelector('.interview-panel');
const resultPanel = document.querySelector('.result-panel');

// App State
let interviewState = {
    topic: '',
    difficulty: '',
    currentQuestion: '',
    conversationHistory: [],
    questionsAsked: 0,
    evaluation: []
};

// Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isListening = false;
let speechTimeout;
let finalTranscriptBuffer = '';

// Speech Synthesis
const synth = window.speechSynthesis;
let currentUtterance = null;

// Initialize the app
function init() {
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = handleSpeechResult;
        recognition.onerror = handleSpeechError;
        recognition.onspeechend = handleSpeechEnd;
        recognition.onend = handleRecognitionEnd;
    } else {
        speakBtn.disabled = true;
        speakBtn.title = 'Speech recognition not supported in this browser';
    }
    
    setupEventListeners();
}

function setupEventListeners() {
    startBtn.addEventListener('click', startInterview);
    speakBtn.addEventListener('click', toggleSpeechRecognition);
    nextBtn.addEventListener('click', getNextQuestion);
    endBtn.addEventListener('click', endInterview);
    restartBtn.addEventListener('click', resetApp);
}

async function startInterview() {
    interviewState.topic = topicSelect.value;
    interviewState.difficulty = difficultySelect.value;
    
    setupPanel.classList.add('hidden');
    interviewPanel.classList.remove('hidden');
    
    const prompt = `You are a technical interviewer conducting a ${interviewState.difficulty} level interview about ${interviewState.topic}. 
    Start by greeting the candidate and asking your first question. Keep your responses concise and focused on technical assessment.
    After each answer, provide brief feedback on the response before moving to the next question.`;
    
    statusEl.textContent = 'Preparing first question...';
    speakBtn.disabled = true;
    
    try {
        const response = await callGeminiAPI(prompt);
        interviewState.currentQuestion = response;
        addMessage(response, 'assistant');
        speakText(response);
        statusEl.textContent = 'Interview started. Click the microphone to answer.';
        speakBtn.disabled = false;
    } catch (error) {
        console.error('Error starting interview:', error);
        statusEl.textContent = 'Error starting interview. Please try again.';
    }
}

function toggleSpeechRecognition() {
    if (!recognition) {
        alert('Speech recognition is not supported in your browser. Please type your answers instead.');
        return;
    }
    
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

function startListening() {
    isListening = true;
    finalTranscriptBuffer = '';
    speakBtn.innerHTML = '<span class="icon">🔴</span> Listening...';
    speakBtn.classList.add('active');
    statusEl.textContent = 'Listening... (5 seconds of silence will submit)';
    recognition.start();
}

function stopListening() {
    isListening = false;
    speakBtn.innerHTML = '<span class="icon">🎤</span> Answer';
    speakBtn.classList.remove('active');
    clearTimeout(speechTimeout);
    
    try {
        recognition.stop();
    } catch (e) {
        console.log('Recognition already stopped');
    }
}

function handleSpeechResult(event) {
    clearTimeout(speechTimeout);
    
    // Only process final results, ignore interim
    for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
            finalTranscriptBuffer += event.results[i][0].transcript;
        }
    }
    
    // Restart timeout after each speech segment
    speechTimeout = setTimeout(() => {
        if (finalTranscriptBuffer.trim().length > 0) {
            addMessage(finalTranscriptBuffer, 'user');
            evaluateAnswer(finalTranscriptBuffer);
        }
        stopListening();
    }, 5000); // 5 seconds of silence
}

function handleSpeechEnd() {
    // No action needed - handled by timeout
}

function handleRecognitionEnd() {
    if (isListening) {
        recognition.start();
    }
}

function handleSpeechError(event) {
    console.error('Speech recognition error:', event.error);
    statusEl.textContent = 'Error: ' + event.error;
    stopListening();
}

async function evaluateAnswer(answer) {
    statusEl.textContent = 'Evaluating your answer...';
    speakBtn.disabled = true;
    
    const prompt = `The candidate was asked: "${interviewState.currentQuestion}". 
    They responded with: "${answer}". 
    As the technical interviewer, provide brief feedback on this answer (1-2 sentences) and then ask the next ${interviewState.difficulty} level question about ${interviewState.topic}.`;
    
    try {
        const response = await callGeminiAPI(prompt);
        interviewState.currentQuestion = extractCurrentQuestion(response);
        interviewState.evaluation.push({
            question: interviewState.currentQuestion,
            answer: answer,
            feedback: extractFeedback(response)
        });
        
        addMessage(response, 'assistant');
        speakText(response);
        
        interviewState.questionsAsked++;
        if (interviewState.questionsAsked >= 5) {
            statusEl.textContent = 'Final question answered. You can end the interview.';
            nextBtn.disabled = true;
        } else {
            statusEl.textContent = 'Click the microphone to answer or "Next Question" to skip.';
            speakBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error evaluating answer:', error);
        statusEl.textContent = 'Error evaluating answer. Please try again.';
    }
}

async function getNextQuestion() {
    statusEl.textContent = 'Getting next question...';
    speakBtn.disabled = true;
    
    const prompt = `Ask the next ${interviewState.difficulty} level question about ${interviewState.topic} in the technical interview. 
    Keep it concise and relevant to the topic.`;
    
    try {
        const response = await callGeminiAPI(prompt);
        interviewState.currentQuestion = response;
        addMessage(response, 'assistant');
        speakText(response);
        
        interviewState.questionsAsked++;
        if (interviewState.questionsAsked >= 5) {
            statusEl.textContent = 'Final question answered. You can end the interview.';
            nextBtn.disabled = true;
        } else {
            statusEl.textContent = 'Click the microphone to answer.';
            speakBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error getting next question:', error);
        statusEl.textContent = 'Error getting next question. Please try again.';
    }
}

async function endInterview() {
    // Stop any ongoing speech immediately
    if (synth.speaking) {
        synth.cancel();
    }
    
    // Stop listening if active
    if (isListening) {
        stopListening();
    }
    
    statusEl.textContent = 'Generating interview summary...';
    
    const prompt = `Generate a summary and evaluation of the technical interview about ${interviewState.topic} at ${interviewState.difficulty} level. 
    The interview included these Q&A pairs: ${JSON.stringify(interviewState.evaluation)}.
    Provide a concise overall assessment (3-4 sentences) and a list of key strengths and areas for improvement.`;
    
    try {
        const response = await callGeminiAPI(prompt);
        interviewPanel.classList.add('hidden');
        resultPanel.classList.remove('hidden');
        summaryEl.innerHTML = formatSummary(response);
    } catch (error) {
        console.error('Error generating summary:', error);
        summaryEl.textContent = 'Error generating interview summary.';
    }
}

function resetApp() {
    // Stop any ongoing speech
    if (synth.speaking) {
        synth.cancel();
    }
    
    interviewState = {
        topic: '',
        difficulty: '',
        currentQuestion: '',
        conversationHistory: [],
        questionsAsked: 0,
        evaluation: []
    };
    
    conversation.innerHTML = '';
    resultPanel.classList.add('hidden');
    setupPanel.classList.remove('hidden');
    nextBtn.disabled = false;
}

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    messageDiv.textContent = text;
    conversation.appendChild(messageDiv);
    conversation.scrollTop = conversation.scrollHeight;
    
    interviewState.conversationHistory.push({
        role: sender === 'user' ? 'user' : 'model',
        parts: [{ text: text }]
    });
}

function speakText(text) {
    // Stop any ongoing speech
    if (synth.speaking) {
        synth.cancel();
    }
    
    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.rate = 1.0;
    currentUtterance.pitch = 1.0;
    synth.speak(currentUtterance);
}

async function callGeminiAPI(prompt) {
    const userMessage = {
        role: 'user',
        parts: [{ text: prompt }]
    };
    
    const messages = [...interviewState.conversationHistory, userMessage];
    
    const requestBody = {
        contents: messages,
        generationConfig: {
            temperature: 0.9,
            topK: 1,
            topP: 1,
            maxOutputTokens: 1024,
            stopSequences: []
        },
        safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
        ]
    };
    
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

function extractCurrentQuestion(fullResponse) {
    const sentences = fullResponse.split('\n').filter(s => s.trim().length > 0);
    for (let i = sentences.length - 1; i >= 0; i--) {
        if (sentences[i].trim().endsWith('?')) {
            return sentences[i];
        }
    }
    return sentences[sentences.length - 1];
}

function extractFeedback(fullResponse) {
    const sentences = fullResponse.split('\n').filter(s => s.trim().length > 0);
    for (let i = 0; i < sentences.length; i++) {
        if (sentences[i].trim().endsWith('?')) {
            return sentences.slice(0, i).join(' ');
        }
    }
    return fullResponse;
}

function formatSummary(summaryText) {
    return summaryText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/- (.*?)(\n|$)/g, '<li>$1</li>')
        .replace(/\n/g, '<br>');
}

window.addEventListener('load', init);