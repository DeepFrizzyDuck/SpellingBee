var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition
var SpeechGrammarList = SpeechGrammarList || window.webkitSpeechGrammarList
var SpeechRecognitionEvent = SpeechRecognitionEvent || webkitSpeechRecognitionEvent

var letter = '';
var numWords = 0;

var letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
var recognition = new SpeechRecognition();

if (SpeechGrammarList) {
  var speechRecognitionList = new SpeechGrammarList();
  var grammar = '#JSGF V1.0; grammar letters; public <letter> = ' + letters.join(' | ') + ' ;'
  speechRecognitionList.addFromString(grammar, 1);
  recognition.grammars = speechRecognitionList;
}
recognition.continuous = false;
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

// Setup spelling stuff
var levelElem = document.querySelector('#level');
var wordElem = document.querySelector('#word');
var defElem = document.querySelector('#definition');
var ysElem = document.querySelector('#yousaid');

let started = false;

let targetWord = "";
let definition = "";
let example = "";

function defineWord(word) {
  const url = "https://api.dictionaryapi.dev/api/v2/entries/en/";

  let inpWord = word
  fetch(`${url}${inpWord}`)
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      definition = data[0].meanings[0].definitions[0].definition;
      example = data[0].meanings[0].definitions[0].example;

      let utterance = new SpeechSynthesisUtterance("The word is:" + targetWord + ". ");
      speechSynthesis.speak(utterance);

      let def = `${count}. ` + definition;
      //if (example) def += "<br><i>Example: " + example + "</i>"
      defElem.innerHTML = def;

      utterance.onend = () => {
        recognition.start();
      }
    })
    .catch(() => {
      let utterance = new SpeechSynthesisUtterance("The word is:" + targetWord + ". ");
      speechSynthesis.speak(utterance);
      defElem.innerHTML = `${count}. ` + "No definition has been found for this word."
      utterance.onend = () => {
        recognition.start();
      }
    })
}

function obfusticateResult(result) {
  return result.replaceAll(/./g, "_ ");
}

function cleanResults(result) {
  return result.replace(/\s/g, '').toLowerCase();
}

function splitResults(result) {
  return result.split("").join("... : ");
}

function splitResults2(result) {
  return result.split("").join(" ");
}

let count = 0;
let correct = 0;
var pool = [];

var chosenWords = [];
var originalWord = '';

var finishRound = true;
recognition.stop();

var start = document.querySelector('#start');
start.onclick = function() {
  letter = document.querySelector('#startswith').value;
  numWords = document.querySelector('#numwords').value;

  document.querySelector('#form').remove();
  console.log(letter, numWords);

  data.forEach((level) => {
    let newl = []
    level.forEach((word) => {
      word = word.toLowerCase();
      if (word.startsWith(letter)) {
        newl.push(word);
      }
    });
    pool.push(newl);
  })
  
  data = pool;

  document.body.onclick = function() {
    recognition.stop();

    if (finishRound) {
      finishRound = false;
      count += 1
      
      if (count <= numWords) {
        // Pick a random level!
        let level = Math.floor(Math.random() * 4);
        levelElem.innerHTML = `<i>${correct}/${numWords}</i><br>Words starting with '${letter.toUpperCase()}' ${'🐝'.repeat(level + 1)}`;
        originalWord = data[level][Math.floor(Math.random() * (data[level].length-1))];
        targetWord = cleanResults(originalWord);
        defineWord(targetWord);
        
        ysElem.innerHTML = "";
        wordElem.innerHTML = obfusticateResult(targetWord);
      }
      else {
        levelElem.innerHTML = `<i>${correct}/${numWords}</i><br>Words starting with '${letter.toUpperCase()}'`;
        wordElem.innerHTML = `You're done 🎉`;
        ysElem.innerHTML = "";
    
        let innerhtml = ""
        for (let word of chosenWords) {
          if (word[1]) innerhtml += word[0] + "<br>"
          else innerhtml += `<span>${word[0]}</span><br>`
        }
    
        defElem.innerHTML = innerhtml
      }
    }
    else {
      // Repeat
      let utterance = new SpeechSynthesisUtterance("The word is:" + targetWord + ". ");
      speechSynthesis.speak(utterance);
      utterance.onend = () => {
        recognition.start();
      }
    }
  }
}

recognition.onresult = function(event) {
  recognition.stop();
  var result = event.results[0][0].transcript;
  if (!result.includes(' ')) {
    chosenWords.push([originalWord, false]);

    let utterance = new SpeechSynthesisUtterance("Please don't cheat.");
    speechSynthesis.speak(utterance);
    wordElem.innerHTML = splitResults2(targetWord);

    finishRound = true;
    return;
  }

  result = cleanResults(result)
  if (targetWord == result) {
    let utterance = new SpeechSynthesisUtterance("Correct.");
    correct += 1;
    // Push chosen word
    chosenWords.push([originalWord, true]);

    speechSynthesis.speak(utterance);
    wordElem.innerHTML = splitResults2(targetWord);
  }
  else {
    let utterance = new SpeechSynthesisUtterance("Incorrect. Correct spelling is " + splitResults(targetWord));
    speechSynthesis.speak(utterance);
    chosenWords.push([originalWord, false]);
    ysElem.innerHTML = splitResults2(result);
    wordElem.innerHTML = splitResults2(targetWord);
  }
  finishRound = true;
}
