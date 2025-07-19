var global_messages = [];
var global_filtered_messages = [];
var global_words = {};
var ahhhhBarChart;
var timelineChart;
var byDayChart;
var byHourChart;
var searchBarChart;

var foundSpicyWords = [];

// document.addEventListener('DOMContentLoaded', () => {
    // global_messages = JSON.parse(localStorage.getItem("global_messages"))
    // if (global_messages)
    //     updateAll();
// })

// slider
$(function () {
    $("#slider-range").slider({
        range: true,
        min: new Date('2019.10.01').getTime() / 1000,
        max: new Date('2025.03.01').getTime() / 1000,
        step: 86400,
        values: [new Date('2019.10.01').getTime() / 1000, new Date('2025.03.01').getTime() / 1000],
        slide: function (event, ui) {
            $("#amount").val((new Date(ui.values[0] * 1000).toDateString()) + " - " + (new Date(ui.values[1] * 1000)).toDateString());
        },
        change: function(event, ui){
            updateAll();
        }
    });
    $("#amount").val((new Date($("#slider-range").slider("values", 0) * 1000).toDateString()) +
        " - " + (new Date($("#slider-range").slider("values", 1) * 1000)).toDateString());
});


document.getElementById("chatFile").addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            parseChat(text);
        };
        reader.readAsText(file);
    }
});

function parseChat(text) {
    // remove new lines without date and time
    text = text.replace(/(\n)(?!\d{1,2}\/\d{1,2}\/\d{1,2}, \d{1,2}:\d{1,2} -)/g, ' ');

    const messages = text.split("\n").filter(line => line.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/));
    $('#slider-range').slider( "option", "min", new Date(messages[0].split('-')[0]).getTime()/1000);

    // DEBUG
    // for (let i = 0; i < 2; i++) {
    //     console.log(messages[i]);
    // }
    
    // order messages with {date, author, message}
    global_messages = messages.map(message => {
        let split_message = message.split('-') 
        let split_author = split_message[1].split(':')
        if (split_author.length < 2) {
            author = 'Whatsapp';
            split_author[1] = split_author[0];
        }
        return {
            "date": new Date(split_message[0]), 
            "author": split_author[0].trim(),
            "message": split_author[1].trim()
        }
    })
    // console.log(JSON.stringify(global_messages))
    // localStorage.setItem("global_messages", JSON.stringify(global_messages))
    updateAll();
}

function updateAll() {
    const filtered_messages = global_messages.filter(message => (message['date'] >= $("#slider-range").slider("values", 0)*1000 && message['date'] <= $("#slider-range").slider("values", 1)*1000));
    global_filtered_messages = filtered_messages;

    // clear old tables
    const wordTable = document.getElementById("wordTable");
    wordTable.innerHTML = "";
    const rareWordTable = document.getElementById("rareWordTable");
    rareWordTable.innerHTML = "";

    const emojiTable = document.getElementById("emojiTable");
    emojiTable.innerHTML = "";
    const rareEmojiTable = document.getElementById("rareEmojiTable");
    rareEmojiTable.innerHTML = "";

    if (ahhhhBarChart) ahhhhBarChart.destroy();
    if (timelineChart) timelineChart.destroy();
    if (byDayChart) byDayChart.destroy();
    if (byHourChart) byHourChart.destroy();
    if (searchBarChart) searchBarChart.destroy();

    // DEBUG
    // for (let i = 0; i < 2; i++) {
    //     console.log(filtered_messages[i]);
    // }

    analyzeMessages(filtered_messages);
    generateChatTimeline(filtered_messages);
    generateByDayChart(filtered_messages);
    spicyAnalyzer(filtered_messages);
    generateByHourChart(filtered_messages);
    // analyzeActivityPatterns(filtered_messages);
    // extractFirstsAndMilestones(filtered_messages);
    // performSentimentAnalysis(filtered_messages);
    // analyzeWordAssociation(filtered_messages);
    // highlightSpecialDates(filtered_messages);
    // analyzeResponseTimes(filtered_messages);
}
var analytics = "QUl6YVN5Qj"+"RZVmhLeUNQN";

