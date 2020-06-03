const express = require('express');
const {google} = require('googleapis');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const youtubedl = require('youtube-dl')
const fs = require('fs')

const youtube = google.youtube({
    version: 'v3',
    auth: 'AIzaSyAii9qYx7RL2usUG4vBvgjlEnRXcNMGVmk'
});

const app = express();

app.use(express.json());

app.get('/list', (req, res) => {
    youtube.search.list({
        part: 'snippet',
        q: 'smcodes',
        type: 'video'
    }, (err, data) => {
        if (err) return res.json(err);
        let fullUrl = req.protocol + '://' + req.get('host');

        let listVideos = data.data.items.map((item) => {
            let url = `https://www.youtube.com/watch?v=${item.id.videoId}`;
            let urlDown = `${fullUrl}/download?id=${item.id.videoId}`;
            return {
                video: {
                    name: item.snippet.title,
                    link: url,
                    download: urlDown
                },
                channel: {
                    name: item.snippet.channelTitle,
                    link: `https://www.youtube.com/channel/${item.snippet.channelId}`
                }
            }
        });

        return res.json(listVideos);
    });
});

app.get('/download', (req, res) => {
    const id = req.query.id;
    
    let url = `https://www.youtube.com/watch?v=${id}`;
    var stream = ytdl(url); //include youtbedl ... var youtubedl = require('ytdl');

    //set response headers
    res.setHeader('Content-disposition', 'attachment; filename=' + id + '.mp3');
    res.setHeader('Content-type', 'audio/mpeg');

    var saveLocation = './save/' + id + '.mp3';
    const video = youtubedl(url,
    // Optional arguments passed to youtube-dl.
    ['--format=18'],
    // Additional options can be given for calling `child_process.execFile()`.
    { cwd: __dirname })
   
    video.pipe(fs.createWriteStream(`./save/${id}.mp4`))

    video.on('end', function() {
        let proc = new ffmpeg({
            source: `./save/${id}.mp4` //using 'stream' does not work
        });

        proc.withAudioCodec('libmp3lame')
            .toFormat('mp3')
            .saveToFile(saveLocation, function(stdout, stderr) {
                console.log('file has been converted succesfully');
            })
            .output(res)
            .run();
    })
});

app.listen(3333, () => {
    console.log('Servidor http rodando na porta 3333');
});