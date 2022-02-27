const fs = require('fs');
const http = require('http');
const https = require('https');

const credentials = require("./auth/credentials.json");

const port = 3000;

const server = http.createServer();
server.on("request",connection_handler);
server.on("listening", listen_handler);
server.listen(port);

function listen_handler(){
	console.log(`Now Listening on Port ${port}`);
}
function connection_handler(req, res){
    console.log("REQ URL ===> "+req.url);
    if(req.url === "/"){
        const form = fs.createReadStream("html/index.html");
		res.writeHead(200, {"Content-Type": "text/html"})
		form.pipe(res);
    }
    else if(req.url.startsWith("/search")){
        const user_input = new URL(req.url, `https://${req.headers.host}`).searchParams;
        console.log("USER INPUT ===> "+user_input);
        const ip = user_input.get('word');
        const regex = /^[a-zA-Z]+$/;
        if(ip == null || ip == "" || ip.match(regex)){
            res.writeHead(404, {"Content-Type": "text/html"});
            res.end('<body style = "background-color: rgb(206, 223, 176)";><h1 style= "text-align: center; color: red; margin-top:300px">No Input/Incorrect format</h1></body>');        
        }
        else{
            console.log("IPGEO API has been called");
            const IPGEO_api_endpoint = `https://api.techniknews.net/ipgeo/${ip}`;
            const IPGEO_api_request = https.request(IPGEO_api_endpoint, {method:"GET"});
            IPGEO_api_request.on("response" , IPGEO_res => process_stream(IPGEO_res, parse_results_for_IPGEO, res, ip));
            IPGEO_api_request.end();
        }
    }
    else{
        res.writeHead(404, {"Content-Type": "text/html"});
        res.end('<body style = "background-color: rgb(206, 223, 176)";><h1 style= "text-align: center; color: red; margin-top:300px">Not Found/Incorrect format</h1></body>');    
    }
}

function process_stream (stream, callback , ...args){
	let body = "";
	stream.on("data", chunk => body += chunk);
	stream.on("end", () => callback(body, ...args));
}

function parse_results_for_IPGEO(data, res){
    let result = '<body style = "background-color: rgb(206, 223, 176)";><h1 style= "text-align: center; color: red; margin-top:300px">No Results Found</h1></body>';
    if(data != "error"){
        const findRegion = JSON.parse(data);
        console.log("REGION FOUND ===> " + findRegion.regionName);
        if(findRegion.status === "success"){
        console.log("Weather API has been called");
        const weather_api_endpoint = `https://api.openweathermap.org/data/2.5/weather?q=${findRegion.regionName}&appid=${credentials['Authorization-Key']}`;
        const weather_api_request = https.request(weather_api_endpoint, {method:"GET", headers:credentials});
        weather_api_request.on("response", weather_res => process_stream(weather_res, parse_results_for_weather, res, findRegion.regionName));
        weather_api_request.end();
        }

    }
    else{
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end(result);
    }
}
function parse_results_for_weather(data, res, region){
    let result = '<body style = "background-color: rgb(206, 223, 176)";><h1 style= "text-align: center; color: red; margin-top:300px">No Results Found</h1></body>';
    if(data.cod != "404"){
        const findtemp = JSON.parse(data);
      //console.log(findtemp);
        let Temp = findtemp.main.temp;
        Temp = (Temp - 273.15) * (9/5) + 32;
        Temp = parseInt(Temp, 10);
        console.log("TEMP FOUND ===> "+Temp);
        result = `<body style = "background-color: rgb(206, 223, 176)";>
        <h1 style = "text-align: center; color: black; margin-top: 300px;">${region}</h1>
        <h2 style = "text-align: center; color: black;">${Temp}&deg; F</h2>
        <h3 style = "text-align: center; color: black;">${findtemp.weather[0].description}</h3></body>`;
    }
    res.writeHead(200, {"Content-Type": "text/html"});
	res.end(result);
}