function analyzeMessages(messages) {
    if (messages.length === 0) return 0;

    // set total messages
    document.getElementById("totalMessages").innerText = messages.length;

    // find max streak!
    let maxStreak = 1, currentStreak = 1;
    
    let uniqueDates = [...new Set(messages.map(msg => msg.date.toDateString()))]
        .map(dateStr => new Date(dateStr))
        .sort((a, b) => a - b);
    for (let i = 1; i < uniqueDates.length; i++) {
        let prevDate = uniqueDates[i - 1];
        let currDate = uniqueDates[i];
        
        let diff = (currDate - prevDate) / (1000 * 60 * 60 * 24); // Difference in days
        
        if (diff === 1) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 1;
        }
    }
    
    document.getElementById('longestStreak').innerText = maxStreak;

    document.getElementById('imagesSent').innerText = messages.filter(message => message['message'].includes('<Media omitted>')).length;

    // word count, unique words, most frequent words, emoji
    let words = {};
    let emojiCounts = {};
    let totalWords = 0;
    messages.forEach(message => {
        message['message'].split(' ').forEach(word => {
            word = word.toLowerCase().replace(/[^a-zA-Z0-9äëöüï]/g, '');
            if (word) {
                totalWords++;
                words[word] = (words[word] || 0) + 1;
            }
        });

        const emojis = message['message'].match(/\p{RGI_Emoji}+/vg);
        // const emojis = message['message'].match(/\p{Emoji}+/gu);
        if (emojis) {
            emojis.forEach(emoji => {
                emojiCounts[emoji] = (emojiCounts[emoji] || 0) + 1;
            });
        }
    })
    global_words = words;

    document.getElementById("totalWords").innerText = totalWords;
    document.getElementById("uniqueWords").innerText = Object.keys(words).length;
    
    const sortedWords = Object
        .entries(words) // create Array of Arrays with [key, value]
        .sort(([, a],[, b]) => b-a) // sort by value, descending (b-a)
    // top 5 words
    const topWords = sortedWords
        .slice(0,30) // return only the first 5 elements of the intermediate result
        // .map(([n])=> n);
    const rareWords = sortedWords
        .slice(-20)

    const wordTable = document.getElementById("wordTable");
    const rareWordTable = document.getElementById("rareWordTable");
    for (let i = 0; i < topWords.length; i++) {
        const tableEntry = document.createElement("tr");
        tableEntry.innerHTML = `<td>${i+1}</td><td>${topWords[i][0]}</td><td>${topWords[i][1]}</td>`;
        wordTable.appendChild(tableEntry);
    }
    for (let i = rareWords.length-1; i >= 0; i--) {
        const tableEntry = document.createElement("tr");
        tableEntry.innerHTML = `<td>${rareWords.length-i}</td><td>${rareWords[i][0]}</td><td>${rareWords[i][1]}</td>`;
        rareWordTable.appendChild(tableEntry);
    }
    
    // const topEmoji = Object.keys(emojiCounts).reduce((a, b) => emojiCounts[a] > emojiCounts[b] ? a : b, "😊");
    // document.getElementById("topEmoji").innerText = topEmoji;
    const sortedEmojis = Object
        .entries(emojiCounts) // create Array of Arrays with [key, value]
        .sort(([, a],[, b]) => b-a) // sort by value, descending (b-a)
    const topEmojis = sortedEmojis
        .slice(0,30) // return only the first 5 elements of the intermediate result
        // .map(([n])=> n);
    const rareEmojis = sortedEmojis
        .slice(-20)

    const emojiTable = document.getElementById("emojiTable");
    const rareEmojiTable = document.getElementById("rareEmojiTable");
    for (let i = 0; i < topEmojis.length; i++) {
        const tableEntry = document.createElement("tr");
        tableEntry.innerHTML = `<td>${i+1}</td><td>${topEmojis[i][0]}</td><td>${topEmojis[i][1]}</td>`;
        emojiTable.appendChild(tableEntry);
    }
    for (let i = rareEmojis.length-1; i >= 0; i--) {
        const tableEntry = document.createElement("tr");
        tableEntry.innerHTML = `<td>${rareEmojis.length-i}</td><td>${rareEmojis[i][0]}</td><td>${rareEmojis[i][1]}</td>`;
        rareEmojiTable.appendChild(tableEntry);
    }

    ahhBarChart(words)
    // More analysis functions can be added here
}

