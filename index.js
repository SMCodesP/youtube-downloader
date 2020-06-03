const express = require('express');
const {google} = require('googleapis');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const youtubedl = require('youtube-dl');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API
});

const app = express();

app.use('/musics', express.static(path.resolve(__dirname, 'save')));

app.use(express.json());

app.get('/list/:search', (req, res) => {
    const search = req.params.search;
    youtube.search.list({
        part: 'snippet',
        q: search,
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
    let fullUrl = req.protocol + '://' + req.get('host');
    
    let url = `https://www.youtube.com/watch?v=${id}`;
    
    let saveLocation = path.resolve(__dirname, 'save', `${id}.mp3`);
    
    fs.access(saveLocation, fs.constants.F_OK, (err) => {
        if (err) {
            const video = youtubedl(url,
                // Optional arguments passed to youtube-dl.
                ['--format=18'],
                // Additional options can be given for calling `child_process.execFile()`.
                { cwd: __dirname })
                
                let playMp4 = path.resolve(__dirname, 'save', `${id}.mp4`);
                
                video.pipe(fs.createWriteStream(playMp4));
                
                video.on('end', () => {
                    let proc = new ffmpeg({
                        source: playMp4 //using 'stream' does not work
                    })
                    .withAudioCodec('libmp3lame')
                    .toFormat('mp3')
                    .saveToFile(saveLocation);

                    proc.on('end', () => {
                        fs.unlinkSync(playMp4);
                        console.log('file has been converted successfully');
                        console.log(proc)
                        return res.json({
                            status: 'ok',
                            link: `${fullUrl}/musics/${id}.mp3`
                        })
                    })
                })
            } else {
                return res.json({
                    status: 'ok',
                    link: `${fullUrl}/musics/${id}.mp3`
                })
            }
        });
        return;
        
    });
    
    app.listen(process.env.PORT || 3333, () => {
        console.log(`Servidor http rodando na porta ${process.env.PORT || 3333}`);
    });
