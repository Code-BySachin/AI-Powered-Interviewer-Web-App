# Tech Interview Assistant

Tech Interview Assistant is a web app that simulates a technical interview using Google's Gemini API. It asks you questions on a selected topic and difficulty, listens to your spoken answers, provides feedback, and generates a summary at the end.

## Features

- Choose interview topic (HTML, CSS, JavaScript, React, Node.js)
- Select difficulty (Beginner, Intermediate, Advanced)
- AI-powered interviewer asks questions and gives feedback
- Answer by speaking (speech recognition)
- Get a summary and evaluation at the end

## Setup

1. **Clone or download this repository.**
2. **Install dependencies:**  
   No dependencies required; this is a static web app.
3. **Set up your Gemini API key:**
   - Create a `.env` file in the project root:
     ```
     GEMINI_API_KEY=your_gemini_api_key_here
     ```
   - Or edit the API key directly in `script.js`.

4. **Run the app:**
   - Open `index.html` in your browser.
   - Or use [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) in VS Code.

## Files

- [`index.html`](index.html): Main HTML file
- [`styles.css`](styles.css): App styling
- [`script.js`](script.js): App logic and Gemini API integration
- [`.env`](.env): (Optional) Store your Gemini API key

## Requirements

- Modern browser with [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) support (for speech recognition and synthesis)
- Internet connection (for Gemini API)

## Notes

- Your API key is exposed in the frontend; use with caution.
- Speech recognition may not work in all browsers (best in Chrome).

## License

MIT License