analytics += "0pMWkQtNnRIR2ZJTm5"

function generateChatTimeline(messages) {
    var months;
    let d1 = messages[0].date;
    let d2 = messages[messages.length-1].date;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth();
    months += d2.getMonth();

    let numMonths = months <= 0 ? 0 : months

    let messageCounts = new Array(numMonths+1).fill(0);
    var labelValues = [];
    var dates = [];
    for (let i = 0; i < numMonths + 1; i++) {
        dates[i] = new Date(d1.getFullYear(), d1.getMonth() + i, 31)
        labelValues[i] = dates[i].toLocaleString('default', { month: 'long', year: 'numeric' });
    }

    messages.forEach(message => {
        let month = message['date'].getMonth() - d1.getMonth() + (12 * (message['date'].getFullYear() - d1.getFullYear()));
        messageCounts[month]++;
    });

    let data = {
        labels: labelValues,
        datasets: [{
            label: 'Activity by Months',
            data: messageCounts,
            backgroundColor: '#e63950',
            borderColor: 'white',
            borderWidth: 2,
        }]
        
    };

    // Configuration options for the chart
    let options = {
        color: 'white',
        scales: {
            y: {
                beginAtZero: true,
                ticks:{
                    color: 'white'
                }
            },
            x: {
                ticks:{
                    color: 'white'
                }
            }
        },
        
    };

    // Get the canvas element
    let ctx = document.getElementById('chatTimeline')
        .getContext('2d');

    // Create the bar chart
    timelineChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: options
    });
}

const searchWord = () => {
    if (searchBarChart) searchBarChart.destroy();
    const inputWord = document.getElementById("searchInput").value.toLowerCase();
    if (inputWord.trim() == '') return;

    const output = document.getElementById("searchResults");
    if (global_words[inputWord]) {
        output.innerText = `Word "${inputWord}" found ${global_words[inputWord]} times.`;
    } else {
        output.innerText = `Word "${inputWord}" never found.`;
    }

    inputWord.value = '';


    let numExtraLetters = 10;
    var labelValues = [];
    for (let i = 0; i < numExtraLetters; i++) {
        labelValues[i] = inputWord + inputWord.at(-1).repeat(i);
    }

    var dataValues = labelValues.map(label => global_words[label] || 0);

    let data = {
        labels: labelValues,
        datasets: [{
            label: 'Number of messages',
            data: dataValues,
            backgroundColor: '#e63950',
            borderColor: 'white',
            borderWidth: 2,
        }]
        
    };

    // Configuration options for the chart
    let options = {
        responsive: true,
        color: 'white',
        scales: {
            y: {
                beginAtZero: true,
                ticks:{
                    color: 'white'
                }
            },
            x: {
                ticks:{
                    color: 'white'
                }
            }
        },
        
    };

    // Get the canvas element
    document.getElementById('searchBarChart').style.display='block';
    let ctx = document.getElementById('searchBarChart')
        .getContext('2d');

    // Create the bar chart
    searchBarChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: options
    });
}
const searchFromEnter = event => {
    // console.log(event);
    if (event.key === 'Enter') {
        searchWord();
    }
}

analytics += "UVHM4UkQ4MDJj"
const ahhBarChart = words => {
    let numAhh = 15;
    var labelValues = [];
    for (let i = 0; i < numAhh; i++) {
        labelValues[i] = 'ah' + 'h'.repeat(i);
    }

    var dataValues = labelValues.map(label => words[label] || 0);

    let data = {
        labels: labelValues,
        datasets: [{
            label: 'Ahhhhs',
            data: dataValues,
            backgroundColor: '#e63950',
            borderColor: 'white',
            borderWidth: 2,
        }]
        
    };

    // Configuration options for the chart
    let options = {
        responsive: true,
        color: 'white',
        scales: {
            y: {
                beginAtZero: true,
                ticks:{
                    color: 'white'
                }
            },
            x: {
                ticks:{
                    color: 'white'
                }
            }
        },
        
    };

    // Get the canvas element
    let ctx = document.getElementById('ahBarChart')
        .getContext('2d');

    // Create the bar chart
    ahhhhBarChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: options
    });
}

