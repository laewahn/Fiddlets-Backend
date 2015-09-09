var fs = require("fs");

function readWeatherInfoFromFile(filepath) {
    var sampleWeatherDataRaw = fs.readFileSync(filepath, "utf8");
    var sampleWeatherData = JSON.parse(sampleWeatherDataRaw);
    
    return sampleWeatherData;
}

console.log("Todays weather:");

var weatherJSON = readWeatherInfoFromFile("./sampleWeatherData.json");

function buildWeatherInfoCSVLine(weather) {
	var localeTimeString = new Date(weather.dt_txt).toLocaleTimeString();
    return localeTimeString + "," + weather.main.temp + "ºC," + weather.weather[0].description + "\n";
}

console.log(JSON.stringify(weatherJSON));
var weatherInfoCSV = weatherJSON.list.map(buildWeatherInfoCSVLine);
var csvHeader = "time,temperature,description\n";

weatherInfoCSV.splice(0,1,csvHeader);

console.log(weatherInfoCSV.join(""));