function generateByDayChart(messages) {
    let labelValues = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    let dataValues = [0,0,0,0,0,0,0]
    messages.forEach(message => {
        dataValues[message['date'].getDay()]++;
    }); 

    var config = {
        type: 'pie',
        data: {
            datasets: [{
                data: dataValues,
                backgroundColor: [
                  "#b51a3a",
                  "#e24767",
                  "#a3182b",
                  "#e63950",
                  "#ff758c",
                  "#ff7eb3",
                  "#e48397",
                //   "#F7464A",
                //   "#FDB45C",
                //   "#46BFBD",
                //   "#00b36b",
                //   "#4D5360",
                //   "#949FB1",
                //   "#7f5df0",
                ],
                label: 'Messages'
            }],
            labels: labelValues
        },
        options: {
            color:'white',
            responsive: true,
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Chart.js Doughnut Chart'
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    };
    
    var ctx = document.getElementById('byDayChart').getContext('2d');
    byDayChart = new Chart(ctx, config);
}


function spicyAnalyzer(messages) {
    const spicyTable = document.getElementById("spicyTable");
    spicyTable.innerHTML = "";

    let spicyWords = ['YW5hbA==','YW51cw==','YXNz','YXNzaG9sZQ==','ZXJvdGlj','aGFyZA==','YmFsbA==','Z2Fn','bmFrZWQ=','cm9wZQ==','YmRzbQ==','YmVhc3RpYWxpdHk=','YmVzdGlhbGl0eQ==','YnJlYXN0cw==','dGl0dGllcw==','dGl0cw==','Yml0Y2g=','Yml0Y2hlcw==','Ymxvd2pvYg==','Ym9uZGFnZQ==','Ym9uZXI=','Ym9vYg==','Ym9vYnM=','Ym9vdHk=','YnV0dA==','YnV0dGNoZWVrcw==','Y2xpdA==','Y2xpdG9yaXM=','Y29jaw==','Y29ja3M=','Y29pdHVz','Y3JlYW1waWU=','Y3Vt','Y3VtbWluZw==','ZGVlcHRocm9hdA==','ZGljaw==','ZGlsZG8=','ZG9nZ2llc3R5bGU=','ZG9nZ3lzdHlsZQ==','ZG9taW5hdGlvbg==','ZG9taW5hdHJpeA==','ZG9taW5hdGVk','ZWphY3VsYXRpb24=','ZXJvdGlj','ZmluZ2Vy','ZmluZ2VyaW5n','ZnVjaw==','ZnVja2lu','ZnVja2luZw==','Z2VuaXRhbHM=','Z3JvcGU=','aGFuZGpvYg==','aG9ybnk=','aG90','aHVtcGluZw==','aW50ZXJjb3Vyc2U=','aml6eg==','a2lua3N0ZXI=','a2lua3k=','bG92ZW1ha2luZw==','bWFzdHVyYmF0ZQ==','bWFzdHVyYmF0aW5n','bWFzdHVyYmF0aW9u','bWlsZg==','bW90aGVyZnVja2Vy','bmlwcGxl','bmlwcGxlcw==','bnVkZQ==','bnVkaXR5','bnV0dGVu','bnV0dGluZw==','b3JnYXNt','b3JneQ==','cGFudGllcw==','cGFudHk=','cGVkb3BoaWxl','cGVnZ2luZw==','cGVuaXM=','cGVuZXRyYXRlZA==','cHViZXM=','cHViaWM=','cHVzc3k=','Y293Z2lybA==','c2NobG9uZw==','c2VtZW4=','c2V4','c2V4bw==','c2V4eQ==','c2V4dWFs','c2V4dWFsbHk=','c2V4dWFsaXR5','c2x1dA==','c211dA==','c3B1bms=','c3RyYXBvbg==','c3Vjaw==','c3dhbGxvdw==','dGhyZWVzb21l','c3RyaXA=','dGl0','dGl0cw==','dGl0dGllcw==','dGl0dHk=','dG9wbGVzcw==','dW5kcmVzc2luZw==','dmFnaW5h','dmlhZ3Jh','dmlicmF0b3I=','dnVsdmE=','d2V0ZHJlYW0=','d2V0bmVzcw==','d2hvcmU='];
    spicyWords = spicyWords.map(word => atob(word));

    let foundWords = [];
    let cnt = 0;
    for (let i = 0; i < spicyWords.length; i++) {
        if (!global_words[spicyWords[i]]) continue;

        foundWords.push([spicyWords[i], global_words[spicyWords[i]]]);
        cnt++;
    }

    foundWords = foundWords.sort((a, b) => b[1] - a[1]);
    foundSpicyWords = foundWords;

    for (let i = 0; i < cnt; i++) {
        const tableEntry = document.createElement("tr");
        tableEntry.innerHTML = `<td>${i+1}</td><td>${foundWords[i][0]}</td><td>${foundWords[i][1]}</td>`;
        spicyTable.appendChild(tableEntry);
    }
}

function generateByHourChart(messages) {
    let labelValues = ['12 am','1 am', '2 am','3 am','4 am','5 am','6 am','7 am','8 am','9 am','10 am','11 am','12 pm','1 pm','2 pm','3 pm','4 pm','5 pm','6 pm','7 pm','8 pm','9 pm','10 pm','11 pm']
    
    let dataValues = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    messages.forEach(message => {
        dataValues[message['date'].getHours()]++;
    }); 

    let data = {
        labels: labelValues,
        datasets: [{
            label: 'Activity by Day',
            data: dataValues,
            backgroundColor: '#e63950',
            borderColor: 'white',
            borderWidth: 2,
        }]
        
    };

    // Configuration options for the chart
    let options = {
        color: 'white',
        scales: {
            y: {
                beginAtZero: true,
                ticks:{
                    color: 'white'
                }
            },
            x: {
                ticks:{
                    color: 'white'
                }
            }
        },
        
    };

    // Get the canvas element
    let ctx = document.getElementById('byHourChart')
        .getContext('2d');

    // Create the bar chart
    byHourChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: options
    });

}

function getRandomWord() {
    let words = Object.entries(global_words);
    document.getElementById('randomWordText').innerText = words[Math.floor(Math.random() * words.length)][0];
}

function getRandomMessage() {
    let message = global_filtered_messages[Math.floor(Math.random() * global_filtered_messages.length)];
    document.getElementById('randomMessageText').innerText = `${message['message']} - ${message['author']}, ${message['date'].toDateString()}`;
}

function getWholesome() {
    let phrases = ['I love you', 'You are the best', 'You are so cute', 'I miss you', 'You are my sunshine', 'I miss you so muchhh', 'You are so beautiful', 'You are so smart', 'You are so funny', 'You are so kind', 'You are so sweet', 'You are so amazing', 'You are so perfect', 'I can\'t wait to see you again', 'You are so special', 'You are so unique', 'You are so talented', 'You are so strong', 'You are so brave', 'You are so loved', 'You are so appreciated'];
    document.getElementById('wholesomeText').innerText = phrases[Math.floor(Math.random() * phrases.length)];
}

function getSpicy() {
    let chosenWord = foundSpicyWords[Math.floor(Math.random() * foundSpicyWords.length)][0];
    document.getElementById('spicyWord').innerText = chosenWord;
    
    let foundPhrases = global_filtered_messages.filter(message => message['message'].includes(chosenWord))
    let chosenPhrase = foundPhrases[Math.floor(Math.random() * foundPhrases.length)];
    document.getElementById('spicyText').innerText = `${chosenPhrase['message']} - ${chosenPhrase['author']}, ${chosenPhrase['date'].toDateString()}`;
}

function findMessagesByDay() {
    var inputDate = new Date(document.getElementById("datePicker").value);
    inputDate.setDate(inputDate.getDate() + 1);
    const messagesContainer = document.getElementById("messagesContainer");

    messagesContainer.innerHTML = global_filtered_messages.filter(message => message['date'].toDateString() === inputDate.toDateString()).reduce((acc, message) => acc + `<p>${message['author']}: ${message['message']}</p>`, '');
}



const downloadWords = () => {
    const a = document.getElementById('download_words')

    const sortedWords = Object
        .entries(global_words) // create Array of Arrays with [key, value]
        .sort(([, a],[, b]) => b-a)
    
    var content = "Word,Count\n";
    for (let i = 0; i < sortedWords.length; i++) {
        content += `${sortedWords[i][0]},${sortedWords[i][1]}\n`;
    }
    var file = new Blob([content], { type: 'text/plain' });
    a.href = URL.createObjectURL(file);
    a.click();
}

async function createWithAI() {
    const userQuery = document.getElementById('generateText').value;
    if (!userQuery) {
        alert('Please enter a description of the analysis you want to see.');
        return;
    }

    const generatedCode = await getGeneratedCodeFromGemini(userQuery);

    if (generatedCode && generatedCode.html && generatedCode.js) {
        const outputDiv = document.getElementById('ai-sections');
        const id = 'genSection-' + Date.now();
        const genSection = document.createElement('section');
        genSection.id = id;
        genSection.innerHTML = `${generatedCode.html}<button class="removeSections" onclick="removeSection('${id}')">Remove</button>`
        outputDiv.appendChild(genSection);
        
        // Execute the generated JavaScript code
        try {
            const script = new Function(generatedCode.js);
            script();
        } catch (error) {
            console.error("Error executing generated JavaScript:", error);
            alert("There was an error running the analysis. Please check the console for more details.");
        }
    }
}
async function getGeneratedCodeFromGemini(query) {
    // IMPORTANT: Replace with your actual Gemini API key
    const apiKey = 'Yeah, right--nice try';
    const model = 'gemini-2.0-flash'; // or 'gemini-1.5-pro' for the pro model
    // const model = 'gemini-pro';

    /*Use Chart.js for Visualizations: The application uses Chart.js. A chart is not needed in every response--only use it when it needs to be used or would enhance the analysis.

    You can create new charts: new Chart(ctx, { type: 'bar', ... }). You can use 'bar', 'pie', 'doughnut', 'line', 'radar', etc.
    CRITICAL: When you create a chart, you MUST manage its lifecycle to prevent errors. Declare its variable with let (e.g., let myNewChart;). Before creating the chart with new Chart(...), you MUST check if the variable already holds an instance and destroy it.
    Correct Pattern: if (myNewChart) { myNewChart.destroy(); } myNewChart = new Chart(...)
    Give your chart's <canvas> element a unique and descriptive id.*/

    const prompt = `You are an expert-level JavaScript and HTML developer. Your task is to create new, self-contained analytical sections for a web application that visualizes WhatsApp chat data.
Your entire output MUST be a single, clean JSON object with two keys: "html" and "js". Do not include any explanatory text before or after the JSON object.

CONTEXT OF THE APPLICATION

The JavaScript you write will execute in an environment where the following global variables are already defined and populated. You MUST use these variables for all your data analysis.

global_filtered_messages: An array of message objects. Each object has the structure: { date: Date, author: 'string', message: 'string' }.
global_words: A JavaScript object mapping lowercase words to their frequency counts (e.g., {'love': 50, 'you': 100}).
foundSpicyWords: An array of ['word', count] pairs for specific "spicy" words, sorted by count.

CORE REQUIREMENTS & RULES

Use Chart.js for Visualizations: The application uses Chart.js. A chart is not needed in every response--only use it when it needs to be used or would enhance the analysis.
You can create new charts: new Chart(ctx, { type: 'bar', ... }). You can use 'bar', 'pie', 'doughnut', 'line', 'radar', etc.
If you create a chart, give your chart's <canvas> element a unique and descriptive id. As well, always put a <div> around the <canvas> (e.g., <div><canvas id="myChart"></canvas></div>).
For charts, the color scheme of the application is vibrant, dominated by shades of pink and red, with a central, heart-like form. '#e63950' for the main color, 'white' for text, and '#ff758c' for accents.

Code Must Be Self-Contained:

All your functions, event listeners, and logic must be within the "js" string.
Do not call any pre-existing functions from the main application.
All HTML must be within the "html" string. Use unique and descriptive IDs for all new HTML elements (<button>, <p>, <canvas>, etc.) to avoid conflicts.
Add event listeners inside your JS string (e.g., document.getElementById('myButton').addEventListener('click', myFunction);). Do not use inline onclick attributes in the HTML string.
Be Creative and Comprehensive: The user could ask for anything. Here are some ideas to guide you. You can combine them, expand on them, or create something entirely new and relevant.

Frequency & Ranking Analysis:

"Show me the top 10 most used words in a horizontal bar chart."
"A pie chart of who sends more messages, author1 or author2."
"A chart comparing the usage of 'lol' vs 'haha'."
Time-Based Analysis:

"A line chart showing our total messages per month over the whole year."
"A radar chart showing which days of the week are most active."
"An 'On This Day' feature: show messages from today's date in previous years."
"A bar chart of messages sent per year."
Content & User-Specific Analysis:

"Find all messages that are exactly 5 words long."
"Create a search bar to find and display all messages from a specific author."
"Count how many messages contain a question mark '?' vs an exclamation mark '!'."
"A chart of who uses more 'spicy' words."
Interactive Gadgets:

"A 'Wholesome Message' button that shows a random message containing the word 'love', 'cute', or 'miss you'."
"An input where I can type a word, and it shows me a bar chart of how many times each author used that word."
"A 'Message Time Machine' that shows a random message from a user-selected date from a date picker."

EXAMPLE REQUEST: "a section where I can get a random wholesome message"
EXAMPLE OUTPUT:

JSON

{
"html": "<h2>Random Message</h2><button id="randomMessageButton" onclick="getRandomMessage()">Generate</button><p id="randomMessageText"></p>",
"js": "function getRandomMessage() {let message = global_filtered_messages[Math.floor(Math.random() * global_filtered_messages.length)];document.getElementById('randomMessageText').innerText = \`\${message['message']} - \${message['author']}, \${message['date'].toDateString()}\`;}"
}

The user query is: ${query}`

    // const prompt = `
    //     You are a helpful assistant for a web application that analyzes WhatsApp chat data.
    //     The application has a global array called 'global_filtered_messages' which contains message objects.
    //     Each message object has the following structure: { date: Date, author: string, message: string }.

    //     A user wants to perform an analysis on the chat data. Their query is: "${query}"

    //     Based on this query, generate the necessary HTML and JavaScript code to display the analysis.
    //     The generated code should be a self-contained unit that can be injected into a div element.
    //     The generated JavaScript code should use the 'global_filtered_messages' array.

    //     For example, if the user query is "a section where I can get messages from a random day", you should generate something like this:

    //     {
    //         "html": "<section id=\\"randomWord\\"><h2>Random Message</h2><button id=\\"randomMessageButton\\" onclick=\\"getRandomMessage()\\">Generate</button><p id=\\"randomMessageText\\"></p></section>",
    //         "js": "function getRandomMessage() { let message = global_filtered_messages[Math.floor(Math.random() * global_filtered_messages.length)]; document.getElementById('randomMessageText').innerText = \`\${message['message']} - \${message['author']}, \${message['date'].toDateString()}\`; }"
    //     }


    //     Now, please generate the HTML and JavaScript for the user's query.
    //     Return the response as a JSON object with 'html' and 'js' keys.
    //     `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${atob(analytics)||apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "contents": [{
                    "parts": [{
                        "text": prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;
        
        // Extract the JSON part from the response
        const jsonMatch = generatedText.match(/{[^]*}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        } else {
            throw new Error("Invalid JSON response from the API.");
        }


    } catch (error) {
        console.error('Error calling Gemini API:', error);
        alert('An error occurred while communicating with the AI. Please check the console for details.');
        return null;
    }
}

const removeSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
        section.remove();
    }
}
